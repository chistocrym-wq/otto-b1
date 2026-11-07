import { json } from '../lib/email-otp.js';
import { readSession } from '../lib/otto-session.js';
import {
  closeSupportTicketUser,
  createSupportTicket,
  getUserSupportSummary,
  getUserSupportTicket,
  listUserSupportTickets,
  markSupportTicketUserRead,
  replySupportTicketUser,
  supportErrorCode,
  validTicketId,
} from '../lib/support-storage.js';

function cleanMessage(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function dbErrorResponse(error) {
  const code = supportErrorCode(error);
  if (code === 'support_daily_limit') return json({ code, error: 'Daily ticket limit reached.' }, 429);
  if (code === 'support_message_rate_limit') return json({ code, error: 'Please wait before sending another message.' }, 429);
  if (code === 'support_ticket_closed') return json({ code, error: 'Ticket is closed.' }, 409);
  if (code === 'support_ticket_not_found' || code === 'support_ticket_forbidden') return json({ code: 'support_ticket_not_found', error: 'Ticket not found.' }, 404);
  if (code === 'support_invalid_message') return json({ code, error: 'Invalid message.' }, 400);
  console.error('Support database error:', error);
  return json({ code: 'support_unavailable', error: 'Support is temporarily unavailable.' }, 503);
}

export default async (req) => {
  const session = readSession(req);
  if (!session) return json({ authenticated: false, code: 'not_authenticated' }, 401);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const view = url.searchParams.get('view') || 'list';
    try {
      if (view === 'summary') {
        const row = await getUserSupportSummary(session.sub);
        return json({
          authenticated: true,
          unreadCount: Number(row?.unread_count) || 0,
          latestTicketId: row?.latest_ticket_id || null,
          latestTicketNo: row?.latest_ticket_no == null ? null : Number(row.latest_ticket_no),
        });
      }
      if (view === 'ticket') {
        const ticketId = url.searchParams.get('ticketId') || '';
        if (!validTicketId(ticketId)) return json({ code: 'invalid_ticket_id' }, 400);
        const detail = await getUserSupportTicket(session.sub, ticketId);
        if (!detail) return json({ code: 'support_ticket_not_found' }, 404);
        return json({ authenticated: true, ...detail });
      }
      const tickets = await listUserSupportTickets(session.sub);
      return json({ authenticated: true, tickets });
    } catch (error) {
      return dbErrorResponse(error);
    }
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'create';
    const ticketId = typeof body.ticketId === 'string' ? body.ticketId : '';
    try {
      if (action === 'create') {
        const message = cleanMessage(body.message);
        if (!message || message.length > 8000) return json({ code: 'support_invalid_message' }, 400);
        const ticket = await createSupportTicket({
          userId: session.sub,
          message,
          pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl : '',
          userAgent: typeof body.userAgent === 'string' ? body.userAgent : '',
        });
        return json({ ok: true, ticket }, 201);
      }
      if (!validTicketId(ticketId)) return json({ code: 'invalid_ticket_id' }, 400);
      if (action === 'reply') {
        const message = cleanMessage(body.message);
        if (!message || message.length > 8000) return json({ code: 'support_invalid_message' }, 400);
        const result = await replySupportTicketUser({ userId: session.sub, ticketId, message });
        return json({ ok: true, result });
      }
      if (action === 'read') {
        await markSupportTicketUserRead({ userId: session.sub, ticketId });
        return json({ ok: true });
      }
      if (action === 'close') {
        await closeSupportTicketUser({ userId: session.sub, ticketId });
        return json({ ok: true });
      }
      return json({ code: 'invalid_action' }, 400);
    } catch (error) {
      return dbErrorResponse(error);
    }
  }

  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
};

export const config = { path: '/api/support-ticket' };
