import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  HeartPulse,
  Inbox,
  Loader2,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const FILTERS = [
  { key: 'all', label: 'All', category: 'all', status: 'active' },
  { key: 'unread', label: 'Unread', category: 'all', status: 'unread' },
  { key: 'health', label: 'Health', category: 'health', status: 'active' },
  { key: 'finance', label: 'Finance', category: 'finance', status: 'active' },
  { key: 'career', label: 'Career', category: 'career', status: 'active' },
  { key: 'goal', label: 'Goals', category: 'goal', status: 'active' },
  { key: 'daily-update', label: 'Daily Updates', category: 'daily-update', status: 'active' },
];

const CATEGORY_META = {
  health: { label: 'Health', icon: HeartPulse, color: '#10c7a1', route: '/health' },
  finance: { label: 'Finance', icon: Wallet, color: '#c8a84b', route: '/finance' },
  career: { label: 'Career', icon: Briefcase, color: '#7b61ff', route: '/career' },
  goal: { label: 'Goal', icon: Target, color: '#38bdf8', route: '/goals' },
  'daily-update': { label: 'Daily Update', icon: CalendarCheck, color: '#fb923c', route: '/daily-update' },
  system: { label: 'System', icon: Bell, color: '#94a3b8', route: '/dashboard' },
};

