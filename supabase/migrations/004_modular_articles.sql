-- ============================================================
-- 004_modular_articles.sql
-- Fase 4 — Refactor a artículos modulares.
--
-- Reemplaza las columnas `content` y `metadata` por dos arrays
-- JSONB ordenados: `header_fields` (ficha técnica) y `modules`
-- (bloques de contenido). El array preserva orden de inserción
-- de forma estricta a nivel de almacenamiento JSONB.
-- ============================================================

-- ── 1. Columnas nuevas (arrays JSONB) ─────────────────────────────────────
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS header_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Garantizamos a nivel de DB que ambos sean arrays.
ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_header_fields_is_array;
ALTER TABLE articles
  ADD  CONSTRAINT articles_header_fields_is_array
       CHECK (jsonb_typeof(header_fields) = 'array');

ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_modules_is_array;
ALTER TABLE articles
  ADD  CONSTRAINT articles_modules_is_array
       CHECK (jsonb_typeof(modules) = 'array');

COMMENT ON COLUMN articles.header_fields IS
  'Array ordenado de campos del header: [{ id, label, value, type: text|number }]';
COMMENT ON COLUMN articles.modules IS
  'Array ordenado de módulos: [{ id, type, title, data }] — type ∈ rich-text|chart|relations-graph|table|image';

-- ── 2. Cleanup de columnas e índices obsoletos ────────────────────────────
DROP INDEX IF EXISTS idx_articles_metadata_gin;

ALTER TABLE articles DROP COLUMN IF EXISTS content;
ALTER TABLE articles DROP COLUMN IF EXISTS metadata;

-- ============================================================
-- 3. STORAGE — bucket público `article-assets` (idempotente)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-assets', 'article-assets', true)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "article_assets_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "article_assets_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "article_assets_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "article_assets_owner_delete" ON storage.objects;

CREATE POLICY "article_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-assets');

CREATE POLICY "article_assets_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'article-assets');

CREATE POLICY "article_assets_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING      (bucket_id = 'article-assets' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'article-assets' AND owner = auth.uid());

CREATE POLICY "article_assets_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'article-assets' AND owner = auth.uid());
