import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSiteSettings,
  invalidateSiteSettings,
  type SiteSettings,
} from "@/lib/useSiteSettings";
import { runSeoAudit, type SeoAuditResult } from "@/lib/seoAudit";
import { refreshSeoEverywhere } from "@/lib/useSeo";

const SITEMAP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap`;
const ROBOTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robots`;

type TabKey = "global" | "verify" | "analytics" | "local" | "sitemap" | "audit" | "guide";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "global", label: "Global" },
  { key: "verify", label: "Verificações" },
  { key: "analytics", label: "Analytics & Pixels" },
  { key: "local", label: "Negócio local" },
  { key: "sitemap", label: "Sitemap & Robots" },
  { key: "audit", label: "Auditoria" },
  { key: "guide", label: "Guia Google" },
];

export default function SeoPage() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [tab, setTab] = useState<TabKey>("global");
  const [audit, setAudit] = useState<SeoAuditResult | null>(null);

  useEffect(() => {
    fetchSiteSettings(true).then(setS);
  }, []);

  function patch<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    const payload = {
      // Global
      seo_default_title: s.seo_default_title,
      seo_default_description: s.seo_default_description,
      seo_og_image: s.seo_og_image,
      seo_twitter_handle: s.seo_twitter_handle,
      seo_canonical_base: s.seo_canonical_base,
      seo_robots: s.seo_robots,
      seo_keywords: s.seo_keywords,
      seo_author: s.seo_author,
      seo_geo_region: s.seo_geo_region,
      seo_geo_placename: s.seo_geo_placename,
      seo_geo_position: s.seo_geo_position,

      // Verificações
      google_site_verification: s.google_site_verification,
      bing_site_verification: s.bing_site_verification,
      yandex_verification: s.yandex_verification,
      facebook_domain_verification: s.facebook_domain_verification,
      pinterest_site_verification: s.pinterest_site_verification,

      // Analytics & pixels
      google_analytics_id: s.google_analytics_id,
      google_tag_manager_id: s.google_tag_manager_id,
      google_ads_conversion_id: s.google_ads_conversion_id,
      meta_pixel_id: s.meta_pixel_id,
      hotjar_id: s.hotjar_id,
      clarity_id: s.clarity_id,

      // Local business
      business_type: s.business_type,
      business_founding_year: s.business_founding_year,
      business_price_range: s.business_price_range,
      business_postal_code: s.business_postal_code,
      business_opening_hours: s.business_opening_hours,
      google_maps_url: s.google_maps_url,
      google_business_profile_url: s.google_business_profile_url,
    };
    const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);
    setSaving(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
    } else {
      invalidateSiteSettings();
      setMsg({ kind: "ok", text: "salvo. recarregue o site para aplicar." });
    }
  }

  async function runAudit() {
    if (!s) return;
    const result = runSeoAudit(s);
    setAudit(result);
    // Log no banco (best-effort)
    await supabase.from("seo_audit_log").insert({
      kind: "audit",
      score: result.score,
      issues: result.issues,
    });
    await supabase
      .from("site_settings")
      .update({ seo_last_audit_at: new Date().toISOString() })
      .eq("id", 1);
  }

  async function markSubmitted() {
    await supabase.from("seo_audit_log").insert({
      kind: "submit",
      notes: "Sitemap enviado ao Google Search Console",
    });
    await supabase
      .from("site_settings")
      .update({ seo_last_search_console_submit: new Date().toISOString() })
      .eq("id", 1);
    invalidateSiteSettings();
    const fresh = await fetchSiteSettings(true);
    setS(fresh);
    setMsg({ kind: "ok", text: "marcado como enviado." });
  }

  async function refreshSeo() {
    setRefreshing(true);
    setMsg(null);
    try {
      const result = await refreshSeoEverywhere({ pingSearchEngines: true });
      // Recarrega o snapshot local também
      const fresh = await fetchSiteSettings(true);
      setS(fresh);

      const pingOk = result.ping?.results?.every((r) => r.ok);
      const pingMsg = result.ping
        ? pingOk
          ? " Google e Bing notificados."
          : " (ping aos buscadores falhou — pode tentar de novo depois)"
        : "";
      setMsg({
        kind: "ok",
        text: `SEO atualizado em todas as páginas.${pingMsg}`,
      });
    } catch (err) {
      setMsg({ kind: "err", text: `falha ao atualizar SEO: ${String(err)}` });
    } finally {
      setRefreshing(false);
    }
  }

  if (!s) {
    return (
      <AdminLayout active="seo">
        <p className="mono">carregando…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="seo">
      <div className="admin-form-head">
        <h1 className="admin-form-head__title">SEO</h1>
        <div className="admin-form-head__actions">
          {msg && <span className={`admin-flash admin-flash--${msg.kind} mono`}>{msg.text}</span>}
          <button
            className="admin-btn"
            onClick={refreshSeo}
            disabled={refreshing || saving}
            title="Recarrega configurações, reaplica meta tags e JSON-LD em todas as páginas e notifica Google/Bing sobre o sitemap"
          >
            {refreshing ? "atualizando…" : "atualizar SEO"}
          </button>
          <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving || refreshing}>
            {saving ? "salvando…" : "salvar"}
          </button>
        </div>
      </div>

      <nav className="seo-tabs" role="tablist" aria-label="Seções de SEO">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`seo-tab ${tab === t.key ? "is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "global" && <GlobalTab s={s} patch={patch} />}
      {tab === "verify" && <VerifyTab s={s} patch={patch} />}
      {tab === "analytics" && <AnalyticsTab s={s} patch={patch} />}
      {tab === "local" && <LocalTab s={s} patch={patch} />}
      {tab === "sitemap" && (
        <SitemapTab s={s} onMarkSubmitted={markSubmitted} />
      )}
      {tab === "audit" && <AuditTab audit={audit} onRun={runAudit} />}
      {tab === "guide" && <GuideTab s={s} />}
    </AdminLayout>
  );
}

// =============================================================
//  Aba: Global
// =============================================================
function GlobalTab({
  s,
  patch,
}: {
  s: SiteSettings;
  patch: <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => void;
}) {
  const previewTitle = s.seo_default_title || s.site_title || "lorenaalves arq";
  const previewDesc =
    s.seo_default_description || s.site_description || "Estúdio autoral de Lorena Alves.";
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");

  return (
    <>
      <p className="mono" style={{ opacity: 0.7, marginBottom: 24, maxWidth: 640 }}>
        Estes valores são usados como padrão em todas as páginas que não definem SEO próprio. Cada
        projeto pode sobrescrever título, descrição e imagem na aba SEO do projeto.
      </p>

      <div className="admin-grid-2">
        <Field label="Título padrão (≤ 60 caracteres)">
          <input
            className="admin-field__input"
            value={s.seo_default_title ?? ""}
            onChange={(e) => patch("seo_default_title", e.target.value)}
            maxLength={70}
          />
          <Hint count={(s.seo_default_title ?? "").length} max={60} />
        </Field>
        <Field label="URL canônica base">
          <input
            className="admin-field__input"
            value={s.seo_canonical_base ?? ""}
            onChange={(e) => patch("seo_canonical_base", e.target.value)}
            placeholder="https://lorenaalvesarq.com"
          />
        </Field>
        <Field label="Descrição padrão (≤ 160 caracteres)" full>
          <textarea
            className="admin-field__input"
            rows={3}
            value={s.seo_default_description ?? ""}
            onChange={(e) => patch("seo_default_description", e.target.value)}
            maxLength={200}
          />
          <Hint count={(s.seo_default_description ?? "").length} max={160} />
        </Field>
        <Field label="Imagem padrão (Open Graph) — URL pública 1200×630" full>
          <input
            className="admin-field__input"
            value={s.seo_og_image ?? ""}
            onChange={(e) => patch("seo_og_image", e.target.value)}
            placeholder="https://…/og.jpg"
          />
        </Field>
        <Field label="Palavras-chave (separadas por vírgula)" full>
          <textarea
            className="admin-field__input"
            rows={2}
            value={s.seo_keywords ?? ""}
            onChange={(e) => patch("seo_keywords", e.target.value)}
            placeholder="arquiteta em Uberlândia, design de interiores MG…"
          />
        </Field>
        <Field label="Autor/Marca">
          <input
            className="admin-field__input"
            value={s.seo_author ?? ""}
            onChange={(e) => patch("seo_author", e.target.value)}
          />
        </Field>
        <Field label="Handle do Twitter (opcional)">
          <input
            className="admin-field__input"
            value={s.seo_twitter_handle ?? ""}
            onChange={(e) => patch("seo_twitter_handle", e.target.value)}
            placeholder="@lorenaalvesarq"
          />
        </Field>
        <Field label="Região (geo.region)">
          <input
            className="admin-field__input"
            value={s.seo_geo_region ?? ""}
            onChange={(e) => patch("seo_geo_region", e.target.value)}
            placeholder="BR-MG"
          />
        </Field>
        <Field label="Cidade (geo.placename)">
          <input
            className="admin-field__input"
            value={s.seo_geo_placename ?? ""}
            onChange={(e) => patch("seo_geo_placename", e.target.value)}
            placeholder="Uberlândia, Minas Gerais"
          />
        </Field>
        <Field label="Coordenadas geográficas (lat;lng)" full>
          <input
            className="admin-field__input"
            value={s.seo_geo_position ?? ""}
            onChange={(e) => patch("seo_geo_position", e.target.value)}
            placeholder="-18.9186;-48.2772"
          />
        </Field>
        <Field label="Diretiva de robots" full>
          <select
            className="admin-field__input"
            value={s.seo_robots ?? "index, follow"}
            onChange={(e) => patch("seo_robots", e.target.value)}
          >
            <option value="index, follow">index, follow (público)</option>
            <option value="noindex, nofollow">noindex, nofollow (oculto dos buscadores)</option>
          </select>
        </Field>
      </div>

      <section className="admin-section">
        <h2 className="admin-section__title">Preview no Google</h2>
        <div className="seo-preview seo-preview--google">
          <div className="seo-preview__url">{base}</div>
          <div className="seo-preview__title">{previewTitle}</div>
          <div className="seo-preview__desc">{previewDesc}</div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">Preview Open Graph (Facebook / WhatsApp)</h2>
        <div className="seo-preview seo-preview--og">
          {s.seo_og_image ? (
            <img className="seo-preview__og-img" src={s.seo_og_image} alt="" />
          ) : (
            <div className="seo-preview__og-img seo-preview__og-img--empty mono">
              sem imagem padrão
            </div>
          )}
          <div className="seo-preview__og-meta">
            <div className="seo-preview__og-domain mono">{base.replace(/^https?:\/\//, "")}</div>
            <div className="seo-preview__title">{previewTitle}</div>
            <div className="seo-preview__desc">{previewDesc}</div>
          </div>
        </div>
      </section>
    </>
  );
}

// =============================================================
//  Aba: Verificações
// =============================================================
function VerifyTab({
  s,
  patch,
}: {
  s: SiteSettings;
  patch: <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => void;
}) {
  return (
    <>
      <p className="mono" style={{ opacity: 0.7, marginBottom: 24, maxWidth: 640 }}>
        Para comprovar a propriedade do site nos buscadores e redes, cole aqui apenas o valor
        (content) que cada plataforma oferece — geralmente uma string curta. As meta tags serão
        injetadas automaticamente no &lt;head&gt; do site.
      </p>

      <div className="admin-grid-2">
        <Field label="Google Search Console (content)" full>
          <input
            className="admin-field__input"
            value={s.google_site_verification ?? ""}
            onChange={(e) => patch("google_site_verification", e.target.value)}
            placeholder="abc123XYZ…"
          />
          <p className="mono" style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
            Em search.google.com/search-console, escolha "HTML tag" e cole apenas o content.
          </p>
        </Field>
        <Field label="Bing Webmaster (msvalidate.01)">
          <input
            className="admin-field__input"
            value={s.bing_site_verification ?? ""}
            onChange={(e) => patch("bing_site_verification", e.target.value)}
          />
        </Field>
        <Field label="Yandex">
          <input
            className="admin-field__input"
            value={s.yandex_verification ?? ""}
            onChange={(e) => patch("yandex_verification", e.target.value)}
          />
        </Field>
        <Field label="Facebook domain verification">
          <input
            className="admin-field__input"
            value={s.facebook_domain_verification ?? ""}
            onChange={(e) => patch("facebook_domain_verification", e.target.value)}
          />
        </Field>
        <Field label="Pinterest (p:domain_verify)">
          <input
            className="admin-field__input"
            value={s.pinterest_site_verification ?? ""}
            onChange={(e) => patch("pinterest_site_verification", e.target.value)}
          />
        </Field>
      </div>

      <section className="admin-section">
        <h2 className="admin-section__title">Status</h2>
        <ul className="seo-status-list mono">
          <StatusRow label="Google Search Console" ok={!!s.google_site_verification} />
          <StatusRow label="Bing Webmaster" ok={!!s.bing_site_verification} />
          <StatusRow label="Yandex" ok={!!s.yandex_verification} />
          <StatusRow label="Facebook" ok={!!s.facebook_domain_verification} />
          <StatusRow label="Pinterest" ok={!!s.pinterest_site_verification} />
        </ul>
      </section>
    </>
  );
}

// =============================================================
//  Aba: Analytics & Pixels
// =============================================================
function AnalyticsTab({
  s,
  patch,
}: {
  s: SiteSettings;
  patch: <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => void;
}) {
  return (
    <>
      <p className="mono" style={{ opacity: 0.7, marginBottom: 24, maxWidth: 640 }}>
        Cole os IDs das plataformas de analytics. Os scripts serão carregados automaticamente no
        site — não é necessário editar código.
      </p>

      <div className="admin-grid-2">
        <Field label="Google Analytics 4 (G-XXXXXXX)">
          <input
            className="admin-field__input"
            value={s.google_analytics_id ?? ""}
            onChange={(e) => patch("google_analytics_id", e.target.value)}
            placeholder="G-ABC123XYZ"
          />
        </Field>
        <Field label="Google Tag Manager (GTM-XXXXXXX)">
          <input
            className="admin-field__input"
            value={s.google_tag_manager_id ?? ""}
            onChange={(e) => patch("google_tag_manager_id", e.target.value)}
            placeholder="GTM-XXXXXXX"
          />
        </Field>
        <Field label="Google Ads Conversion ID (AW-XXXXXXX)">
          <input
            className="admin-field__input"
            value={s.google_ads_conversion_id ?? ""}
            onChange={(e) => patch("google_ads_conversion_id", e.target.value)}
          />
        </Field>
        <Field label="Meta Pixel (Facebook)">
          <input
            className="admin-field__input"
            value={s.meta_pixel_id ?? ""}
            onChange={(e) => patch("meta_pixel_id", e.target.value)}
            placeholder="1234567890"
          />
        </Field>
        <Field label="Microsoft Clarity">
          <input
            className="admin-field__input"
            value={s.clarity_id ?? ""}
            onChange={(e) => patch("clarity_id", e.target.value)}
          />
        </Field>
        <Field label="Hotjar Site ID">
          <input
            className="admin-field__input"
            value={s.hotjar_id ?? ""}
            onChange={(e) => patch("hotjar_id", e.target.value)}
          />
        </Field>
      </div>
    </>
  );
}

// =============================================================
//  Aba: Local Business
// =============================================================
function LocalTab({
  s,
  patch,
}: {
  s: SiteSettings;
  patch: <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => void;
}) {
  return (
    <>
      <p className="mono" style={{ opacity: 0.7, marginBottom: 24, maxWidth: 720 }}>
        Dados de negócio local ajudam o Google a exibir seu estúdio em buscas geográficas, Maps e
        no "Google Meu Negócio". Preencha com precisão — o schema LocalBusiness gerado é enviado
        a cada carregamento de página.
      </p>

      <div className="admin-grid-2">
        <Field label="Tipo de negócio (schema.org)">
          <select
            className="admin-field__input"
            value={s.business_type ?? "ProfessionalService"}
            onChange={(e) => patch("business_type", e.target.value)}
          >
            <option value="ProfessionalService">ProfessionalService</option>
            <option value="LocalBusiness">LocalBusiness</option>
            <option value="Architect">Architect</option>
            <option value="InteriorDesignStudio">InteriorDesignStudio</option>
          </select>
        </Field>
        <Field label="Ano de fundação">
          <input
            className="admin-field__input"
            value={s.business_founding_year ?? ""}
            onChange={(e) => patch("business_founding_year", e.target.value)}
            placeholder="2020"
          />
        </Field>
        <Field label="Faixa de preço (priceRange)">
          <select
            className="admin-field__input"
            value={s.business_price_range ?? "$$$"}
            onChange={(e) => patch("business_price_range", e.target.value)}
          >
            <option value="$">$</option>
            <option value="$$">$$</option>
            <option value="$$$">$$$</option>
            <option value="$$$$">$$$$</option>
          </select>
        </Field>
        <Field label="CEP">
          <input
            className="admin-field__input"
            value={s.business_postal_code ?? ""}
            onChange={(e) => patch("business_postal_code", e.target.value)}
            placeholder="38400-000"
          />
        </Field>
        <Field label="Horário de atendimento" full>
          <input
            className="admin-field__input"
            value={s.business_opening_hours ?? ""}
            onChange={(e) => patch("business_opening_hours", e.target.value)}
            placeholder="Mo-Fr 09:00-18:00"
          />
          <p className="mono" style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
            Formato schema.org: Mo, Tu, We, Th, Fr, Sa, Su — intervalos 24h.
          </p>
        </Field>
        <Field label="URL do Google Maps" full>
          <input
            className="admin-field__input"
            value={s.google_maps_url ?? ""}
            onChange={(e) => patch("google_maps_url", e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
          />
        </Field>
        <Field label="Google Business Profile (perfil público)" full>
          <input
            className="admin-field__input"
            value={s.google_business_profile_url ?? ""}
            onChange={(e) => patch("google_business_profile_url", e.target.value)}
            placeholder="https://g.page/…"
          />
        </Field>
      </div>
    </>
  );
}

// =============================================================
//  Aba: Sitemap & Robots
// =============================================================
function SitemapTab({
  s,
  onMarkSubmitted,
}: {
  s: SiteSettings;
  onMarkSubmitted: () => void;
}) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const sitemapPublic = `${base}/sitemap.xml`;
  const lastSubmit = s.seo_last_search_console_submit
    ? new Date(s.seo_last_search_console_submit).toLocaleString("pt-BR")
    : "nunca";

  return (
    <>
      <p className="mono" style={{ opacity: 0.7, marginBottom: 16, maxWidth: 720 }}>
        São gerados dinamicamente a partir dos projetos visíveis. Use estas URLs para enviar ao
        Google Search Console.
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 180 }}>Recurso</th>
              <th>URL</th>
              <th style={{ width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">sitemap.xml (público)</td>
              <td>
                <a className="admin-link" href={sitemapPublic} target="_blank" rel="noreferrer">
                  {sitemapPublic}
                </a>
              </td>
              <td style={{ textAlign: "right" }}>
                <CopyBtn text={sitemapPublic} />
              </td>
            </tr>
            <tr>
              <td className="mono">sitemap.xml (edge)</td>
              <td>
                <a className="admin-link" href={SITEMAP_URL} target="_blank" rel="noreferrer">
                  {SITEMAP_URL}
                </a>
              </td>
              <td style={{ textAlign: "right" }}>
                <CopyBtn text={SITEMAP_URL} />
              </td>
            </tr>
            <tr>
              <td className="mono">robots.txt</td>
              <td>
                <a className="admin-link" href={ROBOTS_URL} target="_blank" rel="noreferrer">
                  {ROBOTS_URL}
                </a>
              </td>
              <td style={{ textAlign: "right" }}>
                <CopyBtn text={ROBOTS_URL} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="admin-section">
        <h2 className="admin-section__title">Envie ao Google</h2>
        <ol className="seo-steps">
          <li>
            Abra o{" "}
            <a
              className="admin-link"
              href="https://search.google.com/search-console/sitemaps"
              target="_blank"
              rel="noreferrer"
            >
              Google Search Console › Sitemaps
            </a>
            .
          </li>
          <li>Cole a URL do sitemap público acima e clique em "Enviar".</li>
          <li>Aguarde de 24h a 7 dias para o Google processar.</li>
          <li>
            Volte aqui e clique em "marcar como enviado" para registrar a data.
          </li>
        </ol>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <button className="admin-btn admin-btn--ghost" onClick={onMarkSubmitted}>
            marcar como enviado agora
          </button>
          <span className="mono" style={{ opacity: 0.65 }}>
            Último envio registrado: {lastSubmit}
          </span>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">Atalhos úteis</h2>
        <div className="admin-link-grid">
          <ExternalLink
            href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(base)}`}
            title="Teste de Resultados Enriquecidos"
            desc="Verifica seu JSON-LD"
          />
          <ExternalLink
            href={`https://pagespeed.web.dev/?url=${encodeURIComponent(base)}`}
            title="PageSpeed Insights"
            desc="Core Web Vitals"
          />
          <ExternalLink
            href={`https://search.google.com/test/mobile-friendly?url=${encodeURIComponent(base)}`}
            title="Teste Mobile-Friendly"
            desc="Compatibilidade móvel"
          />
          <ExternalLink
            href={`https://www.google.com/search?q=site%3A${encodeURIComponent(
              base.replace(/^https?:\/\//, "")
            )}`}
            title="Ver páginas indexadas"
            desc="site: no Google"
          />
        </div>
      </section>
    </>
  );
}

