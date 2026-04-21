-- Mapa de renomeação aplicado nos arquivos /public/images/.
-- Atualiza tanto a coluna principal (.png ou .jpg) quanto as variantes -md.jpg / -sm.jpg.

-- Helper: usa REPLACE() em todas as colunas relevantes.
-- Cada chamada é um substring match: "/images/project-01" → "/images/casa-paineira-..."
-- Como os sufixos .png/.jpg/-md.jpg/-sm.jpg vêm DEPOIS, a substituição cobre todas as variantes.

-- ====== projects.cover_url / cover_url_md / cover_url_sm ======
UPDATE projects SET
  cover_url    = REPLACE(cover_url,    '/images/project-01', '/images/casa-paineira-pavilhao-concreto-ipe-uberlandia'),
  cover_url_md = REPLACE(cover_url_md, '/images/project-01', '/images/casa-paineira-pavilhao-concreto-ipe-uberlandia'),
  cover_url_sm = REPLACE(cover_url_sm, '/images/project-01', '/images/casa-paineira-pavilhao-concreto-ipe-uberlandia')
WHERE slug = 'casa-paineira';

UPDATE projects SET
  cover_url    = REPLACE(cover_url,    '/images/project-02', '/images/casa-jequitiba-interior-contemporaneo-brasileiro'),
  cover_url_md = REPLACE(cover_url_md, '/images/project-02', '/images/casa-jequitiba-interior-contemporaneo-brasileiro'),
  cover_url_sm = REPLACE(cover_url_sm, '/images/project-02', '/images/casa-jequitiba-interior-contemporaneo-brasileiro')
WHERE slug = 'casa-jequitiba';

UPDATE projects SET
  cover_url    = REPLACE(cover_url,    '/images/project-03', '/images/apartamento-higienopolis-design-interiores-walnut'),
  cover_url_md = REPLACE(cover_url_md, '/images/project-03', '/images/apartamento-higienopolis-design-interiores-walnut'),
  cover_url_sm = REPLACE(cover_url_sm, '/images/project-03', '/images/apartamento-higienopolis-design-interiores-walnut')
WHERE slug = 'apto-higienopolis';

UPDATE projects SET
  cover_url    = REPLACE(cover_url,    '/images/project-04', '/images/casa-pau-brasil-residencia-praia-cantilever'),
  cover_url_md = REPLACE(cover_url_md, '/images/project-04', '/images/casa-pau-brasil-residencia-praia-cantilever'),
  cover_url_sm = REPLACE(cover_url_sm, '/images/project-04', '/images/casa-pau-brasil-residencia-praia-cantilever')
WHERE slug = 'casa-pau-brasil';

UPDATE projects SET
  cover_url    = REPLACE(cover_url,    '/images/project-05', '/images/restaurante-takka-arquitetura-comercial-gastronomica'),
  cover_url_md = REPLACE(cover_url_md, '/images/project-05', '/images/restaurante-takka-arquitetura-comercial-gastronomica'),
  cover_url_sm = REPLACE(cover_url_sm, '/images/project-05', '/images/restaurante-takka-arquitetura-comercial-gastronomica')
WHERE slug = 'restaurante-takka';

UPDATE projects SET
  cover_url    = REPLACE(cover_url,    '/images/project-06', '/images/fazenda-porto-arquitetura-rural-taipa-minas-gerais'),
  cover_url_md = REPLACE(cover_url_md, '/images/project-06', '/images/fazenda-porto-arquitetura-rural-taipa-minas-gerais'),
  cover_url_sm = REPLACE(cover_url_sm, '/images/project-06', '/images/fazenda-porto-arquitetura-rural-taipa-minas-gerais')
WHERE slug = 'fazenda-porto';

-- ====== project_images.url / url_md / url_sm ======
-- Aplica o mesmo mapeamento globalmente em toda a tabela (REPLACE não faz nada se não encontrar).
DO $$
DECLARE
  pair RECORD;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('/images/project-01',         '/images/casa-paineira-pavilhao-concreto-ipe-uberlandia'),
    ('/images/project-02',         '/images/casa-jequitiba-interior-contemporaneo-brasileiro'),
    ('/images/project-03',         '/images/apartamento-higienopolis-design-interiores-walnut'),
    ('/images/project-04',         '/images/casa-pau-brasil-residencia-praia-cantilever'),
    ('/images/project-05',         '/images/restaurante-takka-arquitetura-comercial-gastronomica'),
    ('/images/project-06',         '/images/fazenda-porto-arquitetura-rural-taipa-minas-gerais'),
    ('/images/veranda',            '/images/varanda-deck-ipe-casa-uberlandia'),
    ('/images/ambience-corridor',  '/images/corredor-iluminacao-natural-arquitetura-residencial'),
    ('/images/detail-materials',   '/images/detalhe-materiais-madeira-concreto-arquitetura-brasileira'),
    ('/images/stair-detail',       '/images/escada-escultorica-madeira-macica-design-interiores'),
    ('/images/intro-texture',      '/images/textura-concreto-apicoado-arquitetura-contemporanea')
  ) AS m(old, new) LOOP
    UPDATE project_images SET
      url    = REPLACE(url,    pair.old, pair.new),
      url_md = REPLACE(url_md, pair.old, pair.new),
      url_sm = REPLACE(url_sm, pair.old, pair.new);
  END LOOP;
END$$;