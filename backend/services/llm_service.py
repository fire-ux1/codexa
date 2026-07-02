import hashlib
import sqlite3
import requests
import json
import time

from settings import get_settings
from services.observability_service import log_event

settings = get_settings()
DB_PATH = "codepilot.db"


def generate_answer(prompt: str):
    if not settings.llm_api_key:
        raise ValueError(
            "LLM_API_KEY is not set. Add your OpenRouter API key to backend/.env."
        )

    start_time = time.time()
    prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

    # Read from Cache
    try:
        conn = sqlite3.connect(DB_PATH, timeout=15)
        cursor = conn.cursor()
        cursor.execute("SELECT response FROM llm_cache WHERE prompt_hash = ?", (prompt_hash,))
        row = cursor.fetchone()
        if row:
            conn.close()
            # Log cache hit
            log_event("cache_hit")
            latency = time.time() - start_time
            log_event("ai_answer", latency=latency, success=True, token_count=len(row[0].split()))
            return row[0]
    except Exception as e:
        print(f"[LLM Cache] Read error: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    # Call API
    log_event("cache_miss")
    try:
        response = requests.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": settings.llm_site_url,
                "X-Title": settings.llm_app_name,
            },
            json={
                "model": settings.llm_model,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=120,
        )
        response.raise_for_status()
        data = response.json()
        answer = data["choices"][0]["message"]["content"]

        # Write to Cache
        try:
            conn = sqlite3.connect(DB_PATH, timeout=15)
            cursor = conn.cursor()
            cursor.execute("INSERT OR REPLACE INTO llm_cache (prompt_hash, response) VALUES (?, ?)", (prompt_hash, answer))
            conn.commit()
        except Exception as e:
            print(f"[LLM Cache] Write error: {e}")
        finally:
            try:
                conn.close()
            except Exception:
                pass

        latency = time.time() - start_time
        log_event("ai_answer", latency=latency, success=True, token_count=len(answer.split()))
        return answer
    except Exception as api_err:
        latency = time.time() - start_time
        log_event("ai_answer", latency=latency, success=False, error_message=str(api_err))
        raise api_err


def generate_answer_stream(prompt: str):
    if not settings.llm_api_key:
        raise ValueError(
            "LLM_API_KEY is not set. Add your OpenRouter API key to backend/.env."
        )

    start_time = time.time()
    prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

    # Read from Cache
    cached_response = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=15)
        cursor = conn.cursor()
        cursor.execute("SELECT response FROM llm_cache WHERE prompt_hash = ?", (prompt_hash,))
        row = cursor.fetchone()
        if row:
            cached_response = row[0]
    except Exception as e:
        print(f"[LLM Cache] Read error: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    if cached_response:
        log_event("cache_hit")
        # Yield word-by-word to simulate dynamic streaming of cache hits
        words = cached_response.split(" ")
        for i, word in enumerate(words):
            yield (word + " " if i < len(words) - 1 else word)
            time.sleep(0.01)  # small pause for smooth stream
        
        latency = time.time() - start_time
        log_event("ai_answer", latency=latency, success=True, token_count=len(cached_response.split()))
        return

    # Call API & Stream
    log_event("cache_miss")
    try:
        response = requests.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": settings.llm_site_url,
                "X-Title": settings.llm_app_name,
            },
            json={
                "model": settings.llm_model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True,
            },
            stream=True,
            timeout=120,
        )
        response.raise_for_status()

        accumulated = ""
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode("utf-8").strip()
                if decoded_line.startswith("data: "):
                    data_str = decoded_line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        delta = data["choices"][0]["delta"]
                        if "content" in delta:
                            content_piece = delta["content"]
                            accumulated += content_piece
                            yield content_piece
                    except Exception:
                        pass

        # Save complete answer to cache
        if accumulated:
            try:
                conn = sqlite3.connect(DB_PATH, timeout=15)
                cursor = conn.cursor()
                cursor.execute("INSERT OR REPLACE INTO llm_cache (prompt_hash, response) VALUES (?, ?)", (prompt_hash, accumulated))
                conn.commit()
            except Exception as e:
                print(f"[LLM Cache] Write error: {e}")
            finally:
                try:
                    conn.close()
                except Exception:
                    pass

        latency = time.time() - start_time
        log_event("ai_answer", latency=latency, success=True, token_count=len(accumulated.split()))
    except Exception as api_err:
        latency = time.time() - start_time
        log_event("ai_answer", latency=latency, success=False, error_message=str(api_err))
        raise api_err
