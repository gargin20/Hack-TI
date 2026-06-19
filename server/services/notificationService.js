import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendGmailWithAPI } from './gmailApiService.js';

let socketServer = null;

const actionLinks = {
  health: '/health',
  finance: '/finance',
  career: '/career',
  goal: '/goals',
  'daily-update': '/daily-update',
  system: '/dashboard',
};

const defaultSuggestions = {
  health: 'Prioritize 7-8 hours of sleep, hydrate well, and add light movement today.',
  finance: 'Review discretionary spending and protect your planned savings buffer.',
  career: 'Spend one focused block on your learning path or project progress today.',
  goal: 'Break the next milestone into one small action you can complete today.',
  'daily-update': 'Complete today’s check-in so your Digital Twin stays accurate.',
};

const defaultMotivations = [
  'Every expert was once a beginner.',
  'Consistency is your superpower.',
  'You achieved what you planned. Time to aim higher.',
  'Small daily wins become visible progress.',
];

export function setNotificationSocket(io) {
  socketServer = io;
}

export function emitDashboardSync(userId, data) {
  if (!socketServer) return;
  socketServer.to(String(userId)).emit('dashboard:sync', data);
}

export async function createNotification({
  userId,
  category = 'system',
  subType = 'general',
  title,
  message,
  priority = 'medium',
  suggestion = '',
  motivation = '',
  actionLink = '',
  sendEmail = true,
}) {
  const preferences = await getNotificationPreferences(userId);
  if (!shouldCreateNotification(category, priority, preferences)) return null;

  const notification = await Notification.create({
    userId,
    category,
    subType,
    title,
    message,
    priority,
    suggestion: suggestion || (priority === 'high' ? defaultSuggestions[category] || '' : ''),
    motivation: preferences.aiMotivationalMessages === false ? '' : motivation || motivationFor(category, subType),
    actionLink: actionLink || actionLinks[category] || '/dashboard',
    type: category,
  });

  emitNotification(userId, notification);
  if (preferences.emailNotifications && sendEmail !== false) {
    await sendEmailNotification(userId, notification);
  } else {
    notification.emailStatus = 'skipped';
    notification.emailError = preferences.emailNotifications ? 'Email disabled for this notification.' : 'User email notifications are disabled.';
    await notification.save();
  }

  return notification;
}

async function getNotificationPreferences(userId) {
  const user = await User.findById(userId).select('preferences').lean();
  return {
    notifications: user?.preferences?.notifications !== false,
    goalNotifications: user?.preferences?.notificationPreferences?.goalNotifications !== false,
    healthAlerts: user?.preferences?.notificationPreferences?.healthAlerts !== false,
    financeAlerts: user?.preferences?.notificationPreferences?.financeAlerts !== false,
    careerAlerts: user?.preferences?.notificationPreferences?.careerAlerts !== false,
    dailyUpdateReminders: user?.preferences?.notificationPreferences?.dailyUpdateReminders !== false,
    aiMotivationalMessages: user?.preferences?.notificationPreferences?.aiMotivationalMessages !== false,
    emailNotifications: user?.preferences?.notificationPreferences?.emailNotifications !== false,
    highPriorityOnly: user?.preferences?.notificationPreferences?.highPriorityOnly === true,
  };
}

function shouldCreateNotification(category, priority, preferences) {
  if (!preferences.notifications) return false;
  if (preferences.highPriorityOnly && priority !== 'high') return false;

  const categoryPreference = {
    goal: preferences.goalNotifications,
    health: preferences.healthAlerts,
    finance: preferences.financeAlerts,
    career: preferences.careerAlerts,
    'daily-update': preferences.dailyUpdateReminders,
  };

  return categoryPreference[category] !== false;
}

export async function resolveNotifications(userId, filter) {
  await Notification.updateMany(
    { userId, isResolved: false, ...filter },
    { $set: { isResolved: true, isRead: true } },
  );
  emitCount(userId);
}

export async function getUnreadActiveCount(userId) {
  return Notification.countDocuments({ userId, isRead: false, isResolved: false, archivedAt: null });
}

export async function archiveOldNotifications() {
  const now = Date.now();
  const rules = [
    { priority: 'high', days: 30 },
    { priority: 'medium', days: 14 },
    { priority: 'low', days: 7 },
  ];

  await Promise.all(rules.map((rule) =>
    Notification.updateMany(
      {
        priority: rule.priority,
        archivedAt: null,
        createdAt: { $lt: new Date(now - rule.days * 86400000) },
      },
      { $set: { archivedAt: new Date() } },
    ),
  ));
}

