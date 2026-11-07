import { json } from '../lib/email-otp.js';
import { readAdminSession } from '../lib/admin-auth.js';
import {
  closeSupportTicketAdmin,
  getAdminSupportStats,
  getAdminSupportTicket,
  listAdminSupportTickets,
  listAdminUsers,
  markSupportTicketAdminRead,
  replySupportTicketAdmin,
  supportErrorCode,
  validTicketId,
} from '../lib/support-storage.js';

const FILTERS = new Set(['waiting', 'open', 'closed', 'all']);

function dbErrorResponse(error) {
  const code = supportErrorCode(error);
  if (code === 'support_ticket_closed') return json({ code, error: 'Ticket is closed.' }, 409);
  if (code === 'support_ticket_not_found') return json({ code, error: 'Ticket not found.' }, 404);
  if (code === 'support_invalid_message' || code === 'support_admin_invalid') return json({ code, error: 'Invalid support data.' }, 400);
  console.error('Admin support database error:', error);
  return json({ code: 'support_unavailable', error: 'Support is temporarily unavailable.' }, 503);
}

export default async (req) => {
  const admin = readAdminSession(req);
  if (!admin) return json({ authenticated: false, code: 'not_authenticated' }, 401);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const view = url.searchParams.get('view') || 'list';
    try {
      if (view === 'stats') {
        const stats = await getAdminSupportStats();
        return json({ authenticated: true, stats });
      }
      if (view === 'ticket') {
        const ticketId = url.searchParams.get('ticketId') || '';
        if (!validTicketId(ticketId)) return json({ code: 'invalid_ticket_id' }, 400);
        const detail = await getAdminSupportTicket(ticketId);
        if (!detail) return json({ code: 'support_ticket_not_found' }, 404);
        return json({ authenticated: true, ...detail });
      }
      if (view === 'users') {
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
        const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
        const users = await listAdminUsers({ limit, offset });
        return json({ authenticated: true, users });
      }
      const filter = url.searchParams.get('filter') || 'waiting';
      if (!FILTERS.has(filter)) return json({ code: 'invalid_filter' }, 400);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
      const tickets = await listAdminSupportTickets({ filter, limit, offset });
      return json({ authenticated: true, tickets });
    } catch (error) {
      return dbErrorResponse(error);
    }
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const ticketId = typeof body.ticketId === 'string' ? body.ticketId : '';
    if (!validTicketId(ticketId)) return json({ code: 'invalid_ticket_id' }, 400);
    try {
      if (action === 'read') {
        await markSupportTicketAdminRead(ticketId);
        return json({ ok: true });
      }
      if (action === 'reply') {
        const message = typeof body.message === 'string' ? body.message.trim() : '';
        if (!message || message.length > 8000) return json({ code: 'support_invalid_message' }, 400);
        const result = await replySupportTicketAdmin({ ticketId, message, adminLogin: admin.login });
        return json({ ok: true, result });
      }
      if (action === 'close') {
        await closeSupportTicketAdmin({ ticketId, adminLogin: admin.login });
        return json({ ok: true });
      }
      return json({ code: 'invalid_action' }, 400);
    } catch (error) {
      return dbErrorResponse(error);
    }
  }

  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
};

export const config = { path: '/api/admin-support' };
