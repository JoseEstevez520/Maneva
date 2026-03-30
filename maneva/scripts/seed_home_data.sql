-- ============================================================
-- SEED: Home Screen Data para jose.est.sab@gmail.com
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- 0. Obtener el UUID del usuario (necesario para FK)
-- Puedes buscar el ID con:
--   SELECT id FROM auth.users WHERE email = 'jose.est.sab@gmail.com';
-- Y reemplazar USER_ID abajo. O bien úsalo dinámicamente:

DO $$
DECLARE
  v_user_id      uuid;
  v_currency_id  uuid;
  v_salon1_id    uuid;
  v_loc1_id      uuid;
  v_salon2_id    uuid;
  v_loc2_id      uuid;
  v_service1_id  uuid;
  v_service2_id  uuid;
  v_employee_id  uuid;
  v_employee_user_id uuid;
  v_appt_id      uuid;
BEGIN

  -- ── 0. Buscar el usuario ───────────────────────────────────────────────────
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jose.est.sab@gmail.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario jose.est.sab@gmail.com no encontrado en auth.users. Inicia sesión primero desde la app.';
  END IF;
  RAISE NOTICE 'Usuario encontrado: %', v_user_id;

  -- ── 1. Moneda EUR (reutilizar si existe) ───────────────────────────────────
  SELECT id INTO v_currency_id FROM public.currencies WHERE code = 'EUR' LIMIT 1;
  IF v_currency_id IS NULL THEN
    INSERT INTO public.currencies (code, name, symbol)
    VALUES ('EUR', 'Euro', '€')
    RETURNING id INTO v_currency_id;
  END IF;

  -- ── 2. Salón 1: Studio Noir ────────────────────────────────────────────────
  INSERT INTO public.salons (name, description, active)
  VALUES ('Studio Noir', 'Peluquería premium en el corazón de la ciudad', true)
  RETURNING id INTO v_salon1_id;

  -- Sede de Studio Noir
  INSERT INTO public.salon_locations (salon_id, name, address, city, active)
  VALUES (v_salon1_id, 'Studio Noir - Centro', 'Calle Gran Vía, 42', 'Madrid', true)
  RETURNING id INTO v_loc1_id;

  -- ── 3. Servicio: Corte y Peinado ──────────────────────────────────────────
  INSERT INTO public.services (location_id, name, description, duration_minutes, price, currency_id, active)
  VALUES (v_loc1_id, 'Corte y Peinado', 'Corte personalizado con secado y peinado', 60, 45.00, v_currency_id, true)
  RETURNING id INTO v_service1_id;

  -- ── 4. Empleado ficticio para Studio Noir ─────────────────────────────────
  -- Necesitamos un user para el empleado (usamos el propio usuario como workaround de seed)
  -- En producción cada empleado tendría su propio usuario
  INSERT INTO public.employees (user_id, location_id, position, active)
  VALUES (v_user_id, v_loc1_id, 'Estilista', true)
  RETURNING id INTO v_employee_id
  ON CONFLICT DO NOTHING;

  -- Fallback: si ya existía un empleado en esa location, lo usamos
  IF v_employee_id IS NULL THEN
    SELECT id INTO v_employee_id FROM public.employees WHERE location_id = v_loc1_id LIMIT 1;
  END IF;

  -- ── 5. Cita próxima para el usuario ───────────────────────────────────────
  INSERT INTO public.appointments (
    client_id,
    location_id,
    scheduled_at,
    scheduled_end,
    status,
    paid
  )
  VALUES (
    v_user_id,
    v_loc1_id,
    '2026-04-24 10:00:00+02',
    '2026-04-24 11:00:00+02',
    'confirmed',
    false
  )
  RETURNING id INTO v_appt_id;

  -- Vincular el servicio a la cita
  IF v_employee_id IS NOT NULL THEN
    INSERT INTO public.appointment_services (appointment_id, service_id, employee_id, price, duration_minutes)
    VALUES (v_appt_id, v_service1_id, v_employee_id, 45.00, 60);
  END IF;

  -- ── 6. Salón 2: Maison de Beauté ──────────────────────────────────────────
  INSERT INTO public.salons (name, description, active)
  VALUES ('Maison de Beauté', 'Cuidado capilar de lujo y peinado a medida', true)
  RETURNING id INTO v_salon2_id;

  -- Sede de Maison de Beauté
  INSERT INTO public.salon_locations (salon_id, name, address, city, active)
  VALUES (v_salon2_id, 'Maison de Beauté - Salamanca', 'Calle Serrano, 18', 'Madrid', true)
  RETURNING id INTO v_loc2_id;

  -- Servicio en Maison: Tratamiento de cortesía
  INSERT INTO public.services (location_id, name, description, duration_minutes, price, currency_id, active)
  VALUES (v_loc2_id, 'Tratamiento de cortesía', 'Mascarilla nutritiva con cualquier corte', 30, 0.00, v_currency_id, true)
  RETURNING id INTO v_service2_id;

  -- ── 7. Salón favorito del usuario: Maison de Beauté ───────────────────────
  INSERT INTO public.favorite_locations (user_id, location_id)
  VALUES (v_user_id, v_loc2_id)
  ON CONFLICT DO NOTHING;

  -- ── 8. Review de 4.7 en Maison de Beauté ─────────────────────────────────
  INSERT INTO public.reviews (user_id, location_id, rating, comment)
  VALUES (v_user_id, v_loc2_id, 5, 'Experiencia increíble, el mejor salón de Madrid.')
  ON CONFLICT DO NOTHING;

  -- ── 9. Campaigns activas ──────────────────────────────────────────────────
  INSERT INTO public.campaigns (location_id, name, type, active, start_date, end_date)
  VALUES
    (v_loc1_id, '20% de descuento mañana a las 7 AM', 'discount', true, NOW(), NOW() + INTERVAL '30 days'),
    (v_loc1_id, 'Tratamiento de cortesía con cualquier corte', 'gift', true, NOW(), NOW() + INTERVAL '60 days');

  RAISE NOTICE '✅ Seed completado para usuario %', v_user_id;
  RAISE NOTICE '   Salón 1 (Studio Noir) location: %', v_loc1_id;
  RAISE NOTICE '   Salón 2 (Maison de Beauté) location: %', v_loc2_id;
  RAISE NOTICE '   Cita ID: %', v_appt_id;

END $$;
