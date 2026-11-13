export interface RawGmailMessage {
  gmailMessageId: string;
  threadId: string;
  from: string;
  fromEmail: string;
  recipients: string[];
  subject: string;
  date: string;
  isoDate: string;
  preview: string;
  body: string;
  labels: string[];
  attachmentsMetadata: Array<{ filename: string; mimeType: string; size: number }>;
  gmailUrl: string;
}

export interface GmailSyncResult {
  emailAddress: string;
  historyId?: string;
  messages: RawGmailMessage[];
  totalFetched: number;
  skippedDuplicates: number;
  syncMode: 'full' | 'incremental';
}

export interface RawCalendarEvent {
  googleEventId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  calendarName: string;
  location: string;
  participants: string[];
  description: string;
  htmlLink?: string;
}

function decodeBase64Url(data?: string): string {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractBodyAndAttachments(payload: any): {
  body: string;
  attachments: Array<{ filename: string; mimeType: string; size: number }>;
} {
  let plainText = '';
  let htmlText = '';
  const attachments: Array<{ filename: string; mimeType: string; size: number }> = [];

  function walk(part: any) {
    if (!part) return;
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: String(part.filename),
        mimeType: String(part.mimeType || 'application/octet-stream'),
        size: Number(part.body.size || 0),
      });
    }
    if (part.mimeType === 'text/plain' && part.body?.data && !plainText) {
      plainText = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data && !htmlText) {
      htmlText = decodeBase64Url(part.body.data);
    }
    if (Array.isArray(part.parts)) {
      for (const child of part.parts) walk(child);
    }
  }

  walk(payload);
  const body = plainText.trim() || (htmlText ? stripHtml(htmlText) : '');
  return { body, attachments };
}

function parseFromHeader(rawFrom: string): { name: string; email: string } {
  const match = rawFrom.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/^["']|["']$/g, '').trim() || match[2],
      email: match[2].trim(),
    };
  }
  return { name: rawFrom.trim(), email: rawFrom.trim() };
}

