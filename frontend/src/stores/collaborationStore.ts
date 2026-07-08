export interface CommentItem {
  id: string | number;
  author: string;
  file?: string;
  target?: string;
  comment_text?: string;
  text?: string;
  [key: string]: any;
}

export interface NotificationItem {
  id?: number | string;
  text: string;
  time?: string;
  read?: boolean;
}

export interface CollaborationState {
  comments: CommentItem[];
  notifications: NotificationItem[];
  connected: boolean;
  projectId: string;
}

class CollaborationStore {
  private state: CollaborationState;
  private listeners: Set<(state: CollaborationState) => void>;

  constructor() {
    this.state = {
      comments: [],
      notifications: [
        { id: 1, text: "AI indexing database compiled successfully.", time: "2m ago", read: false },
        { id: 2, text: "Security report ready for download.", time: "1h ago", read: true }
      ],
      connected: false,
      projectId: "default-project",
    };
    this.listeners = new Set();
  }

  getState(): CollaborationState {
    return this.state;
  }

  subscribe(listener: (state: CollaborationState) => void): () => boolean {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  setProjectId(projectId: string): void {
    this.state.projectId = projectId;
    this.emit();
  }

  setConnected(connected: boolean): void {
    this.state.connected = connected;
    this.emit();
  }

  setComments(comments: CommentItem[]): void {
    this.state.comments = comments;
    this.emit();
  }

  addComment(comment: CommentItem): void {
    if (this.state.comments.some((c) => c.id === comment.id)) return;
    this.state.comments = [comment, ...this.state.comments];
    this.emit();
  }

  deleteComment(commentId: string | number): void {
    this.state.comments = this.state.comments.filter((c) => c.id !== commentId);
    this.emit();
  }

  setNotifications(notifications: NotificationItem[]): void {
    this.state.notifications = notifications;
    this.emit();
  }

  addNotification(notification: NotificationItem): void {
    this.state.notifications = [
      {
        id: Date.now() + Math.random(),
        text: notification.text,
        time: "Just now",
        read: false,
      },
      ...this.state.notifications,
    ];
    this.emit();
  }

  clearNotifications(): void {
    this.state.notifications = [];
    this.emit();
  }
}

export const collaborationStore = new CollaborationStore();
