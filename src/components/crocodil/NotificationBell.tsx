"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, Info, CheckCircle2, XCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppNotification, getNotifications } from "@/lib/crocodil/notifications";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const notifs = await getNotifications();
    setNotifications(notifs);
    setUnreadCount(notifs.length); // Basitçe hepsini okunmamış say
  };

  useEffect(() => {
    fetchNotifications();
    // 5 dakikada bir güncelle
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "error": return <XCircle className="w-5 h-5 text-red-500" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "success": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "error": return "bg-red-50";
      case "warning": return "bg-yellow-50";
      case "success": return "bg-green-50";
      default: return "bg-blue-50";
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={handleOpen}
        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border overflow-hidden z-50 flex flex-col"
            style={{ borderColor: "#f3f4f6", maxHeight: "80vh" }}
          >
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">Bildirimler</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Yeni bildiriminiz yok.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="relative group">
                    <Link href={notif.link || "#"} onClick={() => setIsOpen(false)}>
                      <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getBgColor(notif.type)}`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-800 truncate">{notif.title}</h4>
                          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{notif.message}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {formatDistanceToNow(notif.date, { addSuffix: true, locale: tr })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
