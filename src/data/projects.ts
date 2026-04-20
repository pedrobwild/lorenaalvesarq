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
    cover: "/images/project-01.jpg",
    coverMd: "/images/project-01-md.jpg",
    coverSm: "/images/project-01-sm.jpg",
    alt: "Casa Paineira — pavilhão horizontal de concreto e ipê",
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
      { src: "/images/project-01.png", alt: "Fachada principal em concreto e ipê", format: "full" },
      { src: "/images/veranda.png", alt: "Varanda suspensa com deck em ipê", format: "wide" },
      { src: "/images/ambience-corridor.png", alt: "Corredor interno iluminado por luz rasante", format: "tall" },
      { src: "/images/detail-materials.png", alt: "Detalhe construtivo com taipa e madeira", format: "half" },
      { src: "/images/stair-detail.png", alt: "Escada escultórica em madeira maciça", format: "half" },
      { src: "/images/intro-texture.png", alt: "Textura de parede em concreto apicoado", format: "full" },
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
    cover: "/images/project-02.png",
    alt: "Casa Jequitibá — interior contemporâneo brasileiro",
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
      { src: "/images/project-02.png", alt: "Sala de estar com curadoria de mobiliário brasileiro", format: "full" },
      { src: "/images/ambience-corridor.png", alt: "Hall com piso em taco de madeira envelhecido", format: "half" },
      { src: "/images/detail-materials.png", alt: "Detalhe de marcenaria em jequitibá", format: "half" },
      { src: "/images/stair-detail.png", alt: "Escada existente com guarda-corpo restaurado", format: "tall" },
      { src: "/images/veranda.png", alt: "Varanda com vista para o jardim", format: "wide" },
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
    cover: "/images/project-03.png",
    alt: "Apartamento Higienópolis — sala com estante em walnut",
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
      { src: "/images/project-03.png", alt: "Sala com estante em walnut", format: "full" },
      { src: "/images/detail-materials.png", alt: "Detalhe da estante com travertino", format: "half" },
      { src: "/images/ambience-corridor.png", alt: "Corredor com boiserie contemporânea", format: "half" },
      { src: "/images/intro-texture.png", alt: "Textura de madeira em escala macro", format: "wide" },
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
    cover: "/images/project-04.png",
    alt: "Casa Pau-Brasil — residência de praia com volume cantilevered",
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
      { src: "/images/project-04.png", alt: "Volume em cantilever sobre a encosta", format: "full" },
      { src: "/images/veranda.png", alt: "Varanda voltada para o mar", format: "wide" },
      { src: "/images/stair-detail.png", alt: "Escada esculpida em pedra bruta", format: "tall" },
      { src: "/images/ambience-corridor.png", alt: "Corredor interno em penumbra", format: "half" },
      { src: "/images/detail-materials.png", alt: "Detalhe de encontro concreto-madeira", format: "half" },
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
    cover: "/images/project-05.png",
    alt: "Restaurante Takka — interior sofisticado com banquettes em couro",
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
      { src: "/images/project-05.png", alt: "Salão principal com banquettes em couro", format: "full" },
      { src: "/images/detail-materials.png", alt: "Detalhe de banqueta com latão", format: "half" },
      { src: "/images/ambience-corridor.png", alt: "Corredor para sala privada", format: "half" },
      { src: "/images/intro-texture.png", alt: "Textura de couro em detalhe", format: "wide" },
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
    cover: "/images/project-06.png",
    alt: "Fazenda Porto — pavilhão rural em taipa e telha cerâmica",
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
      { src: "/images/project-06.png", alt: "Pavilhão principal em taipa de pilão", format: "full" },
      { src: "/images/detail-materials.png", alt: "Detalhe de parede em taipa e madeira", format: "half" },
      { src: "/images/stair-detail.png", alt: "Escada em madeira maciça", format: "half" },
      { src: "/images/veranda.png", alt: "Varanda coberta com telha cerâmica", format: "wide" },
      { src: "/images/ambience-corridor.png", alt: "Corredor interno com piso de ladrilho", format: "full" },
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
