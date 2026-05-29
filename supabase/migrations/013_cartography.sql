-- ============================================================
-- 013_cartography.sql
-- Fase 9 — Módulo de Cartografía (carga de mapas + marcadores).
--
-- Introduce dos entidades nuevas más un bucket de Storage:
--
--   1. `maps`     — una imagen de mapa cargada por el usuario, asociada
--                   a un mundo. La imagen vive en el bucket público
--                   `map-images`; sólo guardamos su URL pública.
--
--   2. `map_pins` — marcadores interactivos posicionados sobre un mapa.
--                   Cada pin guarda coordenadas relativas (x, y) dentro
--                   de la imagen y, opcionalmente, enlaza a un artículo
--                   del mundo (NPC, ítem, evento, facción, ubicación…).
--
-- La propiedad se hereda transitivamente del mundo: un usuario sólo ve
-- y edita los mapas/pines cuyo mundo le pertenece (RLS vía join a
-- `worlds.user_id = auth.uid()`), igual que el resto de las entidades.
-- ============================================================

-- ============================================================
-- 1. TABLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS maps (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id   UUID        NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  image_url  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE maps IS
  'Mapa cartográfico de un mundo: una imagen (bucket map-images) sobre la que se colocan pines.';

CREATE TABLE IF NOT EXISTS map_pins (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id     UUID        NOT NULL REFERENCES maps(id)     ON DELETE CASCADE,
  -- Nullable: un pin puede ser sólo una etiqueta sin artículo enlazado.
  article_id UUID                 REFERENCES articles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  -- Coordenadas RELATIVAS dentro de la imagen (0..1 sobre cada eje), de
  -- modo que los pines se mantengan correctos a cualquier resolución.
  x          DOUBLE PRECISION NOT NULL,
  y          DOUBLE PRECISION NOT NULL,
  pin_type   TEXT        NOT NULL DEFAULT 'location',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT map_pins_pin_type_check
    CHECK (pin_type IN ('npc', 'item', 'event', 'faction', 'location'))
);

COMMENT ON COLUMN map_pins.x IS 'Coordenada relativa horizontal (0 = izquierda, 1 = derecha).';
COMMENT ON COLUMN map_pins.y IS 'Coordenada relativa vertical (0 = arriba, 1 = abajo).';
COMMENT ON COLUMN map_pins.pin_type IS
  'Categoría visual del marcador: npc | item | event | faction | location.';

-- Índices para las lecturas más frecuentes.
CREATE INDEX IF NOT EXISTS idx_maps_world        ON maps(world_id);
CREATE INDEX IF NOT EXISTS idx_map_pins_map      ON map_pins(map_id);
CREATE INDEX IF NOT EXISTS idx_map_pins_article  ON map_pins(article_id);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE maps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_pins ENABLE ROW LEVEL SECURITY;

-- Maps: accesibles si el mundo pertenece al usuario autenticado.
DROP POLICY IF EXISTS "maps_owner_all" ON maps;
CREATE POLICY "maps_owner_all"
  ON maps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id = maps.world_id
        AND worlds.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id = maps.world_id
        AND worlds.user_id = auth.uid()
    )
  );

-- Map pins: accesibles si el mapa contenedor pertenece a un mundo del usuario.
DROP POLICY IF EXISTS "map_pins_owner_all" ON map_pins;
CREATE POLICY "map_pins_owner_all"
  ON map_pins FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   maps   m
      JOIN   worlds w ON w.id = m.world_id
      WHERE  m.id      = map_pins.map_id
        AND  w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   maps   m
      JOIN   worlds w ON w.id = m.world_id
      WHERE  m.id      = map_pins.map_id
        AND  w.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. STORAGE — bucket público `map-images`
-- ============================================================

-- Bucket público: permite generar URLs vía supabase.storage.getPublicUrl().
INSERT INTO storage.buckets (id, name, public)
VALUES ('map-images', 'map-images', true)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public;

-- ── Políticas RLS sobre storage.objects ───────────────────────────────────
-- Limpieza idempotente: borra políticas previas si existen.
DROP POLICY IF EXISTS "map_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "map_images_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "map_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "map_images_owner_delete" ON storage.objects;

-- Cualquiera (incluso anónimo) puede LEER objetos del bucket.
CREATE POLICY "map_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'map-images');

-- Solo usuarios autenticados pueden SUBIR objetos al bucket.
CREATE POLICY "map_images_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'map-images');

-- El propietario del objeto puede ACTUALIZARLO.
CREATE POLICY "map_images_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING      (bucket_id = 'map-images' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'map-images' AND owner = auth.uid());

-- El propietario del objeto puede ELIMINARLO.
CREATE POLICY "map_images_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'map-images' AND owner = auth.uid());
