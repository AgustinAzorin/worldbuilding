-- ============================================================
-- 009_diplomacy_and_privacy.sql
-- Fase 7 — Diplomacia en el grafo + Niebla de guerra.
--
--   1. `article_relations.diplomacy_score`
--      Entero ∈ [-100, 100] que sólo aplica a aristas semánticas
--      (`connection_type = 'semantic'`).  Permite teñir el grafo:
--      −100 hostilidad / guerra, 0 neutral, +100 alianza total.
--
--   2. Niebla de guerra ("is_private")
--      No cambia el esquema: los objetos dentro de los arrays
--      JSONB `articles.header_fields` y `articles.modules` aceptan
--      una propiedad opcional `"is_private": boolean`.  El filtrado
--      por propietario se hace en la capa de servicio (ver
--      `ArticlesService.getById`), no a nivel SQL, porque el
--      consumidor del JSONB es el frontend.
-- ============================================================

-- ── 1. Columna diplomacy_score ────────────────────────────────────────────
ALTER TABLE article_relations
  ADD COLUMN IF NOT EXISTS diplomacy_score INTEGER;

-- Rango estricto del valor — y blindaje para que no aparezca en aristas
-- de tipo 'mention', donde no tiene sentido.
ALTER TABLE article_relations
  DROP CONSTRAINT IF EXISTS article_relations_diplomacy_score_range;
ALTER TABLE article_relations
  ADD  CONSTRAINT article_relations_diplomacy_score_range
       CHECK (
         diplomacy_score IS NULL
         OR (diplomacy_score BETWEEN -100 AND 100)
       );

ALTER TABLE article_relations
  DROP CONSTRAINT IF EXISTS article_relations_diplomacy_score_semantic_only;
ALTER TABLE article_relations
  ADD  CONSTRAINT article_relations_diplomacy_score_semantic_only
       CHECK (
         diplomacy_score IS NULL
         OR connection_type = 'semantic'
       );

COMMENT ON COLUMN article_relations.diplomacy_score IS
  'Eje diplomático ∈ [-100, 100] para relaciones semánticas: −100 hostilidad total, 0 neutral, +100 alianza total. NULL en aristas mention.';
