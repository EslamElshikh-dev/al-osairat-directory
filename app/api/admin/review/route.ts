import { NextResponse } from 'next/server';
import { categories, listings } from '@/lib/data';
import { SUPABASE_URL, sameOrigin } from '@/lib/auth/supabase-rest';
import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReviewStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';

type SubmissionRow = {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  sub_category: string | null;
  village: string;
  locality: string | null;
  location_details: string;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  description: string | null;
  google_maps_url: string | null;
  status: ReviewStatus;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

type ClaimRow = {
  id: string;
  user_id: string;
  listing_id: string;
  relationship: string;
  phone: string;
  proof_method: string;
  proof_details: string;
  status: ReviewStatus;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  village: string | null;
  locality: string | null;
};

type OwnershipRow = {
  listing_id: string;
  user_id: string;
  relationship: string;
  claim_id: string;
  approved_at: string;
};

const categoryLabels = new Map<string, string>(categories.map((item) => [item.id, item.shortLabel]));
const listingIndex = new Map(listings.map((item) => [item.id, item]));
const statuses = new Set<string>(['pending', 'needs_changes', 'approved', 'rejected']);

async function readRows<T>(path: string, accessToken: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: adminRestHeaders(accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`ADMIN_READ_FAILED:${path}`);
  return response.json() as Promise<T[]>;
}

function cleanNote(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 1200);
}

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بالدخول إلى لوحة الإدارة.' }, { status: 403 });

  try {
    const [submissions, claims, ownerships, profiles] = await Promise.all([
      readRows<SubmissionRow>('business_submissions?select=id,user_id,business_name,category,sub_category,village,locality,location_details,phone,whatsapp,hours,description,google_maps_url,status,review_note,created_at,updated_at,reviewed_at&order=created_at.desc', session.accessToken),
      readRows<ClaimRow>('business_ownership_claims?select=id,user_id,listing_id,relationship,phone,proof_method,proof_details,status,review_note,created_at,updated_at,reviewed_at&order=created_at.desc', session.accessToken),
      readRows<OwnershipRow>('listing_ownerships?select=listing_id,user_id,relationship,claim_id,approved_at&order=approved_at.desc', session.accessToken),
      readRows<ProfileRow>('profiles?select=id,full_name,phone,village,locality', session.accessToken).catch(() => []),
    ]);

    const profileIndex = new Map(profiles.map((profile) => [profile.id, profile]));
    const serializedSubmissions = submissions.map((row) => ({
      id: row.id,
      userId: row.user_id,
      memberName: profileIndex.get(row.user_id)?.full_name?.trim() || 'عضو الدليل',
      businessName: row.business_name,
      category: row.category,
      categoryLabel: categoryLabels.get(row.category) || row.category,
      subCategory: row.sub_category || '',
      village: row.village,
      locality: row.locality || '',
      locationDetails: row.location_details,
      phone: row.phone || '',
      whatsapp: row.whatsapp || '',
      hours: row.hours || '',
      description: row.description || '',
      googleMapsUrl: row.google_maps_url || '',
      status: row.status,
      reviewNote: row.review_note || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
    }));

    const serializedClaims = claims.map((row) => {
      const listing = listingIndex.get(row.listing_id);
      return {
        id: row.id,
        userId: row.user_id,
        memberName: profileIndex.get(row.user_id)?.full_name?.trim() || 'عضو الدليل',
        listingId: row.listing_id,
        listing: listing ? {
          slug: listing.slug,
          title: listing.title,
          categoryLabel: categoryLabels.get(listing.category) || listing.category,
          village: listing.village,
          location: listing.location,
          publishedPhone: listing.phone || '',
        } : null,
        relationship: row.relationship,
        phone: row.phone,
        proofMethod: row.proof_method,
        proofDetails: row.proof_details,
        status: row.status,
        reviewNote: row.review_note || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reviewedAt: row.reviewed_at,
      };
    });

    return adminJson({
      admin: {
        displayName: session.displayName,
        avatarUrl: session.avatarUrl,
      },
      stats: {
        pendingSubmissions: submissions.filter((item) => item.status === 'pending' || item.status === 'needs_changes').length,
        pendingClaims: claims.filter((item) => item.status === 'pending' || item.status === 'needs_changes').length,
        approvedOwnerships: ownerships.length,
        totalSubmissions: submissions.length,
        totalClaims: claims.length,
      },
      submissions: serializedSubmissions,
      claims: serializedClaims,
      ownerships,
    }, session);
  } catch {
    return adminJson({ error: 'تعذر تحميل بيانات لوحة الإدارة الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بتنفيذ هذا الإجراء.' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const kind = typeof body?.kind === 'string' ? body.kind : '';
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  const status = typeof body?.status === 'string' ? body.status.trim() : '';
  const note = cleanNote(body?.note);

  if (!['submission', 'claim'].includes(kind) || !id || !statuses.has(status)) {
    return adminJson({ error: 'بيانات المراجعة غير صحيحة.' }, session, 400);
  }
  if ((status === 'needs_changes' || status === 'rejected') && note.length < 3) {
    return adminJson({ error: 'أضف ملاحظة واضحة للعضو عند طلب الاستكمال أو الرفض.' }, session, 400);
  }

  const rpc = kind === 'submission' ? 'review_business_submission' : 'review_ownership_claim';
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: adminRestHeaders(session.accessToken, true),
      body: JSON.stringify({ p_id: id, p_status: status, p_note: note || null }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('ADMIN_REVIEW_FAILED');
    const result = await response.json();
    return adminJson({ saved: true, result }, session);
  } catch {
    return adminJson({ error: 'تعذر حفظ قرار المراجعة الآن.' }, session, 500);
  }
}
