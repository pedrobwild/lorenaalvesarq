-- Tabela de FAQs gerenciados pelo admin
CREATE TABLE public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para ordenação rápida
CREATE INDEX idx_faq_items_order ON public.faq_items (order_index);
CREATE INDEX idx_faq_items_visible_order ON public.faq_items (visible, order_index);

-- RLS
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- Leitura pública apenas de itens visíveis
CREATE POLICY "public read visible faq"
  ON public.faq_items
  FOR SELECT
  USING (visible = true);

-- Admin gerencia tudo (mesmo padrão das outras tabelas do projeto)
CREATE POLICY "admin all faq"
  ON public.faq_items
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger updated_at usando a função pública existente set_updated_at
CREATE TRIGGER set_faq_items_updated_at
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Seed com os 7 FAQs atuais
INSERT INTO public.faq_items (question, answer, order_index, visible) VALUES
('O estúdio atende em Uberlândia e em outras cidades?',
 'Sim. A base do estúdio é em Uberlândia/MG, mas atendemos projetos em todo o Triângulo Mineiro, em Minas Gerais e em outros estados. Para projetos fora da região, organizamos visitas técnicas presenciais nas etapas-chave e fazemos o acompanhamento contínuo de obra à distância, com equipe parceira em campo.',
 10, true),
('Quais tipos de projeto vocês desenvolvem?',
 'Trabalhamos com arquitetura residencial (casas e apartamentos de alto padrão), interiores autorais, retrofit de edificações existentes e projetos comerciais selecionados — sobretudo restaurantes, hospitalidade e espaços de marca que pedem assinatura material precisa.',
 20, true),
('Como funciona o processo, do primeiro contato à entrega?',
 'São seis etapas: escuta (briefing aprofundado), conceito (estudo preliminar), projeto executivo, interiores e curadoria, acompanhamento semanal de obra e entrega com styling. Cada fase tem cronograma claro e entregáveis definidos antes de avançar para a próxima.',
 30, true),
('Quanto tempo leva um projeto de arquitetura?',
 'Um projeto residencial completo (arquitetura + interiores) leva, em média, de 5 a 9 meses até a finalização do executivo, dependendo da escala e do nível de detalhamento. A obra costuma durar de 12 a 24 meses. Cronograma personalizado é apresentado no escopo inicial.',
 40, true),
('Como é cobrado o projeto? Por metro quadrado ou por etapa?',
 'Trabalhamos com honorário por escopo, não por metro quadrado. O valor é proposto após a primeira reunião, considerando complexidade do programa, área de intervenção, nível de detalhamento e fases contratadas. O pagamento é dividido em parcelas amarradas às entregas de cada etapa.',
 50, true),
('É possível contratar só os interiores, sem o projeto de arquitetura?',
 'Sim. Atendemos projetos exclusivos de interiores e curadoria — para imóveis novos ou para reformas pontuais —, com mobiliário desenhado sob medida, seleção de peças autorais brasileiras e iluminação técnica integrada à atmosfera do espaço.',
 60, true),
('Vocês acompanham a obra ou só entregam o projeto?',
 'Acompanhamos a obra com presença semanal em campo nas etapas críticas e visitas pontuais nas demais. O escritório atua como interlocutor técnico do cliente com a construtora, garantindo que cada decisão executada permaneça fiel ao projeto e ao conceito original.',
 70, true);