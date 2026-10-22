'use server';
// The Banner's dismiss is a Server Action (BannerDismiss's onDismiss): a cookie remembers it, and
// the page stops rendering the Banner. The Banner never hides itself.
import { cookies } from 'next/headers';

export async function dismissBanner() {
  (await cookies()).set('nz-fixture-banner', 'dismissed', { path: '/dashboard', sameSite: 'lax' });
}
