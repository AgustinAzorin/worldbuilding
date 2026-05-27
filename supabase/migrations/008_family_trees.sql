-- ============================================================
-- 008_family_trees.sql
-- Fase 6.5 — Árboles genealógicos como entidad de mundo.
--
-- Saca el parentesco de `article_relations` (que es direccional y
-- vivía sólo en el artículo que declaró la relación) y lo mueve a
-- una tabla compartida por mundo. Cualquier artículo puede luego
-- referenciar un árbol vía el módulo `family-tree`.
--
--   family_trees       — un árbol = (id, world_id, name, description)
--   family_tree_edges  — aristas parent → child dentro de un árbol
-- ============================================================

-- ── 1. TABLAS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_trees (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id    UUID        NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_trees_world_id ON family_trees(world_id);

CREATE TRIGGER family_trees_updated_at
  BEFORE UPDATE ON family_trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS family_tree_edges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id           UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  parent_article_id UUID NOT NULL REFERENCES articles(id)     ON DELETE CASCADE,
  child_article_id  UUID NOT NULL REFERENCES articles(id)     ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_family_tree_edge        UNIQUE (tree_id, parent_article_id, child_article_id),
  CONSTRAINT family_tree_no_self_parent CHECK  (parent_article_id <> child_article_id)
);

CREATE INDEX IF NOT EXISTS idx_family_tree_edges_tree   ON family_tree_edges(tree_id);
CREATE INDEX IF NOT EXISTS idx_family_tree_edges_parent ON family_tree_edges(tree_id, parent_article_id);
CREATE INDEX IF NOT EXISTS idx_family_tree_edges_child  ON family_tree_edges(tree_id, child_article_id);

-- ── 2. ROW LEVEL SECURITY ────────────────────────────────────────────────
ALTER TABLE family_trees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_trees_owner_all" ON family_trees;
CREATE POLICY "family_trees_owner_all"
  ON family_trees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id      = family_trees.world_id
        AND worlds.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id      = family_trees.world_id
        AND worlds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "family_tree_edges_owner_all" ON family_tree_edges;
CREATE POLICY "family_tree_edges_owner_all"
  ON family_tree_edges FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   family_trees ft
      JOIN   worlds       w ON w.id = ft.world_id
      WHERE  ft.id      = family_tree_edges.tree_id
        AND  w.user_id  = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   family_trees ft
      JOIN   worlds       w ON w.id = ft.world_id
      WHERE  ft.id      = family_tree_edges.tree_id
        AND  w.user_id  = auth.uid()
    )
  );

-- ── 3. BACKFILL desde article_relations ──────────────────────────────────
-- Convierte cada relación semántica con label de parentesco en una arista
-- de árbol. Convención del módulo viejo:
--   source → target, label = 'Padre'/'Madre'  ⇒  target es padre de source
--   source → target, label = 'Hijo'/'Hija'    ⇒  source es padre de target
-- Se agrupa por mundo en un único árbol "Árbol genealógico". El usuario
-- puede partirlo después renombrando/creando árboles desde la UI.

WITH parented AS (
  SELECT
    a.world_id,
    CASE
      WHEN ar.relation_label ~* '(padre|madre)' THEN ar.target_article_id
      ELSE ar.source_article_id
    END AS parent_id,
    CASE
      WHEN ar.relation_label ~* '(padre|madre)' THEN ar.source_article_id
      ELSE ar.target_article_id
    END AS child_id
  FROM article_relations ar
  JOIN articles a ON a.id = ar.source_article_id
  WHERE ar.connection_type = 'semantic'
    AND ar.relation_label ~* '(padre|madre|hijo|hija)'
),
worlds_with_family AS (
  SELECT DISTINCT world_id FROM parented
),
created_trees AS (
  INSERT INTO family_trees (world_id, name, description)
  SELECT
    w.world_id,
    'Árbol genealógico',
    'Generado automáticamente al migrar las relaciones de parentesco existentes.'
  FROM worlds_with_family w
  WHERE NOT EXISTS (
    SELECT 1 FROM family_trees ft
    WHERE ft.world_id = w.world_id
      AND ft.name     = 'Árbol genealógico'
  )
  RETURNING id, world_id
),
all_default_trees AS (
  SELECT id, world_id FROM created_trees
  UNION ALL
  SELECT ft.id, ft.world_id
  FROM family_trees ft
  JOIN worlds_with_family w ON w.world_id = ft.world_id
  WHERE ft.name = 'Árbol genealógico'
    AND NOT EXISTS (SELECT 1 FROM created_trees c WHERE c.id = ft.id)
)
INSERT INTO family_tree_edges (tree_id, parent_article_id, child_article_id)
SELECT DISTINCT t.id, p.parent_id, p.child_id
FROM parented p
JOIN all_default_trees t ON t.world_id = p.world_id
WHERE p.parent_id <> p.child_id
ON CONFLICT (tree_id, parent_article_id, child_article_id) DO NOTHING;

-- Eliminamos las relaciones de parentesco ya migradas para que no
-- compitan con la fuente de verdad nueva ni ensucien el grafo general.
DELETE FROM article_relations
WHERE connection_type = 'semantic'
  AND relation_label ~* '(padre|madre|hijo|hija)';
