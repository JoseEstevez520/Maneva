-- Ejecutar en Supabase SQL Editor (proyecto Maneva)
-- Elimina todos los datos del usuario en el orden correcto respetando las FK.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Nullificar FKs opcionales que apuntan a users (no se pueden borrar en cascada)
  update public.access_logs       set user_id = null       where user_id = v_uid;
  update public.whatsapp_messages set user_id = null       where user_id = v_uid;
  update public.appointments      set created_by = null    where created_by = v_uid;
  update public.cancellations     set cancelled_by = null  where cancelled_by = v_uid;
  update public.appointment_history set changed_by = v_uid::text
    where changed_by = v_uid::text;  -- solo si changed_by es text; ajusta si es uuid

  -- 2. Borrar datos de citas del usuario (hay que respetar el orden de las FK hijas)
  delete from public.product_usage
    where appointment_id in (select id from public.appointments where client_id = v_uid);

  delete from public.payments
    where appointment_id in (select id from public.appointments where client_id = v_uid);

  delete from public.invoice_line
    where appointment_id in (select id from public.appointments where client_id = v_uid);

  delete from public.appointment_services
    where appointment_id in (select id from public.appointments where client_id = v_uid);

  delete from public.appointment_history
    where appointment_id in (select id from public.appointments where client_id = v_uid);

  delete from public.cancellations
    where appointment_id in (select id from public.appointments where client_id = v_uid);

  delete from public.appointments where client_id = v_uid;

  -- 3. Facturas
  delete from public.invoice_line
    where invoice_id in (select id from public.invoices where client_id = v_uid);

  delete from public.invoices where client_id = v_uid;

  -- 4. Reseñas
  delete from public.review_employees
    where review_id in (select id from public.reviews where user_id = v_uid);

  delete from public.reviews where user_id = v_uid;

  -- 5. Resto de datos del usuario
  delete from public.favorite_locations where user_id = v_uid;
  delete from public.notifications      where user_id = v_uid;
  delete from public.sessions           where user_id = v_uid;
  delete from public.linked_profiles    where primary_user_id = v_uid
                                           or secondary_user_id = v_uid;
  delete from public.user_preferences  where user_id = v_uid;
  delete from public.user_profiles      where user_id = v_uid;
  delete from public.user_roles         where user_id = v_uid;

  -- 6. Perfil principal
  delete from public.users where id = v_uid;

  -- 7. Cuenta de autenticación (invalida el JWT)
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
