-- ============================================================
-- 011_family_relations_and_faction_hierarchy.sql
-- Fase 8.5 — Relaciones familiares ricas + jerarquía de facciones.
--
-- 1. Árboles genealógicos:
--    a) `family_tree_edges` gana `relation_type` para distinguir
--       parentescos biológicos, adoptivos y bastardos.
--    b) Nueva tabla `family_tree_partnerships` para relaciones de
--       pareja / cónyuge entre dos miembros del mismo árbol. Es una
--       relación simétrica (sin padre/hijo), por eso vive aparte de
--       las aristas direccionales.
--
-- 2. Facciones (artículos con type='organization'):
--    Ganan una jerarquía propia vía `org_parent_id` + `org_sort_order`
--    sobre `articles`, siguiendo el mismo patrón con que los eventos
--    cuelgan sus metadatos temporales del propio artículo. Permite que
--    el jugador arme sub-facciones y ordene a gusto cada nivel.
-- ============================================================

-- ── 1. Tipo de parentesco en aristas padre → hijo ───────────────────────
ALTER TABLE family_tree_edges
  ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'biological';

ALTER TABLE family_tree_edges
  DROP CONSTRAINT IF EXISTS family_tree_edges_relation_type_check;
ALTER TABLE family_tree_edges
  ADD  CONSTRAINT family_tree_edges_relation_type_check
       CHECK (relation_type IN ('biological', 'adopted', 'bastard'));

COMMENT ON COLUMN family_tree_edges.relation_type IS
  'Naturaleza del vínculo padre→hijo: ''biological'' (default), ''adopted'' (adoptado) o ''bastard'' (bastardo).';

-- ── 2. Relaciones de pareja / cónyuge ───────────────────────────────────
-- Simétricas: no hay dirección. Normalizamos el par con LEAST/GREATEST en
-- un índice único para que (A,B) y (B,A) cuenten como la misma relación.
CREATE TABLE IF NOT EXISTS family_tree_partnerships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id         UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  member_a_id     UUID NOT NULL REFERENCES articles(id)     ON DELETE CASCADE,
  member_b_id     UUID NOT NULL REFERENCES articles(id)     ON DELETE CASCADE,
  relation_type   TEXT NOT NULL DEFAULT 'partner',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT family_tree_partnership_no_self CHECK (member_a_id <> member_b_id),
  CONSTRAINT family_tree_partnership_type_check
    CHECK (relation_type IN ('spouse', 'partner', 'betrothed'))
);

CREATE INDEX IF NOT EXISTS idx_family_tree_partnerships_tree
  ON family_tree_partnerships(tree_id);
CREATE INDEX IF NOT EXISTS idx_family_tree_partnerships_a
  ON family_tree_partnerships(tree_id, member_a_id);
CREATE INDEX IF NOT EXISTS idx_family_tree_partnerships_b
  ON family_tree_partnerships(tree_id, member_b_id);

-- Unicidad sin importar el orden del par.
CREATE UNIQUE INDEX IF NOT EXISTS uq_family_tree_partnership_pair
  ON family_tree_partnerships (
    tree_id,
    LEAST(member_a_id, member_b_id),
    GREATEST(member_a_id, member_b_id)
  );

COMMENT ON COLUMN family_tree_partnerships.relation_type IS
  'Tipo de vínculo de pareja: ''spouse'' (cónyuge), ''partner'' (pareja, default) o ''betrothed'' (prometidos).';

ALTER TABLE family_tree_partnerships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_tree_partnerships_owner_all" ON family_tree_partnerships;
CREATE POLICY "family_tree_partnerships_owner_all"
  ON family_tree_partnerships FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   family_trees ft
      JOIN   worlds       w ON w.id = ft.world_id
      WHERE  ft.id      = family_tree_partnerships.tree_id
        AND  w.user_id  = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   family_trees ft
      JOIN   worlds       w ON w.id = ft.world_id
      WHERE  ft.id      = family_tree_partnerships.tree_id
        AND  w.user_id  = auth.uid()
    )
  );

-- ── 3. Jerarquía de facciones sobre `articles` ──────────────────────────
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS org_parent_id  UUID REFERENCES articles(id) ON DELETE SET NULL;

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS org_sort_order INTEGER NOT NULL DEFAULT 0;

-- Una facción no puede ser su propia madre. Los ciclos más profundos se
-- validan en la capa de aplicación (OrganizationsService).
ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_org_parent_not_self;
ALTER TABLE articles
  ADD  CONSTRAINT articles_org_parent_not_self
       CHECK (org_parent_id IS NULL OR org_parent_id <> id);

CREATE INDEX IF NOT EXISTS idx_articles_org_parent
  ON articles (org_parent_id)
  WHERE org_parent_id IS NOT NULL;

COMMENT ON COLUMN articles.org_parent_id  IS
  'Facción madre dentro de la jerarquía de organizaciones (NULL = facción raíz). Sólo significativo cuando type=''organization''.';
COMMENT ON COLUMN articles.org_sort_order IS
  'Orden manual entre facciones hermanas (mismo org_parent_id). Lo controla el jugador.';
