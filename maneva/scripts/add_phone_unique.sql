-- Ejecutar en Supabase SQL Editor (una sola vez)

-- 1. Unique index parcial sobre users.phone
--    Permite múltiples NULL pero impide teléfonos duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
  ON public.users (phone)
  WHERE phone IS NOT NULL AND phone != '';

-- 2. Función que busca el id de auth.users por teléfono.
--    Compara solo los dígitos (ignora +, espacios, guiones) para cubrir los distintos
--    formatos que GoTrue puede almacenar (+34..., 34..., 0034...).
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_phone(p_phone text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users
  WHERE regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
  LIMIT 1;
$$;
