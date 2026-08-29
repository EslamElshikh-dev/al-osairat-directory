export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_POLICY_VERSION = 2;
export const PASSWORD_POLICY_LAUNCHED_AT = '2026-08-29T00:16:00.000Z';

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
  'abcdef1234',
  'user123456',
  '123456789a',
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
  longEnoughForBestStrength: boolean;
  message: string;
  suggestion: string;
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
  const longEnoughForBestStrength = password.length >= 12;
  const valid = length && letter && number && uncommon;

  let rawScore = 0;
  if (length) rawScore += 1;
  if (letter && number) rawScore += 1;
  if (longEnoughForBestStrength) rawScore += 1;
  if (hasSymbol && uncommon) rawScore += 1;
  const score = Math.min(4, rawScore) as 0 | 1 | 2 | 3 | 4;

  const label = score <= 1 ? 'ضعيفة' : score === 2 ? 'مقبولة' : score === 3 ? 'جيدة' : 'قوية جدًا';

  let message = '';
  if (!length) message = `استخدم ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`;
  else if (!letter) message = 'أضف حرفًا واحدًا على الأقل.';
  else if (!number) message = 'أضف رقمًا واحدًا على الأقل.';
  else if (!uncommon) message = 'اختر كلمة مرور أقل شيوعًا وصعب تخمينها.';
  else message = 'كلمة المرور تستوفي متطلبات الأمان.';

  let suggestion = `ابدأ بكلمة مرور من ${PASSWORD_MIN_LENGTH} أحرف أو أكثر تجمع بين الحروف والأرقام.`;
  if (password) {
    if (!length) {
      const remaining = Math.max(1, PASSWORD_MIN_LENGTH - password.length);
      suggestion = `أضف ${remaining} ${remaining === 1 ? 'حرفًا' : 'أحرف'} أخرى على الأقل لبلوغ الحد الآمن.`;
    } else if (!letter) suggestion = 'أضف حرفًا واحدًا على الأقل حتى لا تكون كلمة المرور رقمية فقط.';
    else if (!number) suggestion = 'أضف رقمًا واحدًا على الأقل لزيادة صعوبة التخمين.';
    else if (!uncommon) suggestion = 'هذه الصيغة شائعة وسهلة التخمين؛ استخدم تركيبة خاصة بك بدلًا منها.';
    else if (!longEnoughForBestStrength && !hasSymbol) suggestion = 'ممتاز كبداية — اجعلها 12 حرفًا وأضف رمزًا خاصًا للوصول لقوة أعلى.';
    else if (!longEnoughForBestStrength) suggestion = `أضف ${12 - password.length} ${12 - password.length === 1 ? 'حرفًا' : 'أحرف'} للوصول لمستوى أقوى.`;
    else if (!hasSymbol) suggestion = 'أضف رمزًا خاصًا مثل ! أو # أو @ لرفع القوة إلى المستوى الأعلى.';
    else suggestion = 'اختيار قوي جدًا. احتفظ بها في مدير كلمات مرور ولا تستخدمها في موقع آخر.';
  }

  return {
    valid,
    score,
    label,
    requirements: { length, letter, number, uncommon },
    hasSymbol,
    longEnoughForBestStrength,
    message,
    suggestion,
  };
}

export function passwordPolicyError(password: string) {
  const result = evaluatePassword(password);
  return result.valid ? '' : result.message;
}
