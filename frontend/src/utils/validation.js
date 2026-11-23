export const PERU_PHONE_PREFIX = '+51';

const NAME_PATTERN = /^[\p{L}]+(?: [\p{L}]+)*$/u;
const DNI_PATTERN = /^\d{8}$/;
const EMAIL_LOCAL_PATTERN = /^[A-Za-z0-9._%+-]+$/;
const PHONE_LOCAL_PATTERN = /^\d{9}$/;

export const NAME_INPUT_PATTERN = '[\\p{L}]+( [\\p{L}]+)*';

export const isValidPersonName = (value) => NAME_PATTERN.test(String(value || '').trim());
export const isValidDni = (value) => DNI_PATTERN.test(String(value || '').trim());
export const isValidEmailLocal = (value) => EMAIL_LOCAL_PATTERN.test(String(value || '').trim());
export const isValidPeruPhoneLocal = (value) => PHONE_LOCAL_PATTERN.test(String(value || '').replace(/\D/g, ''));

export function tenantDomainFrom(identifier) {
  const slug = String(identifier || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .replace(/\.com$/, '');
  return slug ? `${slug}.com` : '';
}

export function emailLocalPart(email, domain) {
  const value = String(email || '');
  const suffix = domain ? `@${domain}`.toLowerCase() : '@';
  return value.toLowerCase().endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}

export function composeEmail(localPart, domain) {
  if (!localPart || !domain) return '';
  return `${String(localPart).trim().toLowerCase()}@${domain}`;
}

export function phoneLocalPart(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('51')) return digits.slice(2);
  return digits;
}

export function composePeruPhone(localPart) {
  if (!localPart) return '';
  return `${PERU_PHONE_PREFIX}${String(localPart).replace(/\D/g, '')}`;
}
