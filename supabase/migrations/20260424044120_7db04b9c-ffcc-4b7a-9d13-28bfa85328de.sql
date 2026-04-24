-- Pré-popular a tabela seo_404_log com redirects 301 curados para variações
-- comuns de URLs que costumam gerar 404 (erros de digitação, idioma, sufixos
-- antigos como .html / index.html, plurais, sinônimos das seções).
--
-- A NotFoundPage já consulta esta tabela: quando status='redirect' e
-- redirect_to está preenchido, o visitante é redirecionado automaticamente.

INSERT INTO public.seo_404_log (path, source, status, redirect_to, hits, notes) VALUES
  -- Variações de Portfólio
  ('/portifolio',          'manual', 'redirect', '/portfolio', 0, 'Erro ortográfico comum'),
  ('/portfólio',           'manual', 'redirect', '/portfolio', 0, 'Acento — URL canônica é sem acento'),
  ('/portfolios',          'manual', 'redirect', '/portfolio', 0, 'Plural'),
  ('/projetos',            'manual', 'redirect', '/portfolio', 0, 'Sinônimo PT'),
  ('/obras',               'manual', 'redirect', '/portfolio', 0, 'Sinônimo PT'),
  ('/trabalhos',           'manual', 'redirect', '/portfolio', 0, 'Sinônimo PT'),
  ('/projects',            'manual', 'redirect', '/portfolio', 0, 'Sinônimo EN'),
  ('/work',                'manual', 'redirect', '/portfolio', 0, 'Sinônimo EN'),
  ('/works',               'manual', 'redirect', '/portfolio', 0, 'Sinônimo EN'),
  ('/portfolio.html',      'manual', 'redirect', '/portfolio', 0, 'Sufixo .html antigo'),
  ('/portfolio/index.html','manual', 'redirect', '/portfolio', 0, 'index.html antigo'),

  -- Variações de Sobre / Estúdio
  ('/sobre-nos',           'manual', 'redirect', '/sobre',     0, 'Variação comum'),
  ('/sobre-mim',           'manual', 'redirect', '/sobre',     0, 'Variação comum'),
  ('/about',               'manual', 'redirect', '/sobre',     0, 'Sinônimo EN'),
  ('/about-us',            'manual', 'redirect', '/sobre',     0, 'Sinônimo EN'),
  ('/estudio',             'manual', 'redirect', '/sobre',     0, 'Sinônimo PT'),
  ('/escritorio',          'manual', 'redirect', '/sobre',     0, 'Sinônimo PT'),
  ('/quem-somos',          'manual', 'redirect', '/sobre',     0, 'Sinônimo PT'),
  ('/sobre.html',          'manual', 'redirect', '/sobre',     0, 'Sufixo .html antigo'),
  ('/sobre/index.html',    'manual', 'redirect', '/sobre',     0, 'index.html antigo'),

  -- Variações de Blog
  ('/blogs',               'manual', 'redirect', '/blog',      0, 'Plural'),
  ('/noticias',            'manual', 'redirect', '/blog',      0, 'Sinônimo PT'),
  ('/artigos',             'manual', 'redirect', '/blog',      0, 'Sinônimo PT'),
  ('/posts',               'manual', 'redirect', '/blog',      0, 'Sinônimo EN'),
  ('/news',                'manual', 'redirect', '/blog',      0, 'Sinônimo EN'),
  ('/blog.html',           'manual', 'redirect', '/blog',      0, 'Sufixo .html antigo'),
  ('/blog/index.html',     'manual', 'redirect', '/blog',      0, 'index.html antigo'),

  -- Variações de FAQ
  ('/perguntas',           'manual', 'redirect', '/faq',       0, 'Sinônimo PT'),
  ('/perguntas-frequentes','manual', 'redirect', '/faq',       0, 'Sinônimo PT'),
  ('/duvidas',             'manual', 'redirect', '/faq',       0, 'Sinônimo PT'),
  ('/help',                'manual', 'redirect', '/faq',       0, 'Sinônimo EN'),

  -- Contato → home (seção #contato)
  ('/contato',             'manual', 'redirect', '/#contato',  0, 'Contato vive como seção da home'),
  ('/contact',             'manual', 'redirect', '/#contato',  0, 'Sinônimo EN'),
  ('/fale-conosco',        'manual', 'redirect', '/#contato',  0, 'Sinônimo PT'),
  ('/orcamento',           'manual', 'redirect', '/#contato',  0, 'Sinônimo PT — orçamento'),

  -- Privacidade
  ('/politica-de-privacidade', 'manual', 'redirect', '/privacidade', 0, 'Variação comum'),
  ('/privacy',                 'manual', 'redirect', '/privacidade', 0, 'Sinônimo EN'),
  ('/privacy-policy',          'manual', 'redirect', '/privacidade', 0, 'Sinônimo EN'),

  -- Home — variações comuns de raiz
  ('/home',                'manual', 'redirect', '/',          0, 'Sinônimo EN'),
  ('/inicio',              'manual', 'redirect', '/',          0, 'Sinônimo PT'),
  ('/index',               'manual', 'redirect', '/',          0, 'index sem extensão'),
  ('/index.html',          'manual', 'redirect', '/',          0, 'index.html antigo'),
  ('/index.php',           'manual', 'redirect', '/',          0, 'index.php legado'),

  -- Hash literal — alguns sistemas viram a URL #/portfolio em /%23/portfolio
  ('/%23/portfolio',       'manual', 'redirect', '/portfolio', 0, 'Hash legado escapado'),
  ('/%23/blog',            'manual', 'redirect', '/blog',      0, 'Hash legado escapado'),
  ('/%23/sobre',           'manual', 'redirect', '/sobre',     0, 'Hash legado escapado'),

  -- Singular legado de projeto — quem digitar /projeto vai para o portfolio
  ('/projeto',             'manual', 'redirect', '/portfolio', 0, 'Sem slug — manda para a lista')
ON CONFLICT (path) DO UPDATE
  SET status = EXCLUDED.status,
      redirect_to = EXCLUDED.redirect_to,
      notes = COALESCE(public.seo_404_log.notes, EXCLUDED.notes),
      source = CASE
                 WHEN public.seo_404_log.source = 'auto' THEN 'auto'
                 ELSE EXCLUDED.source
               END;