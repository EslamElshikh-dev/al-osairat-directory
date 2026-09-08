import type { Metadata } from 'next';
import '../password-strength.css';
import '../auth-security-ux.css';
import '../auth-google.css';
import '../member-profile.css';
import '../business-submissions.css';
import '../ownership-claims.css';
import '../my-businesses.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
