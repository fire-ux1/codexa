import asyncio
from datetime import datetime
import json
import logging
import time
import uuid
from fastapi import WebSocket
from services.redis_service import get_redis
from settings import get_settings

# Configure structured logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("websocket_manager")

settings = get_settings()

MAX_CONNECTIONS_PER_PROJECT = 100


class ConnectionManager:
    def __init__(self):
        # Maps project_id -> list of WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}
        # Maps websocket -> last seen timestamp for heartbeats
        self.last_seen: dict[WebSocket, float] = {}
        # Maps project_id -> Redis Pub/Sub subscription Task
        self.listeners: dict[str, asyncio.Task] = {}
        # Maps websocket -> heartbeat loop Task
        self.heartbeat_tasks: dict[WebSocket, asyncio.Task] = {}

        # Metrics registry
        self.metrics = {
            "messages_broadcast": 0,
            "failed_sends": 0,
            "reconnect_count": 0,
        }

    def get_metrics(self) -> dict:
        """Returns snapshot of active connections and metrics."""
        return {
            "active_connections": sum(
                len(conns) for conns in self.active_connections.values()
            ),
            "active_projects": len(self.active_connections),
            "redis_listeners": len(
                [t for t in self.listeners.values() if not t.done()]
            ),
            "messages_broadcast": self.metrics["messages_broadcast"],
            "failed_sends": self.metrics["failed_sends"],
            "reconnect_count": self.metrics["reconnect_count"],
        }

    async def connect(self, websocket: WebSocket, project_id: str):
        # 1. Limit Maximum Connections Per Project
        current_conns = len(self.active_connections.get(project_id, []))
        if current_conns >= MAX_CONNECTIONS_PER_PROJECT:
            logger.warning(
                f"event=websocket_connection_rejected reason=max_limit project_id={project_id} limit={MAX_CONNECTIONS_PER_PROJECT}"
            )
            await websocket.accept()
            await websocket.send_json(
                {"error": "Max connection limit reached for this project."}
            )
            await websocket.close(code=4003)
            return

        await websocket.accept()
        self.metrics["reconnect_count"] += 1

        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        self.last_seen[websocket] = time.time()

        logger.info(
            f"event=websocket_connected project_id={project_id} connection_count={len(self.active_connections[project_id])}"
        )

        # Start heartbeat loop for this connection
        self.heartbeat_tasks[websocket] = asyncio.create_task(
            self.heartbeat_loop(websocket, project_id)
        )

        # Start Redis Pub/Sub listener if not already running for this project
        if project_id not in self.listeners or self.listeners[project_id].done():
            self.listeners[project_id] = asyncio.create_task(
                self.redis_pubsub_listener(project_id)
            )
            logger.info(f"event=redis_listener_started project_id={project_id}")

        # Emit presence user_joined event to Redis Pub/Sub
        try:
            from services.event_bus import publish_event

            total_users = len(self.active_connections[project_id])
            publish_event(project_id, "user_joined", {"user_count": total_users})
        except Exception as e:
            logger.error(f"event=presence_broadcast_failed action=joined error={e}")

    async def disconnect(self, websocket: WebSocket, project_id: str):
        # Remove from active connections
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
                # Cleanup idle Redis listener
                if project_id in self.listeners:
                    self.listeners[project_id].cancel()
                    del self.listeners[project_id]
                    logger.info(f"event=redis_listener_cleaned project_id={project_id}")

        # Cleanup heartbeat task
        if websocket in self.heartbeat_tasks:
            self.heartbeat_tasks[websocket].cancel()
            del self.heartbeat_tasks[websocket]

        if websocket in self.last_seen:
            del self.last_seen[websocket]

        try:
            await websocket.close()
        except Exception:
            pass

        logger.info(
            f"event=websocket_disconnected project_id={project_id} connection_count={len(self.active_connections.get(project_id, []))}"
        )

        # Emit presence user_left event to Redis Pub/Sub
        try:
            from services.event_bus import publish_event

            total_users = len(self.active_connections.get(project_id, []))
            publish_event(project_id, "user_left", {"user_count": total_users})
        except Exception as e:
            logger.error(f"event=presence_broadcast_failed action=left error={e}")

    async def heartbeat_loop(self, websocket: WebSocket, project_id: str):
        try:
            interval = settings.ws_heartbeat_interval
            timeout = settings.ws_timeout
            while True:
                await asyncio.sleep(interval)
                # Send ping
                try:
                    await websocket.send_json(
                        {
                            "id": f"evt_{uuid.uuid4().hex[:8]}",
                            "version": 1,
                            "type": "ping",
                            "project_id": project_id,
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "payload": {},
                        }
                    )
                except Exception:
                    logger.warning(
                        f"event=websocket_ping_failed project_id={project_id}"
                    )
                    await self.disconnect(websocket, project_id)
                    break

                # Check if client is responsive
                last_active = self.last_seen.get(websocket, 0)
                if time.time() - last_active > timeout:
                    logger.warning(
                        f"event=websocket_heartbeat_timeout project_id={project_id} elapsed={time.time() - last_active}"
                    )
                    await self.disconnect(websocket, project_id)
                    break
        except asyncio.CancelledError:
            pass

    def record_pong(self, websocket: WebSocket):
        self.last_seen[websocket] = time.time()

    async def broadcast_to_project(self, message: dict, project_id: str):
        """Broadcasts event payload to all clients connected to a project, isolating errors."""
        if project_id not in self.active_connections:
            return

        sockets = list(self.active_connections[project_id])
        for ws in sockets:
            try:
                await ws.send_json(message)
                self.metrics["messages_broadcast"] += 1
            except Exception as e:
                self.metrics["failed_sends"] += 1
                logger.error(
                    f"event=websocket_broadcast_failed project_id={project_id} error={e}"
                )
                await self.disconnect(ws, project_id)

    async def redis_pubsub_listener(self, project_id: str):
        """Subscribes to Redis Pub/Sub for a specific project and broadcasts incoming messages."""
        try:
            client = get_redis()
            if client is None:
                logger.error(
                    f"event=redis_unavailable action=listener_exit project_id={project_id}"
                )
                return

            pubsub = client.pubsub()
            channel = f"project_events:{project_id}"
            pubsub.subscribe(channel)

            while True:
                # Non-blocking pull check
                message = pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=0.5
                )
                if message and message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await self.broadcast_to_project(data, project_id)
                    except Exception as err:
                        logger.error(f"event=redis_message_parse_failed error={err}")

                await asyncio.sleep(0.05)

        except asyncio.CancelledError:
            logger.info(f"event=redis_listener_cancelled project_id={project_id}")
        except Exception as e:
            logger.error(
                f"event=redis_listener_error project_id={project_id} error={e}"
            )

    async def shutdown(self):
        """Gracefully closes all active connections and cancels background tasks."""
        logger.info("event=websocket_shutdown_started")

        # 1. Cancel all Redis listeners
        for project_id, task in list(self.listeners.items()):
            task.cancel()
        self.listeners.clear()

        # 2. Cancel all heartbeat loops
        for ws, task in list(self.heartbeat_tasks.items()):
            task.cancel()
        self.heartbeat_tasks.clear()

        # 3. Close all active sockets
        for project_id, sockets in list(self.active_connections.items()):
            for ws in list(sockets):
                try:
                    await ws.close(code=1001, reason="Server shutting down")
                except Exception:
                    pass
        self.active_connections.clear()
        self.last_seen.clear()
        logger.info("event=websocket_shutdown_complete")


manager = ConnectionManager()
