export type SandMode = 'groq' | 'cloudflare' | 'direct' | 'emergency';

export type SandChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export type SandResult = {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  village: string;
  location: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  hours?: string;
  href: string;
  sourceLabel: string;
  lastUpdatedAt?: string;
};

export type SandGrounding = {
  source: 'supabase' | 'local_snapshot' | 'static_emergency';
  query: string;
  total: number;
  results: SandResult[];
};

export type SandApiResponse = {
  message: string;
  mode: SandMode;
  disclosure: string;
  results: SandResult[];
  suggestions: string[];
  remainingAiMessages: number;
  dataSource: SandGrounding['source'] | 'none';
};
