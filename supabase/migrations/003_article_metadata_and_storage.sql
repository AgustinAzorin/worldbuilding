-- ============================================================
-- 003_article_metadata_and_storage.sql
-- Fase 3 — Artículos Personalizables y Multimedia
--
-- 1. Añade la columna `metadata` (JSONB) a `articles` para
--    almacenar pares clave/valor definidos por el usuario.
-- 2. Crea el bucket público `article-assets` en Supabase Storage
--    junto con las políticas RLS necesarias.
-- ============================================================

-- ── 1. COLUMNA metadata EN articles ───────────────────────────────────────
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN articles.metadata IS
  'Labels personalizados clave/valor del artículo (ej: {"Capital": "Camelot"})';

-- Index GIN para búsquedas eficientes dentro del JSON
CREATE INDEX IF NOT EXISTS idx_articles_metadata_gin
  ON articles USING GIN (metadata);

-- ============================================================
-- 2. STORAGE — bucket public `article-assets`
-- ============================================================

-- Crear (o actualizar) el bucket público. `public = true` permite
-- generar URLs públicas vía supabase.storage.getPublicUrl().
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-assets', 'article-assets', true)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public;

-- ── Políticas RLS sobre storage.objects ───────────────────────────────────
-- Limpieza idempotente: borra políticas previas si existen.
DROP POLICY IF EXISTS "article_assets_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "article_assets_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "article_assets_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "article_assets_owner_delete"  ON storage.objects;

-- Cualquiera (incluso anónimo) puede LEER objetos del bucket.
CREATE POLICY "article_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-assets');

-- Solo usuarios autenticados pueden SUBIR objetos al bucket.
CREATE POLICY "article_assets_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'article-assets');

-- El propietario del objeto puede ACTUALIZARLO.
CREATE POLICY "article_assets_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING      (bucket_id = 'article-assets' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'article-assets' AND owner = auth.uid());

-- El propietario del objeto puede ELIMINARLO.
CREATE POLICY "article_assets_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'article-assets' AND owner = auth.uid());
