-- Promove o novo usuário a admin
INSERT INTO public.admin_users (user_id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'lorena@lorenaalvesarq.com'
ON CONFLICT (user_id) DO NOTHING;

-- Atualiza o trigger para reconhecer os dois e-mails como admins automaticamente
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if new.email in ('contato@lorenaalvesarq.com', 'lorena@lorenaalvesarq.com') then
    insert into public.admin_users (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$;