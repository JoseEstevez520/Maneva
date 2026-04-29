-- Ejecutar en Supabase SQL Editor (una sola vez)

-- 1. Unique index parcial sobre users.phone
--    Permite múltiples NULL pero impide teléfonos duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
  ON public.users (phone)
  WHERE phone IS NOT NULL AND phone != '';

-- 2. Función que busca el id de auth.users por teléfono.
--    Necesaria en handle-whatsapp cuando createUser falla por teléfono ya registrado
--    pero public.users.phone aún no está relleno.
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_phone(p_phone text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users WHERE phone = p_phone LIMIT 1;
$$;
