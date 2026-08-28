const arabicIndicDigits = '٠١٢٣٤٥٦٧٨٩';
const easternArabicDigits = '۰۱۲۳۴۵۶۷۸۹';

function toAsciiDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabicIndicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabicDigits.indexOf(digit)));
}

export function normalizeEgyptianPhone(value: unknown) {
  if (typeof value !== 'string') return '';

  let normalized = toAsciiDigits(value.trim())
    .replace(/[\s().\-]/g, '')
    .replace(/^00/, '+');

  if (!normalized) return '';

  if (normalized.startsWith('+20')) {
    normalized = `0${normalized.slice(3).replace(/^0/, '')}`;
  } else if (/^20\d+$/.test(normalized)) {
    normalized = `0${normalized.slice(2).replace(/^0/, '')}`;
  }

  return normalized;
}

export function isValidEgyptianMobile(value: unknown) {
  const normalized = normalizeEgyptianPhone(value);
  return /^01[0125]\d{8}$/.test(normalized);
}

export function isValidEgyptianPhone(value: unknown) {
  const normalized = normalizeEgyptianPhone(value);
  if (!normalized) return false;
  return isValidEgyptianMobile(normalized) || /^0[2-9]\d{7,8}$/.test(normalized);
}

export function normalizeGoogleMapsUrl(value: unknown) {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';

    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();

    const mapsApp = host === 'maps.app.goo.gl';
    const legacyShort = host === 'goo.gl' && path.startsWith('/maps');
    const googleMapsHost = host === 'maps.google.com' || host.endsWith('.maps.google.com');
    const googleMapsPath = (host === 'google.com' || host.endsWith('.google.com')) && path.startsWith('/maps');

    return mapsApp || legacyShort || googleMapsHost || googleMapsPath ? url.toString() : '';
  } catch {
    return '';
  }
}

export type BusinessSubmissionValidationInput = {
  businessName: string;
  category: string;
  village: string;
  locationDetails: string;
  phone: string;
  whatsapp: string;
  googleMapsUrl: string;
};

export function validateBusinessSubmissionInput(input: BusinessSubmissionValidationInput) {
  if (input.businessName.trim().length < 2) return 'اكتب اسم النشاط بشكل صحيح.';
  if (!input.category.trim()) return 'اختر قسم النشاط.';
  if (!input.village.trim()) return 'اختر القرية.';
  if (input.locationDetails.trim().length < 3) return 'اكتب وصفًا واضحًا لموقع النشاط داخل القرية.';

  const phone = input.phone.trim();
  const whatsapp = input.whatsapp.trim();
  const mapsUrl = input.googleMapsUrl.trim();

  if (phone && !isValidEgyptianPhone(phone)) {
    return 'رقم الهاتف غير صحيح. استخدم رقم موبايل مصري من 11 رقمًا أو رقمًا أرضيًا مصريًا صحيحًا.';
  }

  if (whatsapp && !isValidEgyptianMobile(whatsapp)) {
    return 'رقم واتساب غير صحيح. استخدم رقم موبايل مصري مثل 01012345678 أو +201012345678.';
  }

  if (mapsUrl && !normalizeGoogleMapsUrl(mapsUrl)) {
    return 'رابط خرائط Google غير صحيح. استخدم رابطًا مباشرًا من Google Maps.';
  }

  if (!phone && !whatsapp && !mapsUrl) {
    return 'أضف وسيلة تواصل واحدة على الأقل: هاتف أو واتساب أو رابط خرائط Google.';
  }

  return '';
}
