import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Info, Database, ShieldAlert, Check, CheckCheck, Loader2 } from "lucide-react";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../../services/api";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  created_at: string;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setNotifications(
        data.map((item: any) => ({
          id: item.id,
          user_id: item.user_id || "system",
          title: item.title || (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "Notification"),
          message: item.message,
          read: item.read,
          type: item.type || "system",
          created_at: item.created_at,
        }))
      );
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    // Poll notifications every 45 seconds for a premium reactive feel
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "security":
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case "index":
        return <Database className="w-3.5 h-3.5 text-indigo-400" />;
      case "system":
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const diffMs = new Date().getTime() - new Date(timeStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(timeStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg border transition-colors relative cursor-pointer ${
          isOpen
            ? "bg-[#1c2230] border-[#FF9D4D]/40 text-white"
            : "bg-[#0c0f16] border-[#1c2230] hover:bg-[#141822] text-gray-400 hover:text-white"
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 select-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9D4D] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9D4D]"></span>
          </span>
        )}
      </button>

      {/* Dropdown Overlay */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#10141B] border border-[#1c2230] rounded-2xl shadow-2xl overflow-hidden z-50 glass select-text animate-fade-in">
          
          {/* Header */}
          <div className="p-3 border-b border-[#1c2230]/40 bg-[#0c0f16]/60 flex items-center justify-between select-none">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">Notifications ({unreadCount})</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#FF9D4D] hover:text-[#FFB073] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#1c2230]/30 scrollbar-thin select-text">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2 select-none">
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                <span className="text-[10px] font-mono">Fetching alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2 select-none">
                <Bell className="w-6 h-6 text-gray-600 opacity-55" />
                <p className="text-xs font-sans">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={(e) => !notif.read && handleMarkRead(notif.id, e)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-[#141822]/40 transition-colors select-text cursor-pointer ${
                    !notif.read ? "bg-[#FF9D4D]/2" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0 select-none">
                    {getTypeIcon(notif.type)}
                  </div>
                  
                  <div className="space-y-0.5 min-w-0 flex-grow">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10.5px] truncate ${!notif.read ? "font-bold text-white font-sans" : "text-gray-400 font-sans"}`}>
                        {notif.title}
                      </span>
                      <span className="text-[8.5px] font-mono text-gray-500 shrink-0 select-none">
                        {formatTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[9.5px] leading-normal text-gray-500 break-words font-sans">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={(e) => handleMarkRead(notif.id, e)}
                      className="p-1 rounded bg-[#0c0f16] border border-[#1c2230] text-gray-500 hover:text-white hover:border-gray-500 shrink-0 transition-colors cursor-pointer self-center"
                      title="Mark as read"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
        </div>
      )}

    </div>
  );
}
