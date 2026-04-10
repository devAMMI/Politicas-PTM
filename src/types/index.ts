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

export type RatingValue = 'debajo' | 'mejorar' | 'cumple' | 'supera' | null;

export interface EvaluationObjective {
  id?: string;
  evaluation_id?: string;
  order_num: number;
  objective: string;
  results: string;
  rating: RatingValue;
}

export interface EvaluationCompetency {
  id?: string;
  evaluation_id?: string;
  order_num: number;
  competency: string;
  rating: RatingValue;
}

export interface Evaluation {
  id: string;
  employee_name: string;
  employee_position: string;
  employee_department: string;
  supervisor_name: string;
  period: string;
  evaluation_date: string;
  supervisor_comments: string;
  employee_comments: string;
  status: 'draft' | 'completed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  objectives?: EvaluationObjective[];
  competencies?: EvaluationCompetency[];
}

export type Page =
  | { name: 'home' }
  | { name: 'policy'; id: string }
  | { name: 'admin-login' }
  | { name: 'admin-dashboard' }
  | { name: 'admin-create' }
  | { name: 'admin-edit'; id: string }
  | { name: 'admin-users' }
  | { name: 'admin-evaluations' }
  | { name: 'admin-evaluation-new' }
  | { name: 'admin-evaluation-edit'; id: string }
  | { name: 'admin-evaluation-view'; id: string };
