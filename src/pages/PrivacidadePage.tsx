import { useSeo, breadcrumbJsonLd } from "../lib/useSeo";
import { useSiteSettings } from "../lib/useSiteSettings";
import { track } from "../lib/analytics";
import InternalNav from "../components/InternalNav";

/**
 * Página /privacidade — Política de Privacidade (LGPD).
 * - Cumpre a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
 * - Descreve quais dados coletamos, finalidade, base legal, direitos do titular
 *   e contato do controlador.
 * - Usa mesmo layout `pf-page` do FAQ para manter consistência visual.
 */
export default function PrivacidadePage() {
  const { settings } = useSiteSettings();

  const contactEmail = settings?.contact_email || "contato@lorenaalvesarq.com";
  const lastUpdated = "21 de abril de 2026";

  useSeo({
    title:
      "Política de Privacidade — Lorena Alves Arquitetura",
    description:
      "Política de Privacidade e tratamento de dados pessoais do site Lorena Alves Arquitetura, em conformidade com a LGPD (Lei nº 13.709/2018).",
    canonicalPath: "/privacidade",
    ogType: "website",
    jsonLd: settings
      ? [
          breadcrumbJsonLd(settings, [
            { name: "Início", path: "/" },
            { name: "Política de Privacidade", path: "/privacidade" },
          ]),
        ]
      : undefined,
  });

  return (
    <div className="pf-page privacidade-page">
      {/* Top nav minimal — mesmo padrão do Portfolio/FAQ */}
      <InternalNav backLabel="voltar ao início" />

      {/* Header — H1 */}
      <header className="pf-head">
        <p className="pf-head__eyebrow mono">
          Política · Lorena Alves Arquitetura
        </p>
        <h1 className="pf-head__title">
          Política de <em>privacidade</em>.
        </h1>
        <p className="pf-head__lede">
          O estúdio Lorena Alves Arquitetura respeita sua privacidade e está
          comprometido com a transparência no tratamento de dados pessoais, em
          conformidade com a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018).
        </p>
        <p className="pf-head__meta mono">Última atualização: {lastUpdated}</p>
      </header>

      {/* Conteúdo */}
      <section
        className="privacidade-page__list"
        aria-label="Conteúdo da política de privacidade"
      >
        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">01 / 09</div>
          <h2 className="privacidade-page__q">Quem é o controlador dos dados</h2>
          <div className="privacidade-page__a">
            <p>
              <strong>Lorena Alves Arquitetura</strong>, estabelecida em
              Uberlândia/MG, inscrita no CNPJ 05.119.224/0001-30 e registrada no
              CAU sob o número A66583-5, é a controladora dos dados pessoais
              tratados por meio deste site, sendo responsável pelas decisões
              sobre o tratamento desses dados.
            </p>
          </div>
        </article>

        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">02 / 09</div>
          <h2 className="privacidade-page__q">Quais dados coletamos</h2>
          <div className="privacidade-page__a">
            <p>
              Coletamos apenas os dados estritamente necessários para oferecer
              uma experiência consistente e responder às suas solicitações:
            </p>
            <ul>
              <li>
                <strong>Dados de contato voluntários:</strong> nome, e-mail,
                telefone e mensagem, apenas quando você escolhe nos contatar
                por WhatsApp, e-mail ou outros canais indicados no site.
              </li>
              <li>
                <strong>Dados de navegação e analytics:</strong> páginas
                visitadas, tempo de permanência, eventos de clique, tipo de
                dispositivo, referrer e um identificador anônimo de sessão. Esses
                dados não permitem sua identificação pessoal direta.
              </li>
              <li>
                <strong>Cookies e armazenamento local:</strong> utilizados para
                lembrar preferências (como o consentimento desta política) e
                manter a coerência da navegação.
              </li>
            </ul>
          </div>
        </article>

        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">03 / 09</div>
          <h2 className="privacidade-page__q">
            Finalidade do tratamento
          </h2>
          <div className="privacidade-page__a">
            <p>Utilizamos os dados coletados para:</p>
            <ul>
              <li>Responder a pedidos de orçamento, dúvidas e contatos;</li>
              <li>
                Compreender o desempenho do site e aprimorar a experiência de
                navegação (analytics agregados);
              </li>
              <li>
                Garantir a segurança e a integridade técnica da plataforma;
              </li>
              <li>
                Cumprir obrigações legais, regulatórias e fiscais aplicáveis
                ao exercício profissional em arquitetura.
              </li>
            </ul>
          </div>
        </article>

        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">04 / 09</div>
          <h2 className="privacidade-page__q">Base legal</h2>
          <div className="privacidade-page__a">
            <p>O tratamento de dados pessoais fundamenta-se em:</p>
            <ul>
              <li>
                <strong>Consentimento</strong> (art. 7º, I da LGPD), para
                cookies não essenciais e comunicações comerciais;
              </li>
              <li>
                <strong>Execução de contrato ou procedimentos preliminares</strong>{" "}
                (art. 7º, V), quando você nos contata para contratar serviços;
              </li>
              <li>
                <strong>Legítimo interesse</strong> (art. 7º, IX), para
                manutenção e segurança do site, respeitando seus direitos
                fundamentais;
              </li>
              <li>
                <strong>Cumprimento de obrigação legal</strong> (art. 7º, II),
                quando aplicável.
              </li>
            </ul>
          </div>
        </article>

        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">05 / 09</div>
          <h2 className="privacidade-page__q">
            Compartilhamento com terceiros
          </h2>
          <div className="privacidade-page__a">
            <p>
              Não comercializamos dados pessoais. Podemos compartilhar dados
              apenas com operadores contratados para hospedagem, infraestrutura
              e analytics (por exemplo, Supabase para banco de dados e funções
              de borda), sempre sob obrigação contratual de confidencialidade e
              segurança. Também poderemos compartilhar dados mediante obrigação
              legal ou decisão judicial.
            </p>
          </div>
        </article>

        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">06 / 09</div>
          <h2 className="privacidade-page__q">Cookies</h2>
          <div className="privacidade-page__a">
            <p>
              Utilizamos cookies e tecnologias de armazenamento local com duas
              finalidades principais:
            </p>
            <ul>
              <li>
                <strong>Essenciais:</strong> necessários para o funcionamento do
                site, como lembrar seu consentimento a esta política.
              </li>
              <li>
                <strong>Analytics:</strong> coletam dados agregados e anônimos
                sobre uso do site, permitindo-nos entender o que é mais
                relevante para os visitantes.
              </li>
            </ul>
            <p>
              Você pode aceitar ou recusar cookies não essenciais no banner
              exibido ao entrar no site, e limpar seu consentimento a qualquer
              momento pelas configurações do seu navegador.
            </p>
          </div>
        </article>

        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">07 / 09</div>
          <h2 className="privacidade-page__q">Seus direitos</h2>
          <div className="privacidade-page__a">
            <p>Como titular, a LGPD lhe assegura o direito de:</p>
            <ul>
              <li>Confirmar a existência de tratamento de seus dados;</li>
              <li>Acessar os dados tratados;</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>
                Solicitar anonimização, bloqueio ou eliminação de dados
                desnecessários ou tratados em desconformidade;
              </li>
              <li>
                Solicitar a portabilidade de seus dados, nos termos da
                regulamentação;
              </li>
              <li>
                Revogar o consentimento, sempre que o tratamento for baseado
                nele;
              </li>
              <li>
                Obter informação sobre compartilhamento de seus dados com
                terceiros;
              </li>
              <li>
                Opor-se a tratamento realizado em desacordo com a LGPD.
              </li>
            </ul>
            <p>
              Para exercer qualquer desses direitos, entre em contato pelo
              e-mail <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </p>
          </div>
        </article>

        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">08 / 09</div>
          <h2 className="privacidade-page__q">
            Retenção e segurança
          </h2>
          <div className="privacidade-page__a">
            <p>
              Armazenamos seus dados pelo tempo estritamente necessário às
              finalidades descritas nesta política, ou pelo prazo exigido por
              lei. Adotamos medidas técnicas e organizacionais razoáveis para
              proteger dados pessoais contra acessos não autorizados, perda
              acidental, alteração ou divulgação indevida.
            </p>
          </div>
        </article>

        <article className="privacidade-page__item">
          <div className="privacidade-page__num mono">09 / 09</div>
          <h2 className="privacidade-page__q">
            Alterações e contato
          </h2>
          <div className="privacidade-page__a">
            <p>
              Esta política pode ser atualizada para refletir mudanças
              regulatórias ou nos serviços oferecidos. A data da última revisão
              é sempre indicada no topo desta página. Em caso de alterações
              materiais, destacaremos a mudança em lugar visível no site.
            </p>
            <p>
              Para dúvidas, solicitações ou reclamações relacionadas a dados
              pessoais, o canal oficial é o e-mail{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </p>
          </div>
        </article>
      </section>

      {/* CTA final */}
      <footer className="pf-foot">
        <div>
          <p className="pf-foot__quote">
            Dúvidas sobre seus dados? <em>Fale conosco.</em>
          </p>
        </div>
        <a
          className="pf-foot__cta"
          href={`mailto:${contactEmail}`}
          data-cursor="hover"
          onClick={() =>
            track("click_cta", {
              value: { label: "email-privacidade", from: "privacidade-page" },
            })
          }
        >
          <span>ESCREVER PARA O ESTÚDIO</span>
          <span className="btn-big__arrow" />
        </a>
      </footer>
    </div>
  );
}