function emitNotification(userId, notification) {
  if (!socketServer) return;

  socketServer.to(String(userId)).emit('notification:new', notification);
  emitCount(userId);
}

async function emitCount(userId) {
  if (!socketServer) return;
  const count = await getUnreadActiveCount(userId);
  socketServer.to(String(userId)).emit('notification:count', { count });
}

function motivationFor(category, subType) {
  if (!['goal', 'career', 'finance'].includes(category)) return '';
  if (!/(created|completed|streak|milestone|course|savings)/i.test(subType)) return '';
  const index = Math.floor(Math.random() * defaultMotivations.length);
  return defaultMotivations[index];
}

async function sendEmailNotification(userId, notification) {
  try {
    const user = await User.findById(userId).lean();
    if (!user?.email) {
      await markEmailResult(notification, {
        status: 'skipped',
        error: 'Registered user email is missing.',
      });
      return;
    }

    notification.emailRecipient = maskEmail(user.email);
    await notification.save();

    console.log(`[Notifications] Sending email for "${notification.title}" to registered user email ${maskEmail(user.email)}`);

    await sendGmailWithAPI({
      to: user.email,
      subject: `[DigitalTwin] ${notification.title}`,
      text: buildEmailText(notification),
      html: buildEmailHtml(notification)
    });

    await markEmailResult(notification, { status: 'sent', provider: 'gmail-api' });
  } catch (error) {
    console.error('Notification email failed details:');
    console.error('- Message:', error.message);
    console.error('- URL called:', error.config?.url);
    console.error('- Method:', error.config?.method);
    console.error('- Response Data:', JSON.stringify(error.response?.data || {}));
    
    const detailedError = `${error.message}. URL: ${error.config?.url || 'N/A'}. Response: ${JSON.stringify(error.response?.data || {})}`;
    await markEmailResult(notification, {
      status: 'failed',
      provider: 'gmail-api',
      error: detailedError.slice(0, 240),
    });
  }
}

async function markEmailResult(notification, result) {
  notification.emailStatus = result.status;
  notification.emailProvider = result.provider || '';
  notification.emailError = result.error ? String(result.error).slice(0, 240) : '';
  if (result.status === 'sent') notification.emailedAt = new Date();
  await notification.save();
}

function maskEmail(email = '') {
  const [name = '', domain = ''] = String(email).split('@');
  if (!domain) return '';
  return `${name.slice(0, 2)}***@${domain}`;
}

function buildEmailText(notification) {
  const lines = [
    notification.title,
    '',
    notification.message,
  ];

  if (notification.suggestion) lines.push('', `Twin suggestion: ${notification.suggestion}`);
  if (notification.motivation) lines.push('', `Motivation: ${notification.motivation}`);
  if (notification.actionLink) lines.push('', `Open in app: ${process.env.FRONTEND_URL || 'http://localhost:5173'}${notification.actionLink}`);

  return lines.join('\n');
}

function buildEmailHtml(notification) {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const actionUrl = notification.actionLink ? `${appUrl}${notification.actionLink}` : appUrl;
  const detail = notification.suggestion || notification.motivation || '';

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#05070d;color:#f8fafc;padding:28px;">
      <div style="max-width:560px;margin:0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:18px;background:#0b111a;padding:24px;">
        <p style="margin:0 0 10px;color:#7df3cc;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:800;">DigitalTwin Alert</p>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;">${escapeHtml(notification.title)}</h1>
        <p style="margin:0;color:rgba(248,250,252,0.74);line-height:1.6;">${escapeHtml(notification.message)}</p>
        ${detail ? `<div style="margin-top:18px;border-radius:14px;background:rgba(123,97,255,0.12);border:1px solid rgba(123,97,255,0.25);padding:14px;"><strong style="color:#c4b5fd;">Twin suggestion</strong><p style="margin:8px 0 0;color:rgba(248,250,252,0.72);line-height:1.5;">${escapeHtml(detail)}</p></div>` : ''}
        <a href="${actionUrl}" style="display:inline-block;margin-top:22px;border-radius:12px;background:#10c7a1;color:#06110f;text-decoration:none;font-weight:900;padding:12px 16px;">Open in DigitalTwin</a>
      </div>
    </div>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
