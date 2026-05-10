export type PolicyStatus = 'published' | 'hidden' | 'archived' | 'deleted';

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
  document_clean_path: string | null;
  cover_image_url: string | null;
  is_internal: boolean;
  status: PolicyStatus;
  is_published: boolean;
  folder_path: string;
  published_at: string;
  deleted_at: string | null;
  archived_at: string | null;
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

/**
 * Builds the Supabase Storage path for a policy file.
 * Pattern: politicas/documentos/PoliticaPTM/{category}/{year}/POL-{####}_{titleSlug}/{filename}
 * Example: politicas/documentos/PoliticaPTM/RRHH/2026/POL-0001_conflicto-de-interes/conflicto-de-interes.pdf
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
  const fileSlug = folder === 'documents' ? `${titleSlug}.${ext}` : `portada.${ext}`;
  return `politicas/${folder === 'documents' ? 'documentos' : 'portadas'}/PoliticaPTM/${catSlug}/${year}/POL-${numStr}_${titleSlug}/${fileSlug}`;
}

/** Logical folder path for archive browser: Category/Year */
export function buildFolderPath(category: string, publishedAt: string): string {
  const year = new Date(publishedAt).getFullYear();
  return `${category}/${year}`;
}

/**
 * Builds the clean human-readable path used in app URLs.
 * Pattern: politicas/{CATEGORY_ABBR}/{dept}/{titleSlug}-{day}-{month}-{year}.pdf
 * Example: politicas/RRHH/PTM/politica-conflicto-de-interes-8-mayo-2026.pdf
 * Full URL: /docs/politicas/RRHH/PTM/politica-conflicto-de-interes-8-mayo-2026.pdf
 */
export function buildDocCleanPath(
  category: string,
  department: string,
  title: string,
  publishedAt: string,
  ext: string,
): string {
  const CATEGORY_ABBR: Record<string, string> = {
    'Calidad e Inocuidad':  'Calidad',
    'Seguridad Industrial': 'Seguridad',
    'Recursos Humanos':     'RRHH',
    'Operaciones':          'Operaciones',
    'Medio Ambiente':       'MedioAmbiente',
    'General':              'General',
  };
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date(publishedAt);
  const dateSuffix = `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  const catAbbr = CATEGORY_ABBR[category] ?? category.replace(/\s+/g, '');
  const deptSlug = (department || 'PTM')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'PTM';
  const titleSlug = title
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `politicas/${catAbbr}/${deptSlug}/${titleSlug}-${dateSuffix}.${ext.toLowerCase()}`;
}

/** Resolves the full in-app clean URL for a document */
export function buildDocCleanUrl(cleanPath: string): string {
  return `/docs/${cleanPath}`;
}

export type Page =
  | { name: 'home' }
  | { name: 'category'; category: string }
  | { name: 'policy'; slug: string }
  | { name: 'admin-login' }
  | { name: 'admin-dashboard' }
  | { name: 'admin-create' }
  | { name: 'admin-edit'; id: string }
  | { name: 'admin-users' }
  | { name: 'admin-archive' }
  | { name: 'admin-categories' }
  | { name: 'admin-profile' };

export function generateSlug(title: string, _id?: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
