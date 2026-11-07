import { env } from './telegram-access.js';

const SCHEMA = 'otto_a1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function config() {
  const baseUrl = env('OTTO_SUPABASE_URL').replace(/\/+$/, '');
  const anonKey = env('OTTO_SUPABASE_ANON_KEY');
  const token = env('OTTO_SUPABASE_TOKEN');
  if (!baseUrl || !anonKey || !token) throw new Error('otto_supabase_not_configured');
  return { baseUrl, anonKey, token };
}

function makeError(response, payload) {
  const message = typeof payload?.message === 'string' && payload.message
    ? payload.message
    : 'otto_supabase_request_failed';
  const error = new Error(message);
  error.status = response.status;
  error.payload = payload;
  return error;
}

async function request(path, { method = 'GET', body, prefer } = {}) {
  const { baseUrl, anonKey, token } = config();
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    'Accept-Profile': SCHEMA,
    'Content-Profile': SCHEMA,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw makeError(response, payload);
  return payload;
}

async function rpc(name, body = {}) {
  return request(`/rest/v1/rpc/${name}`, { method: 'POST', body });
}

export function validTicketId(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function supportErrorCode(error) {
  const message = String(error?.message || error?.payload?.message || '');
  const known = [
    'support_daily_limit',
    'support_invalid_message',
    'support_ticket_not_found',
    'support_ticket_forbidden',
    'support_ticket_closed',
    'support_message_rate_limit',
    'support_admin_invalid',
  ];
  return known.find((code) => message.includes(code)) || null;
}

export async function createSupportTicket({ userId, message, pageUrl = '', userAgent = '' }) {
  const rows = await rpc('create_support_ticket', {
    p_user_id: String(userId),
    p_message: String(message),
    p_page_url: String(pageUrl || ''),
    p_user_agent: String(userAgent || ''),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function listUserSupportTickets(userId) {
  const rows = await rpc('support_user_list', { p_user_id: String(userId) });
  return Array.isArray(rows) ? rows : [];
}

export async function getUserSupportSummary(userId) {
  const rows = await rpc('support_user_summary', { p_user_id: String(userId) });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function getUserSupportTicket(userId, ticketId) {
  if (!validTicketId(ticketId)) return null;
  const ticketParams = new URLSearchParams({
    select: 'id,ticket_no,user_id,status,created_at,updated_at,last_message_at,last_message_author,closed_at,closed_by',
    id: `eq.${ticketId}`,
    user_id: `eq.${String(userId)}`,
    limit: '1',
  });
  const rows = await request(`/rest/v1/support_tickets?${ticketParams.toString()}`);
  const ticket = Array.isArray(rows) ? rows[0] : null;
  if (!ticket) return null;

  const messageParams = new URLSearchParams({
    select: 'id,author_type,body,created_at',
    ticket_id: `eq.${ticketId}`,
    order: 'created_at.asc,id.asc',
  });
  const messages = await request(`/rest/v1/support_messages?${messageParams.toString()}`);
  return { ticket, messages: Array.isArray(messages) ? messages : [] };
}

export async function replySupportTicketUser({ userId, ticketId, message }) {
  const rows = await rpc('reply_support_ticket_user', {
    p_user_id: String(userId),
    p_ticket_id: String(ticketId),
    p_message: String(message),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function markSupportTicketUserRead({ userId, ticketId }) {
  await rpc('mark_support_ticket_user_read', {
    p_user_id: String(userId),
    p_ticket_id: String(ticketId),
  });
}

export async function closeSupportTicketUser({ userId, ticketId }) {
  await rpc('close_support_ticket_user', {
    p_user_id: String(userId),
    p_ticket_id: String(ticketId),
  });
}

export async function getAdminSupportStats() {
  const rows = await rpc('support_admin_stats', {});
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function listAdminSupportTickets({ filter = 'waiting', limit = 50, offset = 0 }) {
  const rows = await rpc('support_admin_list', {
    p_filter: filter,
    p_limit: limit,
    p_offset: offset,
  });
  return Array.isArray(rows) ? rows : [];
}

export async function listAdminUsers({ limit = 50, offset = 0 }) {
  const rows = await rpc('support_admin_users', {
    p_limit: limit,
    p_offset: offset,
  });
  return Array.isArray(rows) ? rows : [];
}

export async function getAdminSupportTicket(ticketId) {
  if (!validTicketId(ticketId)) return null;
  const ticketParams = new URLSearchParams({
    select: 'id,ticket_no,user_id,status,created_at,updated_at,last_message_at,last_message_author,closed_at,closed_by,closed_by_admin,page_url,user_agent',
    id: `eq.${ticketId}`,
    limit: '1',
  });
  const rows = await request(`/rest/v1/support_tickets?${ticketParams.toString()}`);
  const ticket = Array.isArray(rows) ? rows[0] : null;
  if (!ticket) return null;

  const profileParams = new URLSearchParams({
    select: 'name',
    user_id: `eq.${String(ticket.user_id)}`,
    limit: '1',
  });
  const messageParams = new URLSearchParams({
    select: 'id,author_type,body,admin_login,created_at',
    ticket_id: `eq.${ticketId}`,
    order: 'created_at.asc,id.asc',
  });
  const [profiles, messages] = await Promise.all([
    request(`/rest/v1/user_profiles?${profileParams.toString()}`),
    request(`/rest/v1/support_messages?${messageParams.toString()}`),
  ]);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  return {
    ticket: { ...ticket, user_name: profile?.name || 'Без имени' },
    messages: Array.isArray(messages) ? messages : [],
  };
}

export async function replySupportTicketAdmin({ ticketId, message, adminLogin }) {
  const rows = await rpc('reply_support_ticket_admin', {
    p_ticket_id: String(ticketId),
    p_message: String(message),
    p_admin_login: String(adminLogin),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function markSupportTicketAdminRead(ticketId) {
  await rpc('mark_support_ticket_admin_read', { p_ticket_id: String(ticketId) });
}

export async function closeSupportTicketAdmin({ ticketId, adminLogin }) {
  await rpc('close_support_ticket_admin', {
    p_ticket_id: String(ticketId),
    p_admin_login: String(adminLogin),
  });
}
