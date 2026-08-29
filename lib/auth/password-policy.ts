export const PASSWORD_MIN_LENGTH = 10;

const COMMON_PASSWORDS = new Set([
  'password123',
  'password1234',
  'qwerty12345',
  'qwerty123456',
  'admin12345',
  'welcome123',
  'letmein123',
  'iloveyou123',
  'abc1234567',
  'user123456',
]);

export type PasswordPolicyResult = {
  valid: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: 'ضعيفة' | 'مقبولة' | 'جيدة' | 'قوية جدًا';
  requirements: {
    length: boolean;
    letter: boolean;
    number: boolean;
    uncommon: boolean;
  };
  hasSymbol: boolean;
  message: string;
};

function normalizedForComparison(password: string) {
  return password.normalize('NFKC').trim().toLowerCase();
}

export function evaluatePassword(password: string): PasswordPolicyResult {
  const length = password.length >= PASSWORD_MIN_LENGTH;
  const letter = /\p{L}/u.test(password);
  const number = /\p{N}/u.test(password);
  const uncommon = password.length > 0 && !COMMON_PASSWORDS.has(normalizedForComparison(password));
  const hasSymbol = /[^\p{L}\p{N}\s]/u.test(password);
  const valid = length && letter && number && uncommon;

  let rawScore = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) rawScore += 1;
  if (letter && number) rawScore += 1;
  if (password.length >= 12) rawScore += 1;
  if (hasSymbol && uncommon) rawScore += 1;
  const score = Math.min(4, rawScore) as 0 | 1 | 2 | 3 | 4;

  const label = score <= 1 ? 'ضعيفة' : score === 2 ? 'مقبولة' : score === 3 ? 'جيدة' : 'قوية جدًا';

  let message = '';
  if (!length) message = `استخدم ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`;
  else if (!letter) message = 'أضف حرفًا واحدًا على الأقل.';
  else if (!number) message = 'أضف رقمًا واحدًا على الأقل.';
  else if (!uncommon) message = 'اختر كلمة مرور أقل شيوعًا وصعب تخمينها.';
  else message = 'كلمة المرور تستوفي متطلبات الأمان.';

  return {
    valid,
    score,
    label,
    requirements: { length, letter, number, uncommon },
    hasSymbol,
    message,
  };
}

export function passwordPolicyError(password: string) {
  const result = evaluatePassword(password);
  return result.valid ? '' : result.message;
}
