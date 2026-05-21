/**
 * Página de referência da escala tipográfica do admin.
 *
 * Renderiza, em uma só tela, todos os papéis canônicos definidos por
 * tokens em `src/index.css` (--admin-h1/h2/h3/body/label/btn/table/input/
 * select/help/placeholder/empty) para conferência visual rápida.
 *
 * Quando ajustar tokens, abra `/admin/typography` para validar que toda
 * a hierarquia continua consistente antes de varrer telas individuais.
 */
import AdminLayout from "@/components/admin/AdminLayout";

type SpecProps = {
  token: string;
  size?: string;
  weight?: string;
};

function Spec({ token, size, weight }: SpecProps) {
  return (
    <p className="admin-help" style={{ marginTop: 4 }}>
      <span className="mono">{token}</span>
      {size ? ` · ${size}` : ""}
      {weight ? ` · ${weight}` : ""}
    </p>
  );
}

function Row({
  label,
  children,
  spec,
}: {
  label: string;
  children: React.ReactNode;
  spec: SpecProps;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 24,
        padding: "16px 0",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        alignItems: "baseline",
      }}
    >
      <div className="admin-label" style={{ opacity: 0.7 }}>
        {label}
      </div>
      <div>
        {children}
        <Spec {...spec} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 8,
        padding: "20px 24px",
        marginBottom: 24,
      }}
    >
      <h2 className="admin-section__title" style={{ marginBottom: 8 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function TypographyPage() {
  return (
    <AdminLayout
      active="settings"
      title="Tipografia"
      description="Escala canônica do admin — use para conferir consistência entre telas."
    >
      <Section title="Hierarquia">
        <Row label="H1 — página" spec={{ token: "--admin-h1-*", size: "20px", weight: "600" }}>
          <h1 className="admin-h1">Título da página</h1>
        </Row>
        <Row label="H2 — seção" spec={{ token: "--admin-h2-*", size: "16px", weight: "600" }}>
          <h2 className="admin-h2">Título de seção</h2>
        </Row>
        <Row label="H3 — subseção" spec={{ token: "--admin-h3-*", size: "14px", weight: "600" }}>
          <h3 className="admin-h3">Subtítulo interno</h3>
        </Row>
      </Section>

      <Section title="Texto">
        <Row label="Body" spec={{ token: "--admin-body-*", size: "14px", weight: "400" }}>
          <p className="admin-text">
            Texto padrão de parágrafos, descrições e blocos de leitura no admin.
          </p>
        </Row>
        <Row label="Body sm" spec={{ token: "--admin-body-sm-*", size: "13px", weight: "400" }}>
          <p className="admin-text--sm">
            Texto secundário, descrições compactas e meta-informações.
          </p>
        </Row>
        <Row label="Label / eyebrow" spec={{ token: "--admin-label-*", size: "11px", weight: "500" }}>
          <span className="admin-label">Rótulo de seção</span>
        </Row>
        <Row label="Help" spec={{ token: "--admin-help-*", size: "11px", weight: "400" }}>
          <p className="admin-help">Texto auxiliar abaixo de campos e dicas curtas.</p>
        </Row>
      </Section>

      <Section title="Formulários">
        <Row
          label="Input"
          spec={{ token: "--admin-input-* / --admin-placeholder-*", size: "14px" }}
        >
          <div className="admin-field" style={{ maxWidth: 360 }}>
            <label className="admin-field__label" htmlFor="tp-input">
              Nome do projeto
            </label>
            <input
              id="tp-input"
              className="admin-field__input"
              placeholder="Ex.: Casa Jardim Botânico"
              defaultValue=""
            />
            <p className="admin-field__help">Aparece no portfólio e no título do projeto.</p>
          </div>
        </Row>
        <Row label="Textarea" spec={{ token: "--admin-input-*", size: "14px" }}>
          <div className="admin-field" style={{ maxWidth: 360 }}>
            <label className="admin-field__label" htmlFor="tp-textarea">
              Descrição
            </label>
            <textarea
              id="tp-textarea"
              className="admin-field__input"
              rows={3}
              placeholder="Conte brevemente sobre o projeto"
            />
          </div>
        </Row>
        <Row label="Select" spec={{ token: "--admin-select-*", size: "14px" }}>
          <div className="admin-field" style={{ maxWidth: 360 }}>
            <label className="admin-field__label" htmlFor="tp-select">
              Categoria
            </label>
            <select id="tp-select" className="admin-field__input admin-select" defaultValue="">
              <option value="" disabled>
                Selecione uma categoria
              </option>
              <option value="residencial">Residencial</option>
              <option value="comercial">Comercial</option>
              <option value="institucional">Institucional</option>
            </select>
          </div>
        </Row>
      </Section>

      <Section title="Botões">
        <Row label="Primary / ghost" spec={{ token: "--admin-btn-*", size: "13px", weight: "500" }}>
          <div className="admin-inline" style={{ gap: 8 }}>
            <button type="button" className="admin-btn admin-btn--primary">
              Salvar alterações
            </button>
            <button type="button" className="admin-btn">
              Cancelar
            </button>
            <button type="button" className="admin-btn admin-btn--ghost">
              Ver como visitante
            </button>
          </div>
        </Row>
        <Row label="Small" spec={{ token: "--admin-btn-sm-size", size: "12px", weight: "500" }}>
          <div className="admin-inline" style={{ gap: 8 }}>
            <button type="button" className="admin-btn admin-btn--sm">
              Editar
            </button>
            <button type="button" className="admin-btn admin-btn--sm admin-btn--primary">
              Publicar
            </button>
          </div>
        </Row>
      </Section>

      <Section title="Tabela">
        <Row
          label="Cabeçalho + linhas"
          spec={{ token: "--admin-table-* / --admin-th-*", size: "13px / 10px" }}
        >
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    Casa Jardim Botânico
                    <div className="admin-table__sub">casa-jardim-botanico</div>
                  </td>
                  <td>Residencial</td>
                  <td>Publicado</td>
                  <td>há 2 dias</td>
                </tr>
                <tr>
                  <td>
                    Loft Vila Madalena
                    <div className="admin-table__sub">loft-vila-madalena</div>
                  </td>
                  <td>Residencial</td>
                  <td>Rascunho</td>
                  <td>há 1 semana</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Row>
      </Section>

      <Section title="Empty state">
        <Row label="Sem resultados" spec={{ token: "--admin-empty-*", size: "14px / 13px" }}>
          <div className="admin-empty">
            <h3 className="admin-empty__title">Nenhum projeto encontrado</h3>
            <p className="admin-empty__desc">
              Ajuste os filtros ou crie um novo projeto para começar.
            </p>
          </div>
        </Row>
      </Section>
    </AdminLayout>
  );
}
