/*
  # Evaluaciones de Desempeño - Schema

  ## Summary
  Creates tables to manage employee performance evaluations (2nd semester June format).
  The evaluation includes objectives, behavioral/technical competencies, comments and signatures.

  ## New Tables

  ### `evaluations`
  Main evaluation record per employee per period.
  - `id` (uuid, PK)
  - `employee_name` (text) - Collaborator name
  - `employee_position` (text) - Job title
  - `employee_department` (text) - Department/area
  - `supervisor_name` (text) - Direct supervisor name
  - `period` (text) - Evaluation period e.g. "2da Evaluacion Junio 2025"
  - `evaluation_date` (date) - Date of evaluation
  - `supervisor_comments` (text) - Comments from direct supervisor
  - `employee_comments` (text) - Comments from collaborator
  - `status` (text) - 'draft' | 'completed'
  - `created_by` (uuid, FK -> auth.users)
  - `created_at`, `updated_at`

  ### `evaluation_objectives`
  Individual objectives evaluated.
  - `id` (uuid, PK)
  - `evaluation_id` (uuid, FK -> evaluations)
  - `order_num` (int) - display order
  - `objective` (text) - Objective description
  - `results` (text) - Results noted at review date
  - `rating` (text) - 'debajo' | 'mejorar' | 'cumple' | 'supera' | null

  ### `evaluation_competencies`
  Behavioral and technical competencies (5 defined).
  - `id` (uuid, PK)
  - `evaluation_id` (uuid, FK -> evaluations)
  - `order_num` (int)
  - `competency` (text) - Competency name
  - `rating` (text) - 'debajo' | 'mejorar' | 'cumple' | 'supera' | null

  ## Security
  - RLS enabled on all tables
  - Authenticated users (admins) can fully manage evaluations
*/

CREATE TABLE IF NOT EXISTS evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name text NOT NULL DEFAULT '',
  employee_position text NOT NULL DEFAULT '',
  employee_department text NOT NULL DEFAULT '',
  supervisor_name text NOT NULL DEFAULT '',
  period text NOT NULL DEFAULT '2da Evaluacion Junio 2025',
  evaluation_date date DEFAULT CURRENT_DATE,
  supervisor_comments text DEFAULT '',
  employee_comments text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluation_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  order_num integer NOT NULL DEFAULT 1,
  objective text NOT NULL DEFAULT '',
  results text DEFAULT '',
  rating text CHECK (rating IN ('debajo', 'mejorar', 'cumple', 'supera'))
);

CREATE TABLE IF NOT EXISTS evaluation_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  order_num integer NOT NULL DEFAULT 1,
  competency text NOT NULL DEFAULT '',
  rating text CHECK (rating IN ('debajo', 'mejorar', 'cumple', 'supera'))
);

ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view evaluations"
  ON evaluations FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert evaluations"
  ON evaluations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update evaluations"
  ON evaluations FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete evaluations"
  ON evaluations FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view objectives"
  ON evaluation_objectives FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert objectives"
  ON evaluation_objectives FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update objectives"
  ON evaluation_objectives FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete objectives"
  ON evaluation_objectives FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view competencies"
  ON evaluation_competencies FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert competencies"
  ON evaluation_competencies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update competencies"
  ON evaluation_competencies FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete competencies"
  ON evaluation_competencies FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION update_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_evaluations_updated_at
  BEFORE UPDATE ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_evaluations_updated_at();
