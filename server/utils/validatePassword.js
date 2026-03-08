/**
 * Password strength validator — V-13 fix
 * Enforces minimum 12 characters with complexity requirements.
 */
export function validatePassword(pw) {
  if (!pw || pw.length < 12) return 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل';
  if (!/[A-Z]/.test(pw)) return 'كلمة المرور يجب أن تحتوي على حرف كبير (A-Z)';
  if (!/[a-z]/.test(pw)) return 'كلمة المرور يجب أن تحتوي على حرف صغير (a-z)';
  if (!/[0-9]/.test(pw)) return 'كلمة المرور يجب أن تحتوي على رقم';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'كلمة المرور يجب أن تحتوي على رمز خاص (!@#$%...)';
  return null;
}
