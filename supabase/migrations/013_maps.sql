-- ============================================================
-- 013_maps.sql
-- Fase 9 — Módulo de Cartografía (Fase 1)
--
-- Nuevas entidades:
--   · maps        — imágenes de mapa asociadas a un mundo
--   · map_pins    — marcadores interactivos sobre un mapa
--
-- Storage:
--   · Bucket público `map-images` para las imágenes subidas.
-- ============================================================

-- ── 1. Tabla maps ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS maps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id   UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  image_url  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maps_world_id ON maps (world_id);

-- ── 2. Tabla map_pins ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS map_pins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id     UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  x          NUMERIC(10, 4) NOT NULL,
  y          NUMERIC(10, 4) NOT NULL,
  pin_type   TEXT NOT NULL CHECK (pin_type IN ('npc', 'item', 'event', 'faction', 'location')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_map_pins_map_id    ON map_pins (map_id);
CREATE INDEX IF NOT EXISTS idx_map_pins_article_id ON map_pins (article_id) WHERE article_id IS NOT NULL;

-- ── 3. RLS para maps ─────────────────────────────────────────────────────────

ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver los mapas de los mundos que le pertenecen.
CREATE POLICY maps_select ON maps
  FOR SELECT
  USING (
    world_id IN (
      SELECT id FROM worlds WHERE user_id = auth.uid()
    )
  );

CREATE POLICY maps_insert ON maps
  FOR INSERT
  WITH CHECK (
    world_id IN (
      SELECT id FROM worlds WHERE user_id = auth.uid()
    )
  );

CREATE POLICY maps_update ON maps
  FOR UPDATE
  USING (
    world_id IN (
      SELECT id FROM worlds WHERE user_id = auth.uid()
    )
  );

CREATE POLICY maps_delete ON maps
  FOR DELETE
  USING (
    world_id IN (
      SELECT id FROM worlds WHERE user_id = auth.uid()
    )
  );

-- ── 4. RLS para map_pins ─────────────────────────────────────────────────────

ALTER TABLE map_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY map_pins_select ON map_pins
  FOR SELECT
  USING (
    map_id IN (
      SELECT m.id FROM maps m
      JOIN worlds w ON w.id = m.world_id
      WHERE w.user_id = auth.uid()
    )
  );

CREATE POLICY map_pins_insert ON map_pins
  FOR INSERT
  WITH CHECK (
    map_id IN (
      SELECT m.id FROM maps m
      JOIN worlds w ON w.id = m.world_id
      WHERE w.user_id = auth.uid()
    )
  );

CREATE POLICY map_pins_update ON map_pins
  FOR UPDATE
  USING (
    map_id IN (
      SELECT m.id FROM maps m
      JOIN worlds w ON w.id = m.world_id
      WHERE w.user_id = auth.uid()
    )
  );

CREATE POLICY map_pins_delete ON map_pins
  FOR DELETE
  USING (
    map_id IN (
      SELECT m.id FROM maps m
      JOIN worlds w ON w.id = m.world_id
      WHERE w.user_id = auth.uid()
    )
  );

-- ── 5. Bucket de Storage `map-images` ────────────────────────────────────────
-- Ejecutar en Supabase Dashboard > Storage o via la CLI de Supabase.
-- Aquí dejamos el registro en los migrations como documentación.
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('map-images', 'map-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Policy de storage: sólo el propietario puede subir/leer.
-- (Gestionar en Dashboard → Storage → map-images → Policies)
