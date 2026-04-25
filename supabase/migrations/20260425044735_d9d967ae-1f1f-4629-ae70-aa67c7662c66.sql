-- Atualiza o trigger para incluir pedro@bwild.com.br como admin autorizado
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if new.email in (
    'contato@lorenaalvesarq.com',
    'lorena@lorenaalvesarq.com',
    'pedro@bwild.com.br'
  ) then
    insert into public.admin_users (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$;

-- Concede acesso admin ao usuário já existente
INSERT INTO public.admin_users (user_id, email)
VALUES ('c6332645-7cc6-499f-87b9-a568beb343a1', 'pedro@bwild.com.br')
ON CONFLICT (user_id) DO NOTHING;