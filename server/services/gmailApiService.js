import axios from 'axios';

export async function getAccessToken() {
  const clientId = process.env.NOTIFICATION_MAIL_CLIENT_ID;
  const clientSecret = process.env.NOTIFICATION_MAIL_CLIENT_SECRET;
  const refreshToken = process.env.NOTIFICATION_MAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Gmail API credentials (NOTIFICATION_MAIL_CLIENT_ID, NOTIFICATION_MAIL_CLIENT_SECRET, NOTIFICATION_MAIL_REFRESH_TOKEN) are missing.');
  }

  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  return response.data.access_token;
}

export async function sendGmailWithAPI({ to, subject, text, html }) {
  const senderEmail = process.env.NOTIFICATION_MAIL_USER || 'k.anjaliii.1011@gmail.com';
  const accessToken = await getAccessToken();

  const boundary = 'foo_bar_baz';
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: ${senderEmail}`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text).toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html).toString('base64'),
    '',
    `--${boundary}--`
  ];
  
  const rawMessage = messageParts.join('\n');
  const base64UrlEncoded = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const result = await axios.post(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    { raw: base64UrlEncoded },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return result.data;
}
