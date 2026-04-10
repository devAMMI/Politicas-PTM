export interface Policy {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  document_url: string | null;
  document_name: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  author_id: string | null;
  author_name: string;
}

export type PolicyCategory =
  | 'Calidad e Inocuidad'
  | 'Seguridad Industrial'
  | 'Recursos Humanos'
  | 'Operaciones'
  | 'Medio Ambiente'
  | 'General';

export const CATEGORIES: PolicyCategory[] = [
  'Calidad e Inocuidad',
  'Seguridad Industrial',
  'Recursos Humanos',
  'Operaciones',
  'Medio Ambiente',
  'General',
];

export type Page =
  | { name: 'home' }
  | { name: 'policy'; slug: string }
  | { name: 'admin-login' }
  | { name: 'admin-dashboard' }
  | { name: 'admin-create' }
  | { name: 'admin-edit'; id: string }
  | { name: 'admin-users' };

export function generateSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return `${base}-${id.replace(/-/g, '').slice(0, 6)}`;
}