async function googleFetchJson(url: string, accessToken: string, retries = 2): Promise<any> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      return await res.json();
    }
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google authorization error (${res.status}): Please reconnect your Google account.`);
    }
    if (res.status === 404) {
      const err: any = new Error(`Google resource not found (404): ${text}`);
      err.status = 404;
      throw err;
    }
    lastErr = new Error(`Google API error (${res.status}): ${text.slice(0, 240)}`);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    throw lastErr;
  }
  throw lastErr || new Error('Google API request failed');
}

export async function fetchGmailProfile(accessToken: string) {
  return googleFetchJson('https://gmail.googleapis.com/gmail/v1/users/me/profile', accessToken);
}

export async function syncGmailMessages(
  accessToken: string,
  options: {
    maxMessages?: number;
    afterDate?: string; // YYYY-MM-DD
    beforeDate?: string; // YYYY-MM-DD
    startHistoryId?: string;
    existingIds?: string[];
    onProgress?: (pct: number, msg: string) => void;
  }
): Promise<GmailSyncResult> {
  const profile = await fetchGmailProfile(accessToken);
  const existingSet = new Set(options.existingIds || []);
  const maxMessages = Math.min(options.maxMessages || 25, 100);
  const messageIds: string[] = [];
  let syncMode: 'full' | 'incremental' = 'full';

  options.onProgress?.(15, `Connected to ${profile.emailAddress}. Checking mailbox index...`);

  // Attempt incremental history sync if startHistoryId is provided and no date filter changed
  if (options.startHistoryId && !options.afterDate && !options.beforeDate) {
    try {
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({
          startHistoryId: options.startHistoryId,
          historyTypes: 'messageAdded',
          maxResults: '100',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const hist = await googleFetchJson(
          `https://gmail.googleapis.com/gmail/v1/users/me/history?${params.toString()}`,
          accessToken
        );
        for (const h of hist.history || []) {
          for (const added of h.messagesAdded || []) {
            const labels: string[] = added.message?.labelIds || [];
            if (!labels.includes('SPAM') && !labels.includes('TRASH')) {
              messageIds.push(added.message.id);
            }
          }
        }
        pageToken = hist.nextPageToken;
      } while (pageToken && messageIds.length < maxMessages);
      syncMode = 'incremental';
    } catch (err: any) {
      if (err?.status !== 404) throw err;
      // Expired historyId falls back cleanly to full paginated listing
      messageIds.length = 0;
    }
  }

  if (syncMode === 'full') {
    const queryParts = ['-in:spam', '-in:trash'];
    if (options.afterDate) queryParts.push(`after:${options.afterDate.replace(/-/g, '/')}`);
    if (options.beforeDate) queryParts.push(`before:${options.beforeDate.replace(/-/g, '/')}`);
    const q = queryParts.join(' ');

    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q,
        includeSpamTrash: 'false',
        maxResults: String(Math.min(50, maxMessages)),
      });
      if (pageToken) params.set('pageToken', pageToken);

      const listData = await googleFetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
        accessToken
      );
      for (const m of listData.messages || []) {
        if (m.id) messageIds.push(m.id);
      }
      pageToken = listData.nextPageToken;
    } while (pageToken && messageIds.length < maxMessages);
  }

  const uniqueIds = Array.from(new Set(messageIds)).slice(0, maxMessages);
  const newIds = uniqueIds.filter((id) => !existingSet.has(id));
  const skippedDuplicates = uniqueIds.length - newIds.length;

  options.onProgress?.(
    35,
    `Found ${newIds.length} new messages (${skippedDuplicates} already synced). Fetching content...`
  );

  const messages: RawGmailMessage[] = [];
  for (let i = 0; i < newIds.length; i++) {
    const id = newIds[i];
    const msg = await googleFetchJson(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      accessToken
    );
    const headers: Array<{ name: string; value: string }> = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const rawFrom = getHeader('From');
    const parsedFrom = parseFromHeader(rawFrom);
    const rawTo = getHeader('To');
    const recipients = rawTo
      ? rawTo
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const subject = getHeader('Subject') || '(No Subject)';
    const rawDate = getHeader('Date');
    const parsedDate = rawDate ? new Date(rawDate) : new Date(Number(msg.internalDate || Date.now()));
    const validDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const isoDate = validDate.toISOString();
    const formattedDate = `${isoDate.slice(0, 10)} ${isoDate.slice(11, 16)}`;

    const { body, attachments } = extractBodyAndAttachments(msg.payload);
    messages.push({
      gmailMessageId: msg.id,
      threadId: msg.threadId,
      from: parsedFrom.name,
      fromEmail: parsedFrom.email,
      recipients,
      subject,
      date: formattedDate,
      isoDate,
      preview: String(msg.snippet || body.slice(0, 180)),
      body: body || String(msg.snippet || ''),
      labels: msg.labelIds || [],
      attachmentsMetadata: attachments,
      gmailUrl: `https://mail.google.com/mail/u/0/#all/${msg.id}`,
    });

    if (newIds.length > 0) {
      const pct = 35 + Math.round(((i + 1) / newIds.length) * 30);
      options.onProgress?.(pct, `Fetched email ${i + 1} of ${newIds.length}...`);
    }
  }

  return {
    emailAddress: profile.emailAddress,
    historyId: profile.historyId,
    messages,
    totalFetched: messages.length,
    skippedDuplicates,
    syncMode,
  };
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  options: { timeMin?: string; timeMax?: string } = {}
): Promise<RawCalendarEvent[]> {
  const calList = await googleFetchJson(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    accessToken
  );
  const calendars: Array<{ id: string; summary: string; primary?: boolean }> = (calList.items || []).slice(
    0,
    5
  );

  const timeMin = options.timeMin || new Date(Date.now() - 14 * 86400000).toISOString();
  const timeMax = options.timeMax || new Date(Date.now() + 45 * 86400000).toISOString();
  const results: RawCalendarEvent[] = [];

  for (const cal of calendars) {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin,
      timeMax,
      maxResults: '50',
    });
    const evData = await googleFetchJson(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
      accessToken
    );
    for (const ev of evData.items || []) {
      const startRaw = ev.start?.dateTime || ev.start?.date || '';
      const endRaw = ev.end?.dateTime || ev.end?.date || '';
      const date = startRaw.slice(0, 10);
      const startTime = startRaw.includes('T') ? startRaw.slice(11, 16) : '00:00';
      const endTime = endRaw.includes('T') ? endRaw.slice(11, 16) : '23:59';
      results.push({
        googleEventId: ev.id,
        title: ev.summary || '(Untitled Event)',
        date,
        startTime,
        endTime,
        calendarName: cal.primary ? 'Primary' : cal.summary || 'Google Calendar',
        location: ev.location || 'Online / Unspecified',
        participants: Array.isArray(ev.attendees)
          ? ev.attendees.map((a: any) => a.displayName || a.email).filter(Boolean)
          : [],
        description: ev.description || '',
        htmlLink: ev.htmlLink,
      });
    }
  }

  return results;
}
