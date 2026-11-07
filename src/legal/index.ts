import type { LegalDocumentId } from '@/lib/legal';
import { privacyPolicy } from '@/legal/privacy';
import { personalDataConsent } from '@/legal/consent';
import { userAgreement } from '@/legal/agreement';

export const LEGAL_DOCUMENTS = {
  privacy: privacyPolicy,
  consent: personalDataConsent,
  agreement: userAgreement,
} satisfies Record<LegalDocumentId, typeof privacyPolicy | typeof personalDataConsent | typeof userAgreement>;
