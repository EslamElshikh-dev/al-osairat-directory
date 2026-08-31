'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function completeOAuth() {
      // Defer state transitions beyond the effect's synchronous setup phase.
      await Promise.resolve();
      if (!active) return;

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

      try {
        const response = await fetch('/api/auth/oauth-complete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ accessToken, refreshToken }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || 'تعذر إكمال تسجيل الدخول.');
        }

        if (!active) return;
        router.replace('/account');
        router.refresh();
      } catch (reason) {
        if (!active || controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'تعذر إكمال تسجيل الدخول.');
      }
    }

    void completeOAuth();

    return () => {
      active = false;
      controller.abort();
    };
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
            <><span /><p>جارٍ إكمال تسجيل الدخول بواسطة Google…</p></>
          )}
        </div>
      </div>
    </main>
  );
}
