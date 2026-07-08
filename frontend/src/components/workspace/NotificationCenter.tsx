import { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { collaborationStore } from "../../stores/collaborationStore";
import type { NotificationItem } from "../../stores/collaborationStore";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    collaborationStore.getState().notifications
  );

  useEffect(() => {
    const unsubscribe = collaborationStore.subscribe((state) => {
      setNotifications(state.notifications);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const clearAll = () => {
    collaborationStore.clearNotifications();
  };

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2 flex justify-between items-center">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-accent" /> Notification Logs Center
        </h3>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[9px] text-muted hover:text-text-strong font-mono cursor-pointer transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted gap-1.5">
            <BellOff className="w-7 h-7 opacity-40" />
            <p className="text-[10px] italic font-mono">No active alerts or logs.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 bg-panel border rounded-xl flex gap-2.5 items-start transition-all shadow-sm ${
                notif.read
                  ? "border-border text-muted"
                  : "border-accent/20 text-text"
              }`}
            >
              <CheckCircle2
                className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  notif.read ? "text-muted" : "text-accent"
                }`}
              />
              <div className="space-y-0.5 text-[9.5px] font-mono leading-relaxed select-text">
                <p>{notif.text}</p>
                <span className="text-[8px] text-muted block">
                  {notif.time}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