const PRIORITY_META = {
  high: { label: 'High', color: '#ef4444' },
  medium: { label: 'Medium', color: '#f59e0b' },
  low: { label: 'Low', color: '#10c7a1' },
};

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Just now';
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [unreadActiveCount, setUnreadActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');

  const selectedFilter = useMemo(
    () => FILTERS.find((filter) => filter.key === activeFilter) || FILTERS[0],
    [activeFilter],
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: authHeaders(),
        params: {
          category: selectedFilter.category,
          status: selectedFilter.status,
        },
      });
      setNotifications(response.data.data || []);
      setUnreadActiveCount(response.data.unreadActiveCount || 0);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [selectedFilter.category, selectedFilter.status]);

  useEffect(() => {
    const initialLoad = window.setTimeout(fetchNotifications, 0);
    const timer = window.setInterval(fetchNotifications, 10000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleUpdate = () => fetchNotifications();
    window.addEventListener('daily-update-completed', handleUpdate);
    return () => window.removeEventListener('daily-update-completed', handleUpdate);
  }, [fetchNotifications]);

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.isRead).length,
    high: notifications.filter((notification) => notification.priority === 'high').length,
  }), [notifications]);

  const updateNotification = async (id, payload) => {
    setActionId(id);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/notifications`,
        { ids: [id], ...payload },
        { headers: authHeaders() },
      );
      setUnreadActiveCount(response.data.unreadActiveCount || 0);
      await fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update notification.');
    } finally {
      setActionId('');
    }
  };

  const markAllRead = async () => {
    setActionId('all');
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/notifications`,
        { isRead: true },
        { headers: authHeaders() },
      );
      setNotifications(response.data.data || []);
      setUnreadActiveCount(response.data.unreadActiveCount || 0);
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to mark notifications read.');
    } finally {
      setActionId('');
    }
  };

  const openNotificationTarget = (notification) => {
    const meta = CATEGORY_META[notification.category] || CATEGORY_META.system;
    updateNotification(notification._id, { isRead: true });
    navigate(notification.actionLink || meta.route);
  };

  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 left-[18rem] bg-[radial-gradient(circle_at_20%_0%,rgba(16,199,161,0.11),transparent_26%),radial-gradient(circle_at_86%_12%,rgba(123,97,255,0.10),transparent_30%)]" />
      <main className="relative mx-auto max-w-7xl space-y-5">
        <header className="rounded-[1.5rem] border border-white/10 bg-[#0b111a]/95 p-5 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.9)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {/* <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7df3cc]/70">Real-time notifications</p> */}
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Twin AI Alerts</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                Health, finance, career, goal, and daily update alerts generated from your Digital Twin activity.
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={actionId === 'all' || unreadActiveCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#10c7a1]/25 bg-[#10c7a1]/10 px-4 py-2.5 text-sm font-black text-[#7df3cc] transition hover:bg-[#10c7a1]/18 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
            >
              {actionId === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Mark all read
            </button>
          </div>
        </header>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#0b111a]/95 p-5 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.9)] sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#10c7a1]/25 bg-[#10c7a1]/10 text-[#7df3cc]">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-black">AI Alert Center</h1>
              <p className="text-xs font-semibold text-white/45">{unreadActiveCount} active unread notifications</p>
            </div>
          </div>

            <nav className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <button
                  type="button"
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition ${
                    active
                      ? 'border border-[#10c7a1]/25 bg-[#10c7a1]/12 text-[#7df3cc]'
                        : 'border-white/8 bg-white/[0.025] text-white/55 hover:bg-white/[0.055] hover:text-white'
                  }`}
                >
                  <span>{filter.label}</span>
                  {filter.key === 'unread' && unreadActiveCount > 0 && (
                    <span className="rounded-full bg-[#ef4444]/18 px-2 py-0.5 text-[10px] text-[#ff9aaa]">{unreadActiveCount}</span>
                  )}
                </button>
              );
            })}
          </nav>
          </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard icon={Bell} label="Visible alerts" value={stats.total} color="#7b61ff" />
              <StatCard icon={EyeOff} label="Unread here" value={stats.unread} color="#f59e0b" />
              <StatCard icon={AlertTriangle} label="High priority" value={stats.high} color="#ef4444" />
            </div>
        </section>

          {error && (
            <div className="rounded-2xl border border-[#ef4444]/25 bg-[#ef4444]/10 p-4 text-sm font-semibold text-[#ffb4b4]">
              {error}
            </div>
          )}

          <section className="space-y-3">
            {loading ? (
              <div className="grid min-h-80 place-items-center rounded-[1.5rem] border border-white/10 bg-[#0b111a]/90">
                <Loader2 className="h-8 w-8 animate-spin text-[#7df3cc]" />
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState label={selectedFilter.label} />
            ) : (
              <div className="rounded-[1.5rem] border border-white/10 bg-[#0b111a]/78 p-3 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.86)] sm:p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Notifications</p>
                    <h3 className="mt-1 text-lg font-black">{selectedFilter.label} alerts</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/45">
                    {notifications.length} items
                  </span>
                </div>
                <div className="space-y-3">
                  {notifications.map((notification) => (
                <NotificationCard
                  key={notification._id}
                  notification={notification}
                  busy={actionId === notification._id}
                  onToggleRead={() => updateNotification(notification._id, { isRead: !notification.isRead })}
                  onResolve={() => updateNotification(notification._id, { isResolved: true, isRead: true })}
                  onOpen={() => openNotificationTarget(notification)}
                />
                  ))}
                </div>
              </div>
            )}
          </section>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl border" style={{ borderColor: `${color}45`, backgroundColor: `${color}18`, color }}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-2xl font-black">{value}</span>
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-white/38">{label}</p>
    </div>
  );
}

function NotificationCard({ notification, busy, onToggleRead, onResolve, onOpen }) {
  const category = CATEGORY_META[notification.category] || CATEGORY_META.system;
  const priority = PRIORITY_META[notification.priority] || PRIORITY_META.medium;
  const CategoryIcon = category.icon;

  return (
    <article className={`rounded-[1.35rem] border p-4 transition sm:p-5 ${
      notification.isRead
        ? 'border-white/8 bg-[#0b111a]/72'
        : 'border-white/14 bg-[#0d1520]/95 shadow-[0_24px_60px_-42px_rgba(16,199,161,0.8)]'
    }`}>
      <div className="flex gap-4">
        <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border" style={{ borderColor: `${category.color}40`, backgroundColor: `${category.color}16`, color: category.color }}>
          <CategoryIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!notification.isRead && <span className="h-2 w-2 rounded-full bg-[#10c7a1] shadow-[0_0_10px_rgba(16,199,161,0.85)]" />}
            <h3 className="min-w-0 flex-1 text-base font-black text-white">{notification.title}</h3>
            <span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ borderColor: `${priority.color}40`, backgroundColor: `${priority.color}15`, color: priority.color }}>
              {priority.label}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-white/58">{notification.message}</p>

          {(notification.suggestion || notification.motivation) && (
            <div className="mt-3 rounded-2xl border border-[#7b61ff]/20 bg-[#7b61ff]/8 p-3">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#c4b5fd]">
                <Sparkles className="h-3.5 w-3.5" />
                Twin Suggestion
              </p>
              <p className="mt-2 text-sm leading-6 text-white/62">{notification.suggestion || notification.motivation}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.045] px-2.5 py-1 text-xs font-semibold text-white/45">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(notification.createdAt)}
            </span>
            <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${category.color}14`, color: category.color }}>
              {category.label}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" onClick={onToggleRead} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-bold text-white/58 transition hover:bg-white/8 hover:text-white disabled:opacity-50">
                {notification.isRead ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {notification.isRead ? 'Unread' : 'Read'}
              </button>
              <button type="button" onClick={onResolve} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-bold text-white/58 transition hover:bg-white/8 hover:text-white disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolve
              </button>
              <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-xl border border-[#10c7a1]/25 bg-[#10c7a1]/10 px-3 py-2 text-xs font-black text-[#7df3cc] transition hover:bg-[#10c7a1]/18">
                Open
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ label }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-[1.5rem] border border-white/10 bg-[#0b111a]/90 p-8 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/25">
          <Inbox className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-xl font-black">No {label} alerts</h3>
        <p className="mt-2 text-sm text-white/45">Your Digital Twin will show new alerts here as soon as they are generated.</p>
      </div>
    </div>
  );
}
