import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';

export type LocalJob = {
  id: string;
  kind: 'offer' | 'seeker';
  origin: 'community' | 'external';
  title: string;
  organization: string | null;
  village: string;
  field: string;
  description: string;
  experience: string | null;
  work_type: 'full-time' | 'part-time' | 'temporary' | 'flexible' | null;
  contact_kind: 'phone' | 'whatsapp' | 'email' | 'link';
  contact_value: string;
  source_name: string | null;
  source_url: string | null;
  published_at: string;
  expires_at: string;
};

export async function getLocalJobs(): Promise<{ jobs: LocalJob[]; available: boolean }> {
  try {
    const params = new URLSearchParams({
      select: 'id,kind,origin,title,organization,village,field,description,experience,work_type,contact_kind,contact_value,source_name,source_url,published_at,expires_at',
      status: 'eq.approved',
      expires_at: `gt.${new Date().toISOString()}`,
      order: 'published_at.desc',
      limit: '250',
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/osairat_jobs?${params}`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('JOBS_UNAVAILABLE');
    return { jobs: await response.json() as LocalJob[], available: true };
  } catch {
    return { jobs: [], available: false };
  }
}
