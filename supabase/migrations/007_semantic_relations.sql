-- ============================================================
-- 007_semantic_relations.sql
-- Fase 6 — Relaciones humanas explícitas + árbol genealógico.
--
-- Diferencia las relaciones derivadas de menciones (TipTap @)
-- de las relaciones semánticas explícitas declaradas por el
-- usuario ("Padre", "Esposa", "Rival", "Líder", etc.).
--
--   connection_type ∈ {'mention', 'semantic'}    DEFAULT 'mention'
--   relation_label   TEXT  (nullable, sólo útil para 'semantic')
-- ============================================================

-- ── 1. Nuevas columnas ────────────────────────────────────────────────────
ALTER TABLE article_relations
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'mention';

ALTER TABLE article_relations
  DROP CONSTRAINT IF EXISTS article_relations_connection_type_check;
ALTER TABLE article_relations
  ADD  CONSTRAINT article_relations_connection_type_check
       CHECK (connection_type IN ('mention', 'semantic'));

ALTER TABLE article_relations
  ADD COLUMN IF NOT EXISTS relation_label TEXT;

COMMENT ON COLUMN article_relations.connection_type IS
  'Origen de la arista: ''mention'' (auto, derivada del editor TipTap) o ''semantic'' (declarada explícitamente por el usuario)';
COMMENT ON COLUMN article_relations.relation_label IS
  'Etiqueta humana de la relación cuando es semántica (ej: "Padre", "Esposa", "Rival", "Líder")';

-- ── 2. Re-definir unicidad ────────────────────────────────────────────────
-- Antes:  UNIQUE (source_article_id, target_article_id)
-- Ahora:  un par puede coexistir como 'mention' y 'semantic'; entre
--         semánticas, la unicidad incluye la etiqueta para permitir
--         múltiples roles distintos (ej: Aliado + Rival histórico).
ALTER TABLE article_relations
  DROP CONSTRAINT IF EXISTS uq_relation;

CREATE UNIQUE INDEX IF NOT EXISTS uq_article_relations_mention
  ON article_relations (source_article_id, target_article_id)
  WHERE connection_type = 'mention';

CREATE UNIQUE INDEX IF NOT EXISTS uq_article_relations_semantic
  ON article_relations (source_article_id, target_article_id, relation_label)
  WHERE connection_type = 'semantic';

-- Índices para filtrar/consultar por tipo y para resolver el árbol
-- genealógico en ambas direcciones de forma eficiente.
CREATE INDEX IF NOT EXISTS idx_article_relations_connection_type
  ON article_relations (connection_type);

CREATE INDEX IF NOT EXISTS idx_article_relations_source_semantic
  ON article_relations (source_article_id, relation_label)
  WHERE connection_type = 'semantic';

CREATE INDEX IF NOT EXISTS idx_article_relations_target_semantic
  ON article_relations (target_article_id, relation_label)
  WHERE connection_type = 'semantic';

-- ── 3. RPC sync_article_relations — sólo toca aristas 'mention' ───────────
-- La sincronización automática viene del editor TipTap y no debe
-- pisar las relaciones semánticas que mantiene el usuario a mano.
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
  IF NOT EXISTS (
    SELECT 1
    FROM   articles a
    JOIN   worlds   w ON w.id = a.world_id
    WHERE  a.id      = p_source_id
      AND  w.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access_denied: article not found or insufficient permissions';
  END IF;

  DELETE FROM article_relations
   WHERE source_article_id = p_source_id
     AND connection_type   = 'mention';

  IF array_length(p_target_ids, 1) IS NOT NULL THEN
    INSERT INTO article_relations
        (source_article_id, target_article_id, connection_type)
    SELECT p_source_id, unnest(p_target_ids), 'mention'
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
