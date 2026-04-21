// Fonte única de verdade dos projetos do estúdio.
// Cada projeto alimenta tanto a seção de destaque da home quanto
// a página /portfolio e as páginas /projeto/:slug.

export type ProjectImage = {
  src: string;
  srcMd?: string | null;
  srcSm?: string | null;
  blurDataUrl?: string | null;
  alt: string;
  caption?: string;
  // tamanho no grid da página de projeto: "full" | "half" | "tall" | "wide"
  format?: "full" | "half" | "tall" | "wide";
};

export type Project = {
  slug: string;
  number: string; // "01" .. "06"
  title: string;
  em: string;
  tag: "Residencial" | "Interiores" | "Comercial" | "Rural";
  year: string;
  location: string;
  area: string;
  status: "Em obra" | "Concluído" | "Em projeto";
  cover: string;
  coverMd?: string | null;
  coverSm?: string | null;
  coverBlurDataUrl?: string | null;
  alt: string;
  summary: string; // usado na página de portfólio (1-2 linhas)
  intro: string; // parágrafo na página do projeto
  program: string;
  materials: string[];
  team: string;
  photographer: string;
  gallery: ProjectImage[];
  // SEO opcional por projeto (vem do admin)
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  updatedAt?: string | null;
};

export const PROJECTS: Project[] = [
  {
    slug: "casa-paineira",
    number: "01",
    title: "Casa",
    em: "Paineira",
    tag: "Residencial",
    year: "2026",
    location: "Itaim da Serra, SP",
    area: "420 m²",
    status: "Em obra",
    cover: "/images/casa-paineira-pavilhao-concreto-ipe-uberlandia.jpg",
    coverMd: "/images/casa-paineira-pavilhao-concreto-ipe-uberlandia-md.jpg",
    coverSm: "/images/casa-paineira-pavilhao-concreto-ipe-uberlandia-sm.jpg",
    alt: "Casa Paineira em Itaim da Serra/SP — pavilhão residencial horizontal em concreto aparente apicoado e ipê tauari, projetado por Lorena Alves Arquitetura, estúdio de Uberlândia/MG",
    summary:
      "Pavilhão horizontal de concreto e ipê que se abre para uma paineira centenária.",
    intro:
      "Uma casa desenhada ao redor de uma árvore. O programa se organiza em um pavilhão horizontal com cobertura leve, alinhado ao eixo da paineira existente. O estar principal se dissolve no jardim, enquanto os dormitórios ganham autonomia e silêncio em um volume recuado, voltado para o nascente.",
    program: "Residência unifamiliar · 4 suítes · escritório · ateliê",
    materials: [
      "concreto aparente apicoado",
      "ipê tauari",
      "cerâmica artesanal",
      "linho natural",
    ],
    team: "Lorena Alves Arquitetura · Paisagismo Gilberto Elkis",
    photographer: "Fran Parente",
    gallery: [
      { src: "/images/casa-paineira-pavilhao-concreto-ipe-uberlandia.png", alt: "Fachada principal da Casa Paineira em concreto aparente apicoado com pilares e brises em ipê tauari, vista frontal ao entardecer", format: "full" },
      { src: "/images/varanda-deck-ipe-casa-uberlandia.png", alt: "Varanda suspensa da Casa Paineira com piso em deck de ipê e guarda-corpo metálico fino, integrada ao jardim tropical", format: "wide" },
      { src: "/images/corredor-iluminacao-natural-arquitetura-residencial.png", alt: "Corredor interno residencial banhado por luz rasante natural vinda de rasgo zenital, paredes em concreto aparente", format: "tall" },
      { src: "/images/detalhe-materiais-madeira-concreto-arquitetura-brasileira.png", alt: "Detalhe construtivo da Casa Paineira mostrando encontro entre parede em taipa, viga de madeira maciça e piso em cerâmica artesanal", format: "half" },
      { src: "/images/escada-escultorica-madeira-macica-design-interiores.png", alt: "Escada escultórica em madeira maciça de ipê com degraus em balanço, integrada ao volume residencial", format: "half" },
      { src: "/images/textura-concreto-apicoado-arquitetura-contemporanea.png", alt: "Textura macro de parede em concreto aparente apicoado artesanalmente, com nuances de cor e profundidade", format: "full" },
    ],
  },
  {
    slug: "casa-jequitiba",
    number: "02",
    title: "Casa",
    em: "Jequitibá",
    tag: "Interiores",
    year: "2025",
    location: "Jardim Europa, São Paulo, SP",
    area: "380 m²",
    status: "Concluído",
    cover: "/images/casa-jequitiba-interior-contemporaneo-brasileiro.jpg",
    coverMd: "/images/casa-jequitiba-interior-contemporaneo-brasileiro-md.jpg",
    coverSm: "/images/casa-jequitiba-interior-contemporaneo-brasileiro-sm.jpg",
    alt: "Casa Jequitibá no Jardim Europa, São Paulo/SP — projeto de design de interiores em residência modernista dos anos 70 com curadoria de mobiliário brasileiro contemporâneo, por Lorena Alves Arquitetura",
    summary:
      "Retrofit de interiores que devolve à casa a brasilidade que ela sempre teve.",
    intro:
      "Projeto de interiores em uma residência modernista dos anos 70. A intervenção preservou a estrutura original e introduziu uma curadoria de mobiliário autoral brasileiro contemporâneo, conversando com peças de design clássico do acervo da família. O resultado é uma casa que atravessa gerações sem perder o presente.",
    program: "Interiores completos · sala, jantar, cozinha, 3 suítes",
    materials: [
      "jequitibá-rosa",
      "linho cru",
      "travertino romano",
      "bronze escovado",
    ],
    team: "Lorena Alves Arquitetura · Styling Babi Teixeira",
    photographer: "Maíra Acayaba",
    gallery: [
      { src: "/images/casa-jequitiba-interior-contemporaneo-brasileiro.png", alt: "Sala de estar da Casa Jequitibá com curadoria de mobiliário autoral brasileiro contemporâneo, sofá em linho cru e mesa de centro em jequitibá-rosa", format: "full" },
      { src: "/images/corredor-iluminacao-natural-arquitetura-residencial.png", alt: "Hall de entrada com piso em taco de madeira envelhecido restaurado e parede em estuque queimado", format: "half" },
      { src: "/images/detalhe-materiais-madeira-concreto-arquitetura-brasileira.png", alt: "Detalhe de marcenaria em jequitibá-rosa com puxador em bronze escovado, projeto de interiores residencial", format: "half" },
      { src: "/images/escada-escultorica-madeira-macica-design-interiores.png", alt: "Escada modernista existente da Casa Jequitibá com guarda-corpo em ferro restaurado e degraus em granito preto", format: "tall" },
      { src: "/images/varanda-deck-ipe-casa-uberlandia.png", alt: "Varanda integrada ao jardim residencial com piso em pedra portuguesa e mobiliário de exterior em corda náutica", format: "wide" },
    ],
  },
  {
    slug: "apto-higienopolis",
    number: "03",
    title: "Apto.",
    em: "Higienópolis",
    tag: "Residencial",
    year: "2025",
    location: "Higienópolis, São Paulo, SP",
    area: "210 m²",
    status: "Concluído",
    cover: "/images/apartamento-higienopolis-design-interiores-walnut.jpg",
    coverMd: "/images/apartamento-higienopolis-design-interiores-walnut-md.jpg",
    coverSm: "/images/apartamento-higienopolis-design-interiores-walnut-sm.jpg",
    alt: "Apartamento em Higienópolis, São Paulo/SP — projeto residencial de 210 m² em edifício modernista com estante-escultura em american walnut e travertino clássico, por Lorena Alves Arquitetura",
    summary:
      "Apartamento em edifício histórico com estante-escultura em walnut e travertino.",
    intro:
      "Um apartamento em edifício modernista recebe uma intervenção precisa: a planta foi reorganizada ao redor de uma grande estante-escultura em walnut, que atravessa o social e redesenha a relação entre sala, jantar e escritório. Mobiliário baixo e paleta quente preservam a luz natural existente.",
    program: "Residência · estar, jantar, cozinha, 2 suítes, escritório",
    materials: [
      "american walnut",
      "travertino clássico",
      "linho cru",
      "cortiça natural",
    ],
    team: "Lorena Alves Arquitetura",
    photographer: "Ruy Teixeira",
    gallery: [
      { src: "/images/apartamento-higienopolis-design-interiores-walnut.png", alt: "Sala social do Apartamento Higienópolis com estante-escultura em american walnut atravessando todo o ambiente, sofá baixo em linho cru e tapete em cortiça natural", format: "full" },
      { src: "/images/detalhe-materiais-madeira-concreto-arquitetura-brasileira.png", alt: "Detalhe da estante em american walnut com prateleiras em travertino clássico, projeto de design de interiores residencial", format: "half" },
      { src: "/images/corredor-iluminacao-natural-arquitetura-residencial.png", alt: "Corredor do apartamento com boiserie contemporânea em walnut e iluminação rasante embutida no rodapé", format: "half" },
      { src: "/images/textura-concreto-apicoado-arquitetura-contemporanea.png", alt: "Textura macro de painel em american walnut com veios naturais marcantes, marcenaria autoral", format: "wide" },
    ],
  },
  {
    slug: "casa-pau-brasil",
    number: "04",
    title: "Casa",
    em: "Pau-Brasil",
    tag: "Residencial",
    year: "2025",
    location: "Guarujá, SP",
    area: "560 m²",
    status: "Concluído",
    cover: "/images/casa-pau-brasil-residencia-praia-cantilever.jpg",
    coverMd: "/images/casa-pau-brasil-residencia-praia-cantilever-md.jpg",
    coverSm: "/images/casa-pau-brasil-residencia-praia-cantilever-sm.jpg",
    alt: "Casa Pau-Brasil em Guarujá/SP — residência de praia de 560 m² em estrutura de concreto protendido com volume social em cantiléver de 12 metros sobre o mar, projeto de Lorena Alves Arquitetura",
    summary:
      "Casa de praia em cantiléver de concreto, voltada para o horizonte do Atlântico.",
    intro:
      "Casa de veraneio implantada em encosta, com o volume social em balanço sobre o terreno. A estrutura em concreto protendido permite um vão de 12 metros sem pilares, liberando a vista para o mar. O programa íntimo se enterra na pedra existente, garantindo frescor e penumbra controlada.",
    program: "Casa de praia · 5 suítes · estúdio · piscina natural",
    materials: [
      "concreto protendido",
      "pau-brasil (reflorestamento)",
      "pedra da região",
      "esquadria naval em alumínio",
    ],
    team: "Lorena Alves Arquitetura · Estrutura Kurkdjian+Fruchtengarten",
    photographer: "Fernando Guerra",
    gallery: [
      { src: "/images/casa-pau-brasil-residencia-praia-cantilever.png", alt: "Volume social da Casa Pau-Brasil em cantiléver de concreto protendido sobre a encosta de Guarujá/SP, com vão livre de 12 metros voltado para o oceano Atlântico", format: "full" },
      { src: "/images/varanda-deck-ipe-casa-uberlandia.png", alt: "Varanda da casa de praia com piso em pau-brasil de reflorestamento e parapeito em vidro voltado para o mar", format: "wide" },
      { src: "/images/escada-escultorica-madeira-macica-design-interiores.png", alt: "Escada esculpida em pedra bruta da região conectando a piscina natural ao volume residencial", format: "tall" },
      { src: "/images/corredor-iluminacao-natural-arquitetura-residencial.png", alt: "Corredor interno em penumbra controlada com paredes em concreto e teto baixo, conduzindo às suítes", format: "half" },
      { src: "/images/detalhe-materiais-madeira-concreto-arquitetura-brasileira.png", alt: "Detalhe de encontro entre concreto aparente e ripado de pau-brasil em residência de praia", format: "half" },
    ],
  },
  {
    slug: "restaurante-takka",
    number: "05",
    title: "Restaurante",
    em: "Takka",
    tag: "Comercial",
    year: "2024",
    location: "Pinheiros, São Paulo, SP",
    area: "280 m²",
    status: "Concluído",
    cover: "/images/restaurante-takka-arquitetura-comercial-gastronomica.jpg",
    coverMd: "/images/restaurante-takka-arquitetura-comercial-gastronomica-md.jpg",
    coverSm: "/images/restaurante-takka-arquitetura-comercial-gastronomica-sm.jpg",
    alt: "Restaurante Takka em Pinheiros, São Paulo/SP — arquitetura comercial e gastronômica de 280 m² com banquettes em couro caramelo, balcão em travertino escuro e marcenaria em carvalho fumê, por Lorena Alves Arquitetura",
    summary:
      "Restaurante autoral com banquettes em couro caramelo e balcão em travertino.",
    intro:
      "Projeto integral para um restaurante de cozinha contemporânea brasileira. A planta foi desenhada como uma sequência de ambientes — bar, salão e sala privada — ligados por uma longa banqueta de couro caramelo. A paleta escura realça a luz pontual sobre cada mesa e cria a sensação de recolhimento mesmo no cheio.",
    program: "Restaurante · 80 assentos · bar · sala privada · cozinha",
    materials: [
      "couro caramelo",
      "travertino escuro",
      "carvalho fumê",
      "latão envelhecido",
    ],
    team: "Lorena Alves Arquitetura · Iluminação Ricardo Heder",
    photographer: "Pedro Kok",
    gallery: [
      { src: "/images/restaurante-takka-arquitetura-comercial-gastronomica.png", alt: "Salão principal do Restaurante Takka em Pinheiros/SP com banquettes corridas em couro caramelo, mesas em carvalho fumê e iluminação pontual sobre cada lugar", format: "full" },
      { src: "/images/detalhe-materiais-madeira-concreto-arquitetura-brasileira.png", alt: "Detalhe de banqueta em couro caramelo com costuras aparentes e estrutura em latão envelhecido, projeto de arquitetura comercial", format: "half" },
      { src: "/images/corredor-iluminacao-natural-arquitetura-residencial.png", alt: "Corredor que conduz à sala privada do restaurante com paredes em estuque escuro e iluminação rasante baixa", format: "half" },
      { src: "/images/textura-concreto-apicoado-arquitetura-contemporanea.png", alt: "Textura macro de couro caramelo natural com veios e marcas, revestimento de banquette em projeto gastronômico", format: "wide" },
    ],
  },
  {
    slug: "fazenda-porto",
    number: "06",
    title: "Fazenda",
    em: "Porto",
    tag: "Rural",
    year: "2024",
    location: "Serra da Canastra, MG",
    area: "1.200 m² (conjunto)",
    status: "Concluído",
    cover: "/images/fazenda-porto-arquitetura-rural-taipa-minas-gerais.jpg",
    coverMd: "/images/fazenda-porto-arquitetura-rural-taipa-minas-gerais-md.jpg",
    coverSm: "/images/fazenda-porto-arquitetura-rural-taipa-minas-gerais-sm.jpg",
    alt: "Fazenda Porto na Serra da Canastra/MG — conjunto rural de 1.200 m² em taipa de pilão, pau-a-pique e telha cerâmica artesanal, em diálogo com a arquitetura colonial mineira, por Lorena Alves Arquitetura",
    summary:
      "Conjunto rural em taipa de pilão e telha cerâmica, em diálogo com a arquitetura colonial mineira.",
    intro:
      "Requalificação da sede de uma fazenda centenária e construção de três novos pavilhões: casa de hóspedes, ateliê e celeiro. A intervenção foi feita com técnicas tradicionais — taipa de pilão, pau-a-pique, telha cerâmica artesanal — executadas por mestres da região. A obra é também um programa de preservação de ofícios.",
    program: "Sede + 3 pavilhões · programa rural completo",
    materials: [
      "taipa de pilão",
      "pau-a-pique",
      "telha cerâmica artesanal",
      "pedra da região",
    ],
    team: "Lorena Alves Arquitetura · Mestres construtores da Canastra",
    photographer: "Leonardo Finotti",
    gallery: [
      { src: "/images/fazenda-porto-arquitetura-rural-taipa-minas-gerais.png", alt: "Pavilhão principal da Fazenda Porto na Serra da Canastra/MG com paredes em taipa de pilão, cobertura em telha cerâmica artesanal e estrutura aparente em madeira de lei", format: "full" },
      { src: "/images/detalhe-materiais-madeira-concreto-arquitetura-brasileira.png", alt: "Detalhe construtivo de parede em taipa de pilão com viga em peroba aparente, técnica colonial mineira aplicada em arquitetura rural contemporânea", format: "half" },
      { src: "/images/escada-escultorica-madeira-macica-design-interiores.png", alt: "Escada em madeira maciça de peroba com degraus brutos, conectando pavimentos em pavilhão rural mineiro", format: "half" },
      { src: "/images/varanda-deck-ipe-casa-uberlandia.png", alt: "Varanda coberta da Fazenda Porto com cobertura em telha cerâmica artesanal, piso em pedra da região e cadeiras de balanço em madeira", format: "wide" },
      { src: "/images/corredor-iluminacao-natural-arquitetura-residencial.png", alt: "Corredor interno do pavilhão rural com piso em ladrilho hidráulico de padrão colonial e paredes caiadas", format: "full" },
    ],
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export function getNextProject(slug: string): Project {
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  return PROJECTS[(i + 1) % PROJECTS.length];
}
