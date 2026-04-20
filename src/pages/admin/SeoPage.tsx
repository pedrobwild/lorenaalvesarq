import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSiteSettings,
  invalidateSiteSettings,
  type SiteSettings,
} from "@/lib/useSiteSettings";

const SITEMAP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap`;
const ROBOTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robots`;

export default function SeoPage() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
    const { error } = await supabase
      .from("site_settings")
      .update({
        seo_default_title: s.seo_default_title,
        seo_default_description: s.seo_default_description,
        seo_og_image: s.seo_og_image,
        seo_twitter_handle: s.seo_twitter_handle,
        seo_canonical_base: s.seo_canonical_base,
        seo_robots: s.seo_robots,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
    } else {
      invalidateSiteSettings();
      setMsg({ kind: "ok", text: "salvo." });
    }
  }

  if (!s) {
    return (
      <AdminLayout active="seo">
        <p className="mono">carregando…</p>
      </AdminLayout>
    );
  }

  const previewTitle = s.seo_default_title || s.site_title || "lorenaalves arq";
  const previewDesc =
    s.seo_default_description || s.site_description || "Estúdio autoral de Lorena Alves.";
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");

  return (
    <AdminLayout active="seo">
      <div className="admin-form-head">
        <h1 className="admin-form-head__title">SEO global</h1>
        <div className="admin-form-head__actions">
          {msg && <span className={`admin-flash admin-flash--${msg.kind} mono`}>{msg.text}</span>}
          <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
            {saving ? "salvando…" : "salvar"}
          </button>
        </div>
      </div>

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
        <Field label="Imagem padrão (Open Graph / Twitter) — URL pública 1200×630">
          <input
            className="admin-field__input"
            value={s.seo_og_image ?? ""}
            onChange={(e) => patch("seo_og_image", e.target.value)}
            placeholder="https://…/og.jpg"
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

      <section className="admin-section">
        <h2 className="admin-section__title">Sitemap & robots</h2>
        <p className="mono" style={{ opacity: 0.7, marginBottom: 12 }}>
          São gerados dinamicamente a partir dos projetos visíveis. Use estas URLs para enviar ao
          Google Search Console.
        </p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <tbody>
              <tr>
                <td className="mono" style={{ width: 140 }}>sitemap.xml</td>
                <td>
                  <a className="admin-link" href={SITEMAP_URL} target="_blank" rel="noreferrer">
                    {SITEMAP_URL}
                  </a>
                </td>
              </tr>
              <tr>
                <td className="mono">robots.txt</td>
                <td>
                  <a className="admin-link" href={ROBOTS_URL} target="_blank" rel="noreferrer">
                    {ROBOTS_URL}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}

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
