import { useState, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  created_at: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  type: string | null;
}

export function NotificationBell() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const subscription = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
          );
          if (payload.old.is_read === false && payload.new.is_read === true) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => {
            const notif = prev.find((n) => n.id === payload.old.id);
            if (notif && !notif.is_read) {
              setUnreadCount((c) => Math.max(0, c - 1));
            }
            return prev.filter((n) => n.id !== payload.old.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // If table doesn't exist yet, ignore
        if (error.code !== '42P01') {
          console.error('Error fetching notifications:', error);
        }
        return;
      }
      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    } catch (e) {
      console.error(e);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      await supabase.from('notifications').delete().eq('user_id', user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 outline-none ring-2 ring-transparent hover:ring-blue-400 dark:hover:ring-blue-500 transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 sm:w-96" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white">Notifications</span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                  <Check className="w-3 h-3 mr-1" /> Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-auto p-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                  !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex w-full justify-between items-start gap-2">
                  <span className={`text-sm font-semibold ${!notification.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {notification.title}
                  </span>
                  {!notification.is_read && (
                    <span className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </div>
                <p className={`text-xs ${!notification.is_read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'} line-clamp-2`}>
                  {notification.message}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
