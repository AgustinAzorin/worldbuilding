-- ============================================================
-- 002_folders.sql
-- Adds hierarchical folder support and wires articles to folders.
-- ============================================================

-- ── 1. TABLA folders ───────────────────────────────────────────────────────
CREATE TABLE folders (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL,
  world_id   UUID        NOT NULL REFERENCES worlds(id)   ON DELETE CASCADE,
  parent_id  UUID                    REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimise ancestor/descendant lookups and tree traversal queries
CREATE INDEX idx_folders_world_id  ON folders(world_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);

-- ── 2. COLUMNA folder_id EN articles ──────────────────────────────────────
-- NULL → el artículo vive en la raíz del mundo (sin carpeta)
ALTER TABLE articles
  ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX idx_articles_folder_id ON articles(folder_id);

-- ── 3. ROW LEVEL SECURITY ─────────────────────────────────────────────────
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folders_owner_all"
  ON folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id      = folders.world_id
        AND worlds.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id      = folders.world_id
        AND worlds.user_id = auth.uid()
    )
  );
