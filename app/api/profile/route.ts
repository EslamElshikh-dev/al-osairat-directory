import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { villages } from '@/lib/data';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  authCookieBase,
  getUser,
  mapMember,
  refreshSession,
  sameOrigin,
  updateUserMetadata,
} from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  village: string | null;
  locality: string | null;
  updated_at: string;
};

type PublicProfileRow = {
  slug: string;
  bio: string | null;
  show_location: boolean;
  is_public: boolean;
  updated_at: string;
};

type ResolvedSession = {
  accessToken: string;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

function restHeaders(accessToken: string, json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function resolveSession(): Promise<ResolvedSession | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;

  if (accessToken) {
    try {
      const member = mapMember(await getUser(accessToken));
      return {
        accessToken,
        userId: member.localId,
        displayName: member.displayName,
        email: member.email,
        avatarUrl: member.avatarUrl,
      };
    } catch {
      // Try refresh token below.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const member = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: member.localId,
      displayName: member.displayName,
      email: member.email,
      avatarUrl: member.avatarUrl,
      refreshed: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in || 3600,
      },
    };
  } catch {
    return null;
  }
}

function respond(payload: unknown, session: ResolvedSession | null, status = 200) {
  const response = NextResponse.json(payload, { status });
  if (session?.refreshed) {
    response.cookies.set(AUTH_ACCESS_COOKIE, session.refreshed.accessToken, {
      ...authCookieBase,
      maxAge: Math.max(300, session.refreshed.expiresIn - 60),
    });
    response.cookies.set(AUTH_REFRESH_COOKIE, session.refreshed.refreshToken, {
      ...authCookieBase,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

async function readProfile(accessToken: string, userId: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,full_name,avatar_url,phone,village,locality,updated_at&limit=1`,
    { headers: restHeaders(accessToken), cache: 'no-store' },
  );
  if (!response.ok) throw new Error('PROFILE_READ_FAILED');
  const rows = await response.json() as ProfileRow[];
  return rows[0] || null;
}

async function readPublicProfile(accessToken: string, userId: string) {
  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: 'slug,bio,show_location,is_public,updated_at',
    limit: '1',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/member_public_profiles?${query}`, {
    headers: restHeaders(accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('PUBLIC_PROFILE_READ_FAILED');
  const rows = await response.json() as PublicProfileRow[];
  return rows[0] || null;
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizePhone(value: unknown) {
  const raw = cleanText(value, 32);
  if (!raw) return '';
  return raw.replace(/[\s()\-]/g, '');
}

export async function GET() {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  try {
    const [profile, publicProfile] = await Promise.all([
      readProfile(session.accessToken, session.userId),
      readPublicProfile(session.accessToken, session.userId),
    ]);
    return respond({
      profile: {
        fullName: profile?.full_name?.trim() || session.displayName,
        avatarUrl: profile?.avatar_url?.trim() || session.avatarUrl,
        phone: profile?.phone || '',
        village: profile?.village || '',
        locality: profile?.locality || '',
        email: session.email,
        bio: publicProfile?.bio || '',
        isPublic: Boolean(publicProfile?.is_public),
        showLocation: Boolean(publicProfile?.show_location),
        publicSlug: publicProfile?.slug || '',
        publicUrl: publicProfile?.slug ? `/members/${publicProfile.slug}` : '',
        updatedAt: profile?.updated_at || publicProfile?.updated_at || null,
      },
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل بيانات العضو الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fullName = cleanText(body?.fullName, 80);
  const phone = normalizePhone(body?.phone);
  const village = cleanText(body?.village, 80);
  const locality = cleanText(body?.locality, 100);
  const bio = cleanText(body?.bio, 320);
  const isPublic = body?.isPublic === true;
  const showLocation = body?.showLocation === true;

  if (fullName.length < 2) {
    return respond({ error: 'اكتب الاسم الكامل بشكل صحيح.' }, session, 400);
  }

  if (phone && !/^\+?\d{7,15}$/.test(phone)) {
    return respond({ error: 'رقم الجوال غير صحيح. استخدم أرقامًا فقط مع رمز الدولة عند الحاجة.' }, session, 400);
  }

  const allowedVillages = new Set(villages.map((item) => item.name));
  if (village && !allowedVillages.has(village)) {
    return respond({ error: 'اختر قرية من قائمة قرى العسيرات.' }, session, 400);
  }

  if (!village && locality) {
    return respond({ error: 'اختر القرية أولًا قبل كتابة التابع أو النجع.' }, session, 400);
  }

  if (bio && bio.length < 2) {
    return respond({ error: 'اكتب نبذة من حرفين على الأقل أو اتركها فارغة.' }, session, 400);
  }

  let authUpdated = false;
  try {
    await updateUserMetadata(session.accessToken, { full_name: fullName });
    authUpdated = true;

    const safeAvatarUrl = /^https:\/\//i.test(session.avatarUrl) ? session.avatarUrl.slice(0, 500) : null;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
      method: 'POST',
      headers: {
        ...restHeaders(session.accessToken, true),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: session.userId,
        full_name: fullName,
        avatar_url: safeAvatarUrl,
        phone: phone || null,
        village: village || null,
        locality: village ? (locality || null) : null,
      }),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error('PROFILE_UPDATE_FAILED');
    const rows = await response.json() as ProfileRow[];
    const profile = rows[0];

    const publicQuery = new URLSearchParams({ user_id: `eq.${session.userId}` });
    const publicResponse = await fetch(`${SUPABASE_URL}/rest/v1/member_public_profiles?${publicQuery}`, {
      method: 'PATCH',
      headers: {
        ...restHeaders(session.accessToken, true),
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        bio: bio || null,
        is_public: isPublic,
        show_location: showLocation && Boolean(village),
      }),
      cache: 'no-store',
    });
    if (!publicResponse.ok) throw new Error('PUBLIC_PROFILE_UPDATE_FAILED');
    const publicRows = await publicResponse.json() as PublicProfileRow[];
    const publicProfile = publicRows[0];

    return respond({
      saved: true,
      profile: {
        fullName,
        avatarUrl: profile?.avatar_url?.trim() || session.avatarUrl,
        phone,
        village,
        locality: village ? locality : '',
        email: session.email,
        bio,
        isPublic,
        showLocation: showLocation && Boolean(village),
        publicSlug: publicProfile?.slug || '',
        publicUrl: publicProfile?.slug ? `/members/${publicProfile.slug}` : '',
        updatedAt: profile?.updated_at || publicProfile?.updated_at || null,
      },
    }, session);
  } catch {
    if (authUpdated && session.displayName !== fullName) {
      await updateUserMetadata(session.accessToken, { full_name: session.displayName }).catch(() => null);
    }
    return respond({ error: 'تعذر حفظ بيانات العضو الآن. حاول مرة أخرى.' }, session, 500);
  }
}
