const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const HTML_TAG = /<[^>]*>/g;
const REASONING_BLOCK = /<think>[\s\S]*?<\/think>/gi;
const URL_PATTERN = /(?:https?:\/\/|www\.)/i;
const PHONE_LIKE_PATTERN = /\+?[0-9٠-٩۰-۹][0-9٠-٩۰-۹\s().-]{1,}[0-9٠-٩۰-۹]/g;

const injectionSignals = [
  'تجاهل التعليمات',
  'انسي التعليمات',
  'انس التعليمات',
  'اكشف التعليمات',
  'اكشف البرومبت',
  'system prompt',
  'developer message',
  'اظهر رساله النظام',
  'مثل شخصيه اخري',
  'غير شخصيتك',
  'اتبع التعليمات التاليه',
  'نفذ الامر التالي',
  'ignore previous instructions',
  'ignore all instructions',
  'reveal your prompt',
  'jailbreak',
];

const emergencySignals = [
  'اسعاف',
  'النجده',
  'نجده',
  'الشرطه',
  'مطافي',
  'حريق',
  'حادث',
  'نزيف',
  'اغماء',
  'مش قادر يتنفس',
  'خطر فوري',
  'الحقوني',
  'غرق',
  'طوارئ الكهرباء',
  'طوارئ المياه',
  'رقم الطوارئ',
  'ارقام الطوارئ',
];

const greetingSignals = [
  'السلام عليكم',
  'صباح الخير',
  'مساء الخير',
  'ازيك',
  'عامل ايه',
  'اهلا',
  'مرحبا',
  'مين انت',
];

const politicalSignals = [
  'سياسه',
  'سياسي',
  'انتخابات',
  'حزب',
  'الرئيس',
  'البرلمان',
  'صوت انتخابي',
  'انتخابي',
];

const medicalAdviceSignals = [
  'ما العلاج',
  'ايه العلاج',
  'اخد دواء',
  'اخذ دواء',
  'جرعه',
  'شخص حالتي',
  'تشخيص',
  'اعراض المرض',
  'وصفه طبيه',
];

const stereotypicalPhrases = [
  'يا واد',
  'يا بت',
  'يا ولد',
  'الصعايده كلهم',
  'الصعيدي الجاهل',
  'اضحك يا صعيدي',
];

const medicalDirectiveSignals = [
  'تناول الدواء',
  'خد الدواء',
  'خذ الدواء',
  'جرعتك',
  'تشخيصك هو',
  'لا تحتاج طبيب',
];

function toAsciiDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeSandSignal(value: string) {
  return toAsciiDigits(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanSandText(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

function includesSignal(value: string, signals: string[]) {
  return signals.some((signal) => value.includes(normalizeSandSignal(signal)));
}

export type SandMessageClassification = {
  normalized: string;
  promptInjection: boolean;
  emergency: boolean;
  greeting: boolean;
  political: boolean;
  medicalAdvice: boolean;
};

export function classifySandMessage(value: string): SandMessageClassification {
  const normalized = normalizeSandSignal(value);
  return {
    normalized,
    promptInjection: includesSignal(normalized, injectionSignals),
    emergency: includesSignal(normalized, emergencySignals),
    greeting: normalized.length <= 40 && includesSignal(normalized, greetingSignals),
    political: includesSignal(normalized, politicalSignals),
    medicalAdvice: includesSignal(normalized, medicalAdviceSignals),
  };
}

export function cleanGroundingValue(value: unknown, maxLength = 220) {
  const clean = cleanSandText(value, maxLength).replace(HTML_TAG, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const normalized = normalizeSandSignal(clean);
  if (includesSignal(normalized, injectionSignals)) return '[نص محجوب للمراجعة]';
  return clean;
}

function compactNumber(value: string) {
  return toAsciiDigits(value).replace(/[^\d+]/g, '');
}

export function validateSandGeneratedText(raw: unknown, allowedNumbers: string[] = []) {
  if (typeof raw !== 'string') return { ok: false as const, reason: 'not_text', text: '' };

  const text = raw
    .replace(REASONING_BLOCK, '')
    .replace(HTML_TAG, ' ')
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text || text.length > 900) return { ok: false as const, reason: 'length', text: '' };
  if (URL_PATTERN.test(text)) return { ok: false as const, reason: 'url', text: '' };

  const normalized = normalizeSandSignal(text);
  if (includesSignal(normalized, injectionSignals)) {
    return { ok: false as const, reason: 'prompt_leakage', text: '' };
  }
  if (includesSignal(normalized, stereotypicalPhrases)) {
    return { ok: false as const, reason: 'stereotype', text: '' };
  }
  if (includesSignal(normalized, medicalDirectiveSignals)) {
    return { ok: false as const, reason: 'medical_advice', text: '' };
  }

  const allowed = new Set(allowedNumbers.map(compactNumber).filter(Boolean));
  for (const match of text.match(PHONE_LIKE_PATTERN) || []) {
    const number = compactNumber(match);
    if (number.replace(/\D/g, '').length >= 3 && !allowed.has(number)) {
      return { ok: false as const, reason: 'unknown_number', text: '' };
    }
  }

  return { ok: true as const, reason: 'ok', text };
}
