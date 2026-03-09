import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // V-01: onLogin triggers AuthContext.login → httpOnly cookie set by server
      await onLogin(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            نظام تقييم النضج الرقمي
          </h1>
          <p className="text-primary-100 text-lg">
            والأمن السيبراني
          </p>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            تسجيل الدخول
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="example@gov.iq"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-lg py-3 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="spinner w-5 h-5 ml-2"></div>
                  جاري التحميل...
                </>
              ) : (
                'دخول'
              )}
            </button>
          </form>

        </div>

        <p className="text-center text-white text-sm mt-6 opacity-90">
          © {new Date().getFullYear()} جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
