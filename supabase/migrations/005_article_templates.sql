-- ============================================================
-- 005_article_templates.sql
-- Fase 4 — Sistema de presets / plantillas de artículos.
--
-- Cada plantilla guarda una "ficha técnica" base y una pila de
-- módulos preconfigurados. Al crear un artículo, el backend
-- clona estos arrays regenerando los UUIDs para evitar choques
-- de keys de React entre múltiples instancias del mismo preset.
-- ============================================================

CREATE TABLE article_templates (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id              UUID        NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  default_header_fields JSONB       NOT NULL DEFAULT '[]'::jsonb,
  default_modules       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT article_templates_header_fields_is_array
    CHECK (jsonb_typeof(default_header_fields) = 'array'),
  CONSTRAINT article_templates_modules_is_array
    CHECK (jsonb_typeof(default_modules) = 'array')
);

CREATE INDEX idx_article_templates_world_id ON article_templates(world_id);

COMMENT ON COLUMN article_templates.default_header_fields IS
  'Array ordenado de campos del header de la plantilla: [{ id, label, value, type: text|number }]';
COMMENT ON COLUMN article_templates.default_modules IS
  'Array ordenado de módulos preconfigurados: [{ id, type, title, data }]';

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
ALTER TABLE article_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_templates_owner_all"
  ON article_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id      = article_templates.world_id
        AND worlds.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id      = article_templates.world_id
        AND worlds.user_id = auth.uid()
    )
  );
