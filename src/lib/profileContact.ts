/** Only a typed, syntactically valid email may initialize the email draft. */
export function emailFromProfile(profile: { contactType?: unknown; contact?: unknown }): string {
  if (profile.contactType !== 'email' || typeof profile.contact !== 'string') return '';
  const email = profile.contact.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email) && email.length <= 254
    ? email
    : '';
}