// =============================================================
//  Aba: Auditoria
// =============================================================
function AuditTab({
  audit,
  onRun,
}: {
  audit: SeoAuditResult | null;
  onRun: () => void;
}) {
  const grouped = useMemo(() => {
    if (!audit) return {} as Record<string, SeoAuditResult["issues"]>;
    const g: Record<string, SeoAuditResult["issues"]> = {};
    for (const i of audit.issues) {
      g[i.area] = g[i.area] || [];
      g[i.area].push(i);
    }
    return g;
  }, [audit]);

  return (
    <>
      <p className="mono" style={{ opacity: 0.7, marginBottom: 16, maxWidth: 720 }}>
        A auditoria analisa o DOM desta janela (abra a página que deseja auditar em outra aba
        primeiro, se quiser resultado por página). Abaixo, o score global da home.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <button className="admin-btn admin-btn--primary" onClick={onRun}>
          rodar auditoria agora
        </button>
        {audit && (
          <span className="mono" style={{ opacity: 0.7 }}>
            {audit.issues.length} verificações · score {audit.score}/100
          </span>
        )}
      </div>

      {audit && (
        <>
          <div className={`seo-score seo-score--${scoreClass(audit.score)}`}>
            <div className="seo-score__value">{audit.score}</div>
            <div className="seo-score__label mono">de 100</div>
          </div>

          <section className="admin-section">
            <h2 className="admin-section__title">Estatísticas</h2>
            <div className="admin-cards">
              <Stat label="Título" value={`${audit.stats.titleLen} car.`} />
              <Stat label="Descrição" value={`${audit.stats.descLen} car.`} />
              <Stat label="h1 / h2" value={`${audit.stats.h1Count} / ${audit.stats.h2Count}`} />
              <Stat
                label="Imagens sem alt"
                value={`${audit.stats.imagesWithoutAlt} / ${audit.stats.imagesTotal}`}
              />
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section__title">Problemas e sugestões</h2>
            {Object.entries(grouped).map(([area, items]) => (
              <div key={area} style={{ marginBottom: 16 }}>
                <h3 className="mono" style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  {area}
                </h3>
                <ul className="seo-issues">
                  {items.map((i) => (
                    <li key={i.id} className={`seo-issue seo-issue--${i.level}`}>
                      <span className={`seo-issue__dot seo-issue__dot--${i.level}`} />
                      <div>
                        <strong>{i.message}</strong>
                        {i.hint && <p className="mono seo-issue__hint">{i.hint}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}

function scoreClass(n: number) {
  if (n >= 85) return "good";
  if (n >= 60) return "warn";
  return "bad";
}

// =============================================================
//  Aba: Guia Google
// =============================================================
function GuideTab({ s }: { s: SiteSettings }) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const domain = base.replace(/^https?:\/\//, "");

  return (
    <>
      <p className="mono" style={{ opacity: 0.7, marginBottom: 24, maxWidth: 720 }}>
        Guia passo-a-passo para registrar oficialmente o site no Google e começar a aparecer nas
        buscas. Siga na ordem — leva cerca de 30 minutos e o Google reconhece seu site em 3 a 14
        dias.
      </p>

      <div className="seo-guide">
        <GuideStep
          n="01"
          title="Crie sua conta no Google Search Console"
          desc="É a ferramenta oficial do Google para donos de site. Essencial para monitorar buscas, erros de indexação e performance."
          action={{
            label: "Abrir Search Console",
            href: "https://search.google.com/search-console/welcome",
          }}
        />
        <GuideStep
          n="02"
          title="Adicione o domínio como propriedade"
          desc={`Escolha o tipo "Domínio" e adicione ${domain}. É preciso adicionar um registro DNS TXT no seu provedor (Registro.br, GoDaddy, etc.). Se preferir mais simples, escolha "Prefixo do URL" e cole ${base}.`}
        />
        <GuideStep
          n="03"
          title="Verifique a propriedade via meta tag"
          desc="Se escolheu 'Prefixo do URL', o Google mostra um código (ex.: google123abc). Copie só o conteúdo entre aspas do atributo content e cole em Admin › SEO › Verificações › Google Search Console. Salve, aguarde 1 minuto e clique em 'Verificar'."
        />
        <GuideStep
          n="04"
          title="Envie seu sitemap.xml"
          desc={`Em Search Console › Sitemaps, envie: ${base}/sitemap.xml. Se seu host não redireciona /sitemap.xml para a edge function, use a URL direta que aparece na aba Sitemap & Robots.`}
          action={{
            label: "Abrir aba Sitemaps",
            href: "https://search.google.com/search-console/sitemaps",
          }}
        />
        <GuideStep
          n="05"
          title="Solicite a indexação da home"
          desc="Em Search Console, cole a URL da home no campo de inspeção no topo. O Google verifica e mostra um botão 'Solicitar indexação'. Repita para as páginas mais importantes (portfólio, projetos em destaque)."
        />
        <GuideStep
          n="06"
          title="Crie seu Perfil da Empresa (Google Business Profile)"
          desc="Essencial para buscas locais em Uberlândia. Adicione foto, endereço, telefone, horário e link do site. Leva até 14 dias para o Google verificar por carta ou telefone."
          action={{
            label: "Abrir Google Business",
            href: "https://business.google.com/create",
          }}
        />
        <GuideStep
          n="07"
          title="Configure o Google Analytics 4 (GA4)"
          desc="Crie uma propriedade GA4 e copie o ID (começa com G-). Cole em Admin › SEO › Analytics & Pixels. O tracking é ativado automaticamente."
          action={{
            label: "Abrir Analytics",
            href: "https://analytics.google.com/analytics/web/",
          }}
        />
        <GuideStep
          n="08"
          title="Registre no Bing Webmaster (opcional)"
          desc="O Bing alimenta também o ChatGPT e o Copilot. Vale o esforço de 2 minutos."
          action={{
            label: "Abrir Bing Webmaster",
            href: "https://www.bing.com/webmasters",
          }}
        />
        <GuideStep
          n="09"
          title="Monitore após 7 dias"
          desc="Volte ao Search Console em uma semana para checar: (a) páginas indexadas, (b) consultas que trazem tráfego, (c) erros de rastreamento. Ajuste títulos e descrições com base nas palavras-chave que os usuários digitam."
        />
        <GuideStep
          n="10"
          title="Auditoria mensal"
          desc="Rode a aba Auditoria deste admin todo mês para detectar imagens sem alt, h1 duplicados e problemas que podem derrubar seu score."
        />
      </div>
    </>
  );
}

// =============================================================
//  Sub-componentes
// =============================================================
function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`admin-field ${full ? "admin-field--full" : ""}`}>
      <span className="admin-field__label mono">{label}</span>
      {children}
    </label>
  );
}

function Hint({ count, max }: { count: number; max: number }) {
  const over = count > max;
  return (
    <span
      className="mono"
      style={{
        fontSize: 11,
        opacity: 0.6,
        marginTop: 4,
        color: over ? "tomato" : undefined,
      }}
    >
      {count} / {max}
    </span>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="seo-status-row">
      <span className={`seo-status-dot ${ok ? "is-ok" : "is-off"}`} />
      <span className="seo-status-label">{label}</span>
      <span className="seo-status-state mono">{ok ? "configurado" : "não configurado"}</span>
    </li>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="admin-btn admin-btn--ghost admin-btn--sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "copiado" : "copiar"}
    </button>
  );
}

function ExternalLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <a className="admin-ext-link" href={href} target="_blank" rel="noreferrer">
      <span className="admin-ext-link__title">{title}</span>
      <span className="admin-ext-link__desc mono">{desc}</span>
      <span className="admin-ext-link__arrow" aria-hidden>
        ↗
      </span>
    </a>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-card">
      <span className="admin-card__label mono">{label}</span>
      <span className="admin-card__value">{value}</span>
    </div>
  );
}

function GuideStep({
  n,
  title,
  desc,
  action,
}: {
  n: string;
  title: string;
  desc: string;
  action?: { label: string; href: string };
}) {
  return (
    <article className="seo-guide__step">
      <div className="seo-guide__num mono">{n}</div>
      <div className="seo-guide__body">
        <h3 className="seo-guide__title">{title}</h3>
        <p className="seo-guide__desc">{desc}</p>
        {action && (
          <a
            className="admin-btn admin-btn--ghost admin-btn--sm"
            href={action.href}
            target="_blank"
            rel="noreferrer"
          >
            {action.label} ↗
          </a>
        )}
      </div>
    </article>
  );
}
