'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token') || '';
    const refreshToken = params.get('refresh_token') || '';
    const providerError = params.get('error_description') || params.get('error') || '';

    if (providerError) {
      setError('تعذر تسجيل الدخول بواسطة Google. حاول مرة أخرى.');
      return;
    }

    if (!accessToken || !refreshToken) {
      setError('لم تكتمل عملية تسجيل الدخول بواسطة Google.');
      return;
    }

    history.replaceState(null, '', window.location.pathname);

    fetch('/api/auth/oauth-complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ accessToken, refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || 'تعذر إكمال تسجيل الدخول.');
        }
        router.replace('/account');
        router.refresh();
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'تعذر إكمال تسجيل الدخول.'));
  }, [router]);

  return (
    <main id="main-content" className="account-page">
      <div className="shell">
        <div className="account-loading" aria-live="polite">
          {error ? (
            <div className="auth-success auth-success--oauth-error">
              <strong>لم يكتمل تسجيل الدخول</strong>
              <p>{error}</p>
              <Link href="/account/login">العودة إلى تسجيل الدخول</Link>
            </div>
          ) : (
            <><span /><p>جاري إكمال تسجيل الدخول بواسطة Google…</p></>
          )}
        </div>
      </div>
    </main>
  );
}
