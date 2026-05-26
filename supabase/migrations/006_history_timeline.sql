-- ============================================================
-- 006_history_timeline.sql
-- Fase 5 — Módulo de Historia y Línea de Tiempo.
--
-- Convierte cualquier artículo en un Evento Histórico opcional,
-- agregando un campo `type` ('document' | 'event') y metadatos
-- temporales (`start_year`, `end_year`, `date_display`). Los
-- eventos se ordenan cronológicamente por `start_year`.
-- ============================================================

-- ── 1. Columna `type` ────────────────────────────────────────────────────
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'document';

ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_type_check;
ALTER TABLE articles
  ADD  CONSTRAINT articles_type_check
       CHECK (type IN ('document', 'event'));

COMMENT ON COLUMN articles.type IS
  'Tipo de artículo: ''document'' (default) o ''event'' (entrada en la línea de tiempo)';

-- ── 2. Columnas temporales ───────────────────────────────────────────────
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS start_year   INTEGER;

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS end_year     INTEGER;

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS date_display TEXT;

-- end_year, si está presente, no puede ser anterior al inicio.
ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_year_range_check;
ALTER TABLE articles
  ADD  CONSTRAINT articles_year_range_check
       CHECK (end_year IS NULL OR start_year IS NULL OR end_year >= start_year);

COMMENT ON COLUMN articles.start_year   IS 'Año de inicio del evento (nullable). Eje temporal de la línea de tiempo.';
COMMENT ON COLUMN articles.end_year     IS 'Año de fin del evento (nullable). Permite representar duraciones / rangos.';
COMMENT ON COLUMN articles.date_display IS 'Etiqueta textual de la fecha tal como debe mostrarse (ej: "Año 142 de la Tercera Era").';

-- ── 3. Índice compuesto para carga ordenada de la timeline ───────────────
CREATE INDEX IF NOT EXISTS idx_articles_world_start_year
  ON articles (world_id, start_year)
  WHERE type = 'event';
