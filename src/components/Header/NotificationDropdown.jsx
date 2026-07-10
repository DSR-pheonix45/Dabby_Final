import React, { useState, useEffect, useRef } from "react";
import { BsBell, BsCheck2All } from "react-icons/bs";
import { apiFetch } from "../../lib/apiClient";
import { useNavigate } from "react-router-dom";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch('/api/collaboration/user/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/api/collaboration/user/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      handleMarkRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors relative"
      >
        <BsBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#181818] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden font-dm-sans">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1A1A1A]">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-white/5 cursor-pointer transition-colors flex gap-3 ${
                    notif.is_read ? 'hover:bg-white/5 opacity-70' : 'bg-teal-500/5 hover:bg-teal-500/10'
                  }`}
                >
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${notif.is_read ? 'bg-transparent' : 'bg-teal-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notif.is_read ? 'text-gray-300' : 'text-white font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-gray-600 mt-2">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <button 
                      onClick={(e) => handleMarkRead(notif.id, e)}
                      className="p-1.5 text-gray-500 hover:text-white rounded hover:bg-white/10 self-start opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Mark as read"
                    >
                      <BsCheck2All size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-white/10 bg-[#1A1A1A] text-center">
            <button className="text-xs text-gray-400 hover:text-white transition-colors">
              View All Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
