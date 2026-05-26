-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TABLAS
-- ============================================================

CREATE TABLE worlds (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT        NOT NULL,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE articles (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id   UUID        NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  content    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE article_relations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  target_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT uq_relation          UNIQUE (source_article_id, target_article_id),
  CONSTRAINT no_self_reference    CHECK  (source_article_id <> target_article_id)
);

-- Índices para búsquedas bidireccionales
CREATE INDEX idx_article_relations_source ON article_relations(source_article_id);
CREATE INDEX idx_article_relations_target ON article_relations(target_article_id);

-- Índice para búsqueda ILIKE por título dentro de un mundo
CREATE INDEX idx_articles_world_title ON articles(world_id, title);

-- ============================================================
-- 3. TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. FUNCIÓN RPC — sincronización atómica de relaciones
-- Verifica que el usuario sea dueño del artículo origen y luego
-- reemplaza todas sus relaciones salientes en una sola transacción.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_article_relations(
  p_source_id  UUID,
  p_target_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar propiedad: el usuario autenticado debe ser dueño del mundo
  IF NOT EXISTS (
    SELECT 1
    FROM   articles a
    JOIN   worlds   w ON w.id = a.world_id
    WHERE  a.id       = p_source_id
      AND  w.user_id  = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access_denied: article not found or insufficient permissions';
  END IF;

  -- Borrar relaciones salientes existentes
  DELETE FROM article_relations WHERE source_article_id = p_source_id;

  -- Insertar nuevas relaciones (solo si hay targets)
  IF array_length(p_target_ids, 1) IS NOT NULL THEN
    INSERT INTO article_relations (source_article_id, target_article_id)
    SELECT p_source_id, unnest(p_target_ids)
    ON CONFLICT (source_article_id, target_article_id) DO NOTHING;
  END IF;
END;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE worlds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_relations ENABLE ROW LEVEL SECURITY;

-- Worlds: cada usuario gestiona solo sus mundos
CREATE POLICY "worlds_owner_all"
  ON worlds FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Articles: accesibles si el mundo pertenece al usuario
CREATE POLICY "articles_owner_all"
  ON articles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id = articles.world_id
        AND worlds.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id = articles.world_id
        AND worlds.user_id = auth.uid()
    )
  );

-- Article relations: accesibles si el artículo origen pertenece al usuario
CREATE POLICY "relations_owner_all"
  ON article_relations FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   articles a
      JOIN   worlds   w ON w.id = a.world_id
      WHERE  a.id      = article_relations.source_article_id
        AND  w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   articles a
      JOIN   worlds   w ON w.id = a.world_id
      WHERE  a.id      = article_relations.source_article_id
        AND  w.user_id = auth.uid()
    )
  );
