import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";

export default function NotificationBell({ firebaseUser }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { theme } = useTheme();
  const containerRef = useRef(null);
  const highestSeenIdRef = useRef(0);

  // Initial fetch and 45-second interval checking
  useEffect(() => {
    if (!firebaseUser) {
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
      highestSeenIdRef.current = 0;
      return;
    }

    let isMounted = true;

    // 1. Initial Unread Count Fetch
    fetchUnreadCount(firebaseUser)
      .then((data) => {
        if (isMounted && data.success) {
          setUnreadCount(data.count);
        }
      })
      .catch((err) => console.error("❌ Error fetching initial unread count:", err));

    // 2. Initial Notifications Fetch to set baseline (NO sound played)
    fetchNotifications(firebaseUser)
      .then((data) => {
        if (isMounted && data.success) {
          const list = data.notifications || [];
          if (list.length > 0) {
            highestSeenIdRef.current = Math.max(...list.map((n) => n.id));
          }
        }
      })
      .catch((err) => console.error("❌ Error setting initial notification baseline:", err));

    // 3. Setup 45-second check interval for new notifications
    const intervalId = setInterval(() => {
      fetchNotifications(firebaseUser)
        .then((data) => {
          if (!isMounted || !data.success) return;
          const list = data.notifications || [];
          if (list.length > 0) {
            const maxId = Math.max(...list.map((n) => n.id));

            // Sound plays ONLY if baseline is established and a newer ID is found
            if (highestSeenIdRef.current > 0 && maxId > highestSeenIdRef.current) {
              setNotifications(list);
              const unreads = list.filter((n) => !n.is_read).length;
              setUnreadCount(unreads);

              // Update baseline immediately
              highestSeenIdRef.current = maxId;

              // Play audio safely
              const audio = new Audio("/notification.mp3");
              audio.play().catch((err) => {
                // Silently ignore browser autoplay restrictions
              });
            } else if (highestSeenIdRef.current === 0) {
              highestSeenIdRef.current = maxId;
            }
          }
        })
        .catch((err) => console.error("❌ Periodic notification check failed:", err));
    }, 45000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [firebaseUser]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = async () => {
    if (!firebaseUser) return;

    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNotifications(firebaseUser);
        if (data.success) {
          setNotifications(data.notifications);
          const list = data.notifications || [];
          if (list.length > 0) {
            const maxId = Math.max(...list.map((n) => n.id));
            if (maxId > highestSeenIdRef.current) {
              highestSeenIdRef.current = maxId;
            }
          }
        } else {
          setError("Could not load notifications.");
        }
      } catch (err) {
        console.error("❌ Error loading notifications:", err);
        setError("Could not load notifications.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkOneRead = async (e, notif) => {
    e.stopPropagation();
    if (notif.is_read || !firebaseUser) return;

    try {
      const data = await markNotificationAsRead(firebaseUser, notif.id);
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("❌ Error marking notification read:", err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    if (unreadCount === 0 || !firebaseUser) return;

    try {
      const data = await markAllNotificationsAsRead(firebaseUser);
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("❌ Error marking all read:", err);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  const getIconInfo = (type) => {
    switch (type) {
      case "payment_success":
        return { icon: "💳", title: "Payment Completed", color: "text-amber-500" };
      case "booking_approved":
        return { icon: "✅", title: "Booking Approved", color: "text-emerald-500" };
      case "booking_declined":
        return { icon: "❌", title: "Booking Declined", color: "text-rose-500" };
      case "booking_cancelled":
        return { icon: "🗑️", title: "Booking Cancelled", color: "text-slate-500" };
      default:
        return { icon: "🔔", title: "Notification", color: "text-emerald-500" };
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className={`relative inline-flex items-center justify-center p-2 rounded-xl border shadow-sm transition duration-200 cursor-pointer text-sm focus:outline-none ${
          theme === "dark"
            ? "bg-slate-800/60 hover:bg-slate-700/60 border-white/10 text-slate-205"
            : "bg-white/50 hover:bg-white/75 border border-white/30 text-slate-700"
        }`}
        aria-label="Notifications"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-3 w-80 rounded-2xl border shadow-xl z-50 p-4 transition-all duration-150 origin-top-right ${
            theme === "dark"
              ? "bg-slate-900 border-slate-850 text-slate-100 shadow-slate-950/60"
              : "bg-white/95 backdrop-blur-md border-white/35 text-slate-800"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <span className="font-bold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-6 text-xs text-slate-500">
              <span className="animate-pulse">Loading notifications...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-xs text-rose-400">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No notifications yet.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {notifications.map((notif) => {
                const info = getIconInfo(notif.type);
                const isUnread = !notif.is_read;

                return (
                  <div
                    key={notif.id}
                    onClick={(e) => handleMarkOneRead(e, notif)}
                    className={`p-3 rounded-xl border transition duration-150 text-left relative flex items-start gap-3 cursor-pointer ${
                      isUnread
                        ? theme === "dark"
                          ? "bg-emerald-950/20 border-emerald-900/30"
                          : "bg-emerald-50/50 border-emerald-100"
                        : theme === "dark"
                        ? "bg-slate-950/20 border-slate-850"
                        : "bg-white/40 border-white/20"
                    } ${isUnread ? "hover:opacity-90" : "opacity-80 hover:opacity-100"}`}
                  >
                    {/* Status Icon */}
                    <span className="text-base select-none mt-0.5">{info.icon}</span>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold truncate ${info.color}`}>
                          {info.title}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-normal ${
                          isUnread
                            ? theme === "dark"
                              ? "text-slate-205"
                              : "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread Accent Dot */}
                    {isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
