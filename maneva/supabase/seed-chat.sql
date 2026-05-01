-- ─────────────────────────────────────────────────────────────────────────────
-- seed-chat.sql
-- Datos de prueba para el chatbot IA de Maneva.
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- IDs fijos para facilitar pruebas repetibles y limpieza.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Salones ──────────────────────────────────────────────────────────────────

INSERT INTO salons (id, name, description)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Salón Elite', 'Peluquería de lujo en el centro'),
  ('11111111-0000-0000-0000-000000000002', 'Studio Belleza', 'Especialistas en coloración y tendencias'),
  ('11111111-0000-0000-0000-000000000003', 'Hair Lab', 'Peluquería artesanal con 15 años de experiencia')
ON CONFLICT (id) DO NOTHING;

-- ─── Ubicaciones ──────────────────────────────────────────────────────────────
-- La tabla salon_locations contiene la ciudad (campo que usa el chatbot para filtrar).

INSERT INTO salon_locations (id, salon_id, name, city, address, active)
VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Salón Elite Madrid',       'Madrid',    'Calle Gran Vía 45',   true),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Studio Belleza Barcelona', 'Barcelona', 'Carrer de Verdi 12',  true),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Hair Lab Sevilla',         'Sevilla',   'Calle Sierpes 8',     true)
ON CONFLICT (id) DO NOTHING;

-- ─── Peluqueros (employees) ───────────────────────────────────────────────────
-- IMPORTANTE: employees.user_id referencia auth.users (FK obligatoria).
-- Para añadir peluqueros de prueba, crea primero usuarios en:
--   Supabase Dashboard → Authentication → Users → "Invite user"
-- Luego descomenta y ajusta el bloque con los UUIDs reales.
--
-- INSERT INTO employees (id, user_id, location_id, position, specialties, bio, active)
-- VALUES
--   ('33333333-0000-0000-0000-000000000001',
--    'UUID_REAL_DE_AUTH_USER_1',
--    '22222222-0000-0000-0000-000000000001',  -- Madrid
--    'María García',
--    'Coloración, Balayage, Mechas',
--    'Especialista en color con 8 años de experiencia.',
--    true),
--
--   ('33333333-0000-0000-0000-000000000002',
--    'UUID_REAL_DE_AUTH_USER_2',
--    '22222222-0000-0000-0000-000000000001',  -- Madrid
--    'Carlos Ruiz',
--    'Corte, Barba, Fade',
--    'Barbero especializado en estilos modernos.',
--    true),
--
--   ('33333333-0000-0000-0000-000000000003',
--    'UUID_REAL_DE_AUTH_USER_3',
--    '22222222-0000-0000-0000-000000000002',  -- Barcelona
--    'Laura Sánchez',
--    'Tratamientos, Keratina, Hidratación',
--    'Experta en tratamientos capilares y nutrición del cabello.',
--    true)
-- ON CONFLICT (id) DO NOTHING;

-- ─── Para limpiar los datos de prueba ─────────────────────────────────────────
-- DELETE FROM salon_locations WHERE id LIKE '22222222-0000-0000-0000-%';
-- DELETE FROM salons          WHERE id LIKE '11111111-0000-0000-0000-%';
