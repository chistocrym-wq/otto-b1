import { bootstrapTelegramSession } from './accessClient';

export interface SupportSummary {
  unreadCount: number;
  latestTicketId: string | null;
  latestTicketNo: number | null;
}

export interface SupportTicketListItem {
  ticket_id: string;
  ticket_no: number;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_author: 'user' | 'admin';
  user_unread: boolean;
  closed_at: string | null;
}

export interface SupportMessage {
  id: string;
  author_type: 'user' | 'admin';
  body: string;
  created_at: string;
}

export interface SupportTicketDetail {
  ticket: {
    id: string;
    ticket_no: number;
    user_id: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    last_message_at: string;
    last_message_author: 'user' | 'admin';
    closed_at: string | null;
    closed_by: 'user' | 'admin' | null;
  };
  messages: SupportMessage[];
}

export class SupportRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function request(path: string, init?: RequestInit, retry = true) {
  const buildInit = () => {
    const headers = new Headers(init?.headers);
    if (init?.body) headers.set('content-type', 'application/json');
    return { ...init, credentials: 'same-origin' as const, headers };
  };

  let response = await fetch(path, buildInit());

  if (response.status === 401 && retry) {
    const session = await bootstrapTelegramSession();
    if (session.authenticated) response = await fetch(path, buildInit());
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new SupportRequestError(
      typeof data.code === 'string' ? data.code : 'support_request_failed',
      response.status,
    );
  }
  return data;
}

export async function getSupportSummary(): Promise<SupportSummary> {
  const data = await request('/api/support-ticket?view=summary');
  return {
    unreadCount: Number(data.unreadCount) || 0,
    latestTicketId: typeof data.latestTicketId === 'string' ? data.latestTicketId : null,
    latestTicketNo: data.latestTicketNo == null ? null : Number(data.latestTicketNo),
  };
}

export async function listSupportTickets(): Promise<SupportTicketListItem[]> {
  const data = await request('/api/support-ticket?view=list');
  return Array.isArray(data.tickets) ? data.tickets : [];
}

export async function getSupportTicket(ticketId: string): Promise<SupportTicketDetail> {
  const data = await request(`/api/support-ticket?view=ticket&ticketId=${encodeURIComponent(ticketId)}`);
  return { ticket: data.ticket, messages: Array.isArray(data.messages) ? data.messages : [] };
}

export async function createSupportTicket(message: string) {
  const pageUrl = window.location.href.split('?')[0];
  const userAgent = navigator.userAgent;
  return request('/api/support-ticket', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', message, pageUrl, userAgent }),
  });
}

export async function replySupportTicket(ticketId: string, message: string) {
  return request('/api/support-ticket', {
    method: 'POST',
    body: JSON.stringify({ action: 'reply', ticketId, message }),
  });
}

export async function markSupportTicketRead(ticketId: string) {
  return request('/api/support-ticket', {
    method: 'POST',
    body: JSON.stringify({ action: 'read', ticketId }),
  });
}

export async function closeSupportTicket(ticketId: string) {
  return request('/api/support-ticket', {
    method: 'POST',
    body: JSON.stringify({ action: 'close', ticketId }),
  });
}
