-- ============================================================
-- 010_organizations.sql
-- Fase 8 — Organizaciones Globales y Líneas de Vida Internas.
--
-- 1. Extiende el dominio de `articles.type` para permitir
--    'organization' (facciones, gremios, naciones).
-- 2. Refuerza el ON DELETE CASCADE existente sobre
--    article_relations: cuando se elimina una organización,
--    todas las membresías colgantes (relation_label='Miembro de')
--    se eliminan automáticamente por la FK ya declarada en 001.
--    Se documenta aquí explícitamente y se añade un índice parcial
--    que acelera el conteo de miembros por organización.
-- ============================================================

-- ── 1. Ampliar dominio de articles.type ─────────────────────────────────
ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_type_check;

ALTER TABLE articles
  ADD  CONSTRAINT articles_type_check
       CHECK (type IN ('document', 'event', 'organization'));

COMMENT ON COLUMN articles.type IS
  'Tipo de artículo: ''document'' (default), ''event'' (timeline) u ''organization'' (facción / gremio / nación)';

-- ── 2. Índice parcial: conteo rápido de miembros por organización ───────
-- Usado por GET /worlds/:id/organizations para listar la grilla con el
-- "members_count". El parcial mantiene el índice diminuto porque solo
-- contempla aristas semánticas con la etiqueta canónica.
CREATE INDEX IF NOT EXISTS idx_article_relations_membership_target
  ON article_relations (target_article_id)
  WHERE connection_type = 'semantic' AND relation_label = 'Miembro de';

-- ── 3. Nota sobre cascada ───────────────────────────────────────────────
-- article_relations ya declara en 001_initial_schema.sql:
--   source_article_id ... REFERENCES articles(id) ON DELETE CASCADE
--   target_article_id ... REFERENCES articles(id) ON DELETE CASCADE
-- Por lo tanto, al borrar una organización (artículo destino), todas
-- sus aristas entrantes 'Miembro de' caen en cascada sin trabajo extra.
