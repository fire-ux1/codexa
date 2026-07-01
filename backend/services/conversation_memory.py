import uuid

class ConversationSession:
    def __init__(self, conversation_id: str = None):
        self.conversation_id = conversation_id or str(uuid.uuid4())
        self.messages = []
        self.repo = ""
        self.file = ""
        self.symbol = ""
        self.selection = ""
        self.recent_actions = []
        self.last_review = ""
        self.recent_references = []

    def to_dict(self):
        return {
            "conversation_id": self.conversation_id,
            "messages": self.messages,
            "repo": self.repo,
            "file": self.file,
            "symbol": self.symbol,
            "selection": self.selection,
            "recent_actions": self.recent_actions,
            "last_review": self.last_review,
            "recent_references": self.recent_references
        }

class ConversationMemoryManager:
    def __init__(self):
        self._sessions = {}

    def get_or_create(self, conversation_id: str = None) -> ConversationSession:
        if not conversation_id or conversation_id not in self._sessions:
            session = ConversationSession(conversation_id)
            self._sessions[session.conversation_id] = session
            return session
        return self._sessions[conversation_id]

    def get(self, conversation_id: str) -> ConversationSession | None:
        return self._sessions.get(conversation_id)

    def list_sessions(self):
        return [
            {
                "conversation_id": cid,
                "repo": s.repo,
                "file": s.file,
                "symbol": s.symbol,
                "last_message": s.messages[-1]["content"] if s.messages else "New Conversation"
            }
            for cid, s in self._sessions.items()
        ]

    def clear(self):
        self._sessions.clear()

# Global memory manager instance
memory_manager = ConversationMemoryManager()
