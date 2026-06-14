import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications/count`, {
        headers: authHeaders(),
      });
      setUnreadCount(Number(response.data.unreadActiveCount || 0));
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(fetchCount, 0);
    const timer = window.setInterval(fetchCount, 10000);
    const handleRefresh = () => fetchCount();

    window.addEventListener('notifications-updated', handleRefresh);
    window.addEventListener('daily-update-completed', handleRefresh);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      window.removeEventListener('notifications-updated', handleRefresh);
      window.removeEventListener('daily-update-completed', handleRefresh);
    };
  }, [fetchCount]);

  return unreadCount;
}
