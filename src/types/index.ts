export interface Policy {
  id: string;
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
  | { name: 'policy'; id: string }
  | { name: 'admin-login' }
  | { name: 'admin-dashboard' }
  | { name: 'admin-create' }
  | { name: 'admin-edit'; id: string }
  | { name: 'admin-users' };
