-- Ejecutar en Supabase SQL Editor (proyecto Maneva)
-- Crea una funcion RPC para que un usuario autenticado elimine su propia cuenta.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users
  where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
