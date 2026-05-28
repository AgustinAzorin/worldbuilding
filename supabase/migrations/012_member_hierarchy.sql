-- ============================================================
-- 012_member_hierarchy.sql
-- Fase 8.6 — Jerarquía interna de los miembros de una organización.
--
-- Hasta ahora una membresía era una simple arista semántica
-- 'Miembro de' (miembro → organización), sin rango ni estructura de
-- mando. Esta migración enriquece esa arista con dos dimensiones
-- complementarias, ambas materializadas sobre `article_relations`:
--
--   1. Rango / cargo por membresía:
--      a) `member_rank`       TEXT    — título humano (ej. "Líder",
--                                       "Capitán", "Recluta").
--      b) `member_rank_level` INTEGER — nivel para agrupar y ordenar.
--                                       Menor = más alto en la jerarquía.
--
--   2. Organigrama (cadena de mando):
--      `reports_to_member_id` UUID    — el miembro superior al que
--                                       reporta este miembro DENTRO de
--                                       esta organización. NULL = cima.
--
-- Las tres columnas sólo son significativas en aristas
-- connection_type='semantic' AND relation_label='Miembro de'. Para el
-- resto quedan en sus defaults (NULL / 0 / NULL) y se ignoran.
-- ============================================================

-- ── 1. Rango / cargo por membresía ──────────────────────────────────────
ALTER TABLE article_relations
  ADD COLUMN IF NOT EXISTS member_rank TEXT;

ALTER TABLE article_relations
  ADD COLUMN IF NOT EXISTS member_rank_level INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN article_relations.member_rank IS
  'Cargo o título del miembro dentro de la organización (ej. ''Líder'', ''Capitán''). Sólo significativo en aristas semánticas ''Miembro de''.';
COMMENT ON COLUMN article_relations.member_rank_level IS
  'Nivel jerárquico del miembro: menor = más alto. Usado para agrupar y ordenar. Sólo significativo en aristas semánticas ''Miembro de''.';

-- ── 2. Cadena de mando (organigrama) ────────────────────────────────────
-- El superior es otro artículo (que la capa de aplicación valida como
-- miembro de la misma organización). Al borrar al superior, el subordinado
-- simplemente queda sin jefe (SET NULL), nunca se elimina la membresía.
ALTER TABLE article_relations
  ADD COLUMN IF NOT EXISTS reports_to_member_id UUID
    REFERENCES articles(id) ON DELETE SET NULL;

-- Un miembro no puede reportarse a sí mismo. Los ciclos más profundos se
-- validan en OrganizationsService al guardar.
ALTER TABLE article_relations
  DROP CONSTRAINT IF EXISTS article_relations_reports_to_not_self;
ALTER TABLE article_relations
  ADD  CONSTRAINT article_relations_reports_to_not_self
       CHECK (reports_to_member_id IS NULL OR reports_to_member_id <> source_article_id);

COMMENT ON COLUMN article_relations.reports_to_member_id IS
  'Miembro superior al que reporta este miembro dentro de la misma organización (NULL = cima del organigrama). Sólo significativo en aristas semánticas ''Miembro de''.';

-- ── 3. Índices de apoyo ─────────────────────────────────────────────────
-- Acelera la carga del roster de una organización ordenado por nivel.
CREATE INDEX IF NOT EXISTS idx_article_relations_membership_rank
  ON article_relations (target_article_id, member_rank_level)
  WHERE connection_type = 'semantic' AND relation_label = 'Miembro de';

-- Acelera la búsqueda inversa "¿quién reporta a X?".
CREATE INDEX IF NOT EXISTS idx_article_relations_reports_to
  ON article_relations (reports_to_member_id)
  WHERE reports_to_member_id IS NOT NULL;
