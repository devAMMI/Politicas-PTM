export interface Policy {
  id: string;
  slug: string;
  policy_number: number;
  title: string;
  category: string;
  department: string;
  version: string;
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

export const CATEGORY_SLUG: Record<PolicyCategory, string> = {
  'Calidad e Inocuidad':  'calidad-inocuidad',
  'Seguridad Industrial': 'seguridad-industrial',
  'Recursos Humanos':     'recursos-humanos',
  'Operaciones':          'operaciones',
  'Medio Ambiente':       'medio-ambiente',
  'General':              'general',
};

/** Builds the storage path for a policy file.
 *  Pattern: {folder}/{category}/{year}/POL-{number:04d}_{titleSlug}/{filename}
 *  Example: documents/recursos-humanos/2026/POL-0001_conflicto-de-interes/politica-conflicto-de-interes.pdf
 */
export function buildStoragePath(
  folder: 'documents' | 'covers',
  category: string,
  policyNumber: number,
  title: string,
  originalFilename: string,
  publishedAt: string,
): string {
  const year = new Date(publishedAt).getFullYear();
  const catSlug = (CATEGORY_SLUG as Record<string, string>)[category]
    ?? category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const titleSlug = title
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const ext = originalFilename.split('.').pop()?.toLowerCase() ?? 'bin';
  const numStr = String(policyNumber).padStart(4, '0');
  const fileSlug = folder === 'documents'
    ? `${titleSlug}.${ext}`
    : `portada.${ext}`;
  return `${folder}/${catSlug}/${year}/POL-${numStr}_${titleSlug}/${fileSlug}`;
}

export type Page =
  | { name: 'home' }
  | { name: 'category'; category: string }
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
