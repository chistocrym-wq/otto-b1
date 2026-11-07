export const LEGAL_DOCUMENT_VERSION = '2026-09-23-v1';

export type LegalDocumentId = 'privacy' | 'consent' | 'agreement';
export type LegalChannel = 'web' | 'pwa' | 'telegram';

export function getLegalChannel(): LegalChannel {
  if (window.Telegram?.WebApp?.initData) return 'telegram';
  try {
    if (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    ) return 'pwa';
  } catch {
    // Fall through to web.
  }
  return 'web';
}

export function legalAcceptancePayload() {
  return {
    accepted: true,
    documentVersion: LEGAL_DOCUMENT_VERSION,
    acceptanceMethod: 'checkbox+button',
    channel: getLegalChannel(),
  };
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
}
