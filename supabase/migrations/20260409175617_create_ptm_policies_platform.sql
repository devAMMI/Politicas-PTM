
/*
  # PTM Policies Platform - Initial Schema

  ## Summary
  Creates the complete database structure for the PTM internal policies blog platform.

  ## New Tables

  ### `policies`
  Main table storing all company policy entries.
  - `id` (uuid, PK) - Unique identifier
  - `title` (text) - Policy title
  - `category` (text) - Policy category (e.g., Calidad, RRHH, Seguridad)
  - `summary` (text) - Short description shown in cards
  - `content` (text) - Full HTML/text content of the policy
  - `document_url` (text) - Supabase Storage URL for attached PDF
  - `document_name` (text) - Original filename of the document
  - `cover_image_url` (text) - Cover image URL
  - `is_published` (boolean) - Whether policy is visible to public
  - `published_at` (timestamptz) - Official publication date/time
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `author_id` (uuid, FK -> auth.users) - Who published it
  - `author_name` (text) - Display name of author

  ## Security
  - RLS enabled on `policies` table
  - Public can only read published policies
  - Authenticated users (admins) can create, update, delete any policy

  ## Storage
  - Creates `ptm-media` bucket for documents (PDFs) and cover images
  - Public read access for media files
  - Authenticated upload/delete access
*/

-- =====================
-- POLICIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  summary text DEFAULT '',
  content text DEFAULT '',
  document_url text,
  document_name text,
  cover_image_url text,
  is_published boolean DEFAULT false,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text DEFAULT 'Administrador'
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- Public can view published policies only
CREATE POLICY "Public can view published policies"
  ON policies FOR SELECT
  USING (is_published = true);

-- Authenticated admins can view all policies (including drafts)
CREATE POLICY "Admins can view all policies"
  ON policies FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Authenticated admins can insert new policies
CREATE POLICY "Admins can insert policies"
  ON policies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated admins can update any policy
CREATE POLICY "Admins can update policies"
  ON policies FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated admins can delete any policy
CREATE POLICY "Admins can delete policies"
  ON policies FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- STORAGE BUCKET
-- =====================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ptm-media',
  'ptm-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access to ptm-media bucket
CREATE POLICY "Public can view ptm media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ptm-media');

-- Authenticated users can upload to ptm-media bucket
CREATE POLICY "Admins can upload ptm media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ptm-media' AND auth.uid() IS NOT NULL);

-- Authenticated users can update/replace files
CREATE POLICY "Admins can update ptm media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ptm-media' AND auth.uid() IS NOT NULL);

-- Authenticated users can delete files
CREATE POLICY "Admins can delete ptm media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ptm-media' AND auth.uid() IS NOT NULL);

-- =====================
-- SAMPLE DATA
-- =====================
INSERT INTO policies (title, category, summary, content, is_published, published_at, author_name)
VALUES
(
  'Política de Calidad e Inocuidad Alimentaria',
  'Calidad e Inocuidad',
  'Establece los lineamientos fundamentales para garantizar la calidad e inocuidad en todos los procesos productivos de PTM, cumpliendo con las normativas nacionales e internacionales vigentes.',
  '<h2>1. Objetivo</h2><p>Garantizar que todos los productos elaborados por PTM cumplan con los más altos estándares de calidad e inocuidad alimentaria, protegiendo la salud de los consumidores y asegurando la satisfacción de nuestros clientes.</p><h2>2. Alcance</h2><p>Esta política aplica a todos los procesos de producción, almacenamiento, distribución y comercialización de productos PTM, así como a todos los colaboradores, contratistas y proveedores que interactúen con la cadena productiva.</p><h2>3. Compromisos</h2><ul><li>Cumplir con todas las normativas de inocuidad alimentaria aplicables.</li><li>Implementar y mantener un sistema de gestión de calidad certificado.</li><li>Capacitar continuamente al personal en buenas prácticas de manufactura.</li><li>Realizar auditorías periódicas internas y externas.</li></ul><h2>4. Responsabilidades</h2><p>El Departamento de Calidad es responsable de la implementación y seguimiento de esta política. Todos los colaboradores tienen la responsabilidad de cumplir y reportar cualquier desviación.</p>',
  true,
  now() - interval '7 days',
  'Departamento de Calidad'
),
(
  'Política de Seguridad e Higiene Industrial',
  'Seguridad Industrial',
  'Define las normas y procedimientos para garantizar un ambiente de trabajo seguro, previniendo accidentes laborales y promoviendo la cultura de seguridad en todas las áreas de PTM.',
  '<h2>1. Objetivo</h2><p>Establecer un ambiente de trabajo seguro para todos los colaboradores de PTM, minimizando los riesgos de accidentes y enfermedades ocupacionales.</p><h2>2. Normas Generales</h2><ul><li>El uso de equipo de protección personal (EPP) es obligatorio en áreas de producción.</li><li>Queda estrictamente prohibido operar maquinaria sin la capacitación correspondiente.</li><li>Todo accidente o incidente debe reportarse de inmediato al supervisor de turno.</li><li>Las rutas de evacuación deben mantenerse despejadas en todo momento.</li></ul><h2>3. Equipos de Protección</h2><p>PTM proveerá sin costo al colaborador el EPP necesario según el área de trabajo, incluyendo: casco, calzado de seguridad, guantes, lentes de protección y mascarilla cuando aplique.</p>',
  true,
  now() - interval '3 days',
  'Recursos Humanos'
),
(
  'Política de Recursos Humanos y Código de Conducta',
  'Recursos Humanos',
  'Documento que establece los principios, valores y normas de comportamiento que rigen las relaciones laborales dentro de PTM, fomentando un ambiente de respeto, inclusión y profesionalismo.',
  '<h2>1. Principios Fundamentales</h2><p>PTM se compromete a mantener un ambiente laboral basado en el respeto mutuo, la equidad y la dignidad de todas las personas.</p><h2>2. Código de Conducta</h2><ul><li>Tratar a todos los compañeros con respeto y dignidad.</li><li>Mantener confidencialidad sobre información sensible de la empresa.</li><li>Reportar cualquier conducta inapropiada o conflicto de interés.</li><li>Cumplir con los horarios y responsabilidades asignadas.</li></ul><h2>3. Prohibiciones</h2><p>Queda expresamente prohibido: el acoso laboral o sexual, la discriminación por cualquier motivo, el uso de sustancias prohibidas en horario laboral, y el uso indebido de recursos de la empresa.</p>',
  true,
  now() - interval '1 day',
  'Recursos Humanos'
);
