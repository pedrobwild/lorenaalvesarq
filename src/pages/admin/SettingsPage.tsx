import { useEffect, useState } from "react";
import { z } from "zod";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSiteSettings,
  invalidateSiteSettings,
  type SiteSettings,
} from "@/lib/useSiteSettings";

const optionalUrl = z
  .string()
  .trim()
  .max(300, "URL muito longa")
  .url("URL inválida (use https://…)")
  .or(z.literal(""))
  .optional()
  .nullable();

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} deve ter no máximo ${max} caracteres`).optional().nullable();

const settingsSchema = z.object({
  site_title: optionalText(80, "Nome do estúdio"),
  site_description: optionalText(280, "Descrição"),
  contact_email: z
    .string()
    .trim()
    .max(255, "Email muito longo")
    .email("Email inválido")
    .or(z.literal(""))
    .optional()
    .nullable(),
  contact_phone: z
    .string()
    .trim()
    .max(40, "Telefone muito longo")
    .regex(/^[+\d\s()\-.]*$/, "Use apenas dígitos, espaço, +, -, ( e )")
    .optional()
    .nullable(),
  address_street: optionalText(160, "Endereço"),
  address_city: optionalText(80, "Cidade"),
  address_region: optionalText(40, "UF"),
  instagram_url: optionalUrl,
  linkedin_url: optionalUrl,
  pinterest_url: optionalUrl,
});

type FieldErrors = Partial<Record<keyof z.infer<typeof settingsSchema>, string>>;

export default function SettingsPage() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetchSiteSettings(true).then(setS);
  }, []);

  function patch<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setS((p) => (p ? { ...p, [k]: v } : p));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function save() {
    if (!s) return;
    setMsg(null);
    const candidate = {
      site_title: s.site_title ?? "",
      site_description: s.site_description ?? "",
      contact_email: s.contact_email ?? "",
      contact_phone: s.contact_phone ?? "",
      address_street: s.address_street ?? "",
      address_city: s.address_city ?? "",
      address_region: s.address_region ?? "",
      instagram_url: s.instagram_url ?? "",
      linkedin_url: s.linkedin_url ?? "",
      pinterest_url: s.pinterest_url ?? "",
    };
    const parsed = settingsSchema.safeParse(candidate);
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FieldErrors;
        if (!fe[k]) fe[k] = issue.message;
      }
      setErrors(fe);
      setMsg({ kind: "err", text: "verifique os campos destacados" });
      return;
    }
    setSaving(true);
    // Normaliza strings vazias para null
    const payload = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])
    );
    const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);
    setSaving(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    invalidateSiteSettings();
    setMsg({ kind: "ok", text: "salvo." });
  }

  if (!s) {
    return (
      <AdminLayout active="settings">
        <p className="mono">carregando…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="settings">
      <div className="admin-form-head">
        <h1 className="admin-form-head__title">Configurações do site</h1>
        <div className="admin-form-head__actions">
          {msg && <span className={`admin-flash admin-flash--${msg.kind} mono`}>{msg.text}</span>}
          <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
            {saving ? "salvando…" : "salvar"}
          </button>
        </div>
      </div>

      <p className="mono" style={{ opacity: 0.7, marginBottom: 24, maxWidth: 640 }}>
        Estes valores aparecem no footer, no menu mobile, na seção de contato e nos schemas SEO do
        site público.
      </p>

      <section className="admin-section">
        <h2 className="admin-section__title">Identidade</h2>
        <div className="admin-grid-2">
          <Field label="Nome do estúdio" error={errors.site_title}>
            <input
              className="admin-field__input"
              value={s.site_title ?? ""}
              onChange={(e) => patch("site_title", e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field label="Descrição curta" error={errors.site_description} full>
            <textarea
              className="admin-field__input"
              rows={2}
              value={s.site_description ?? ""}
              onChange={(e) => patch("site_description", e.target.value)}
              maxLength={280}
            />
          </Field>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">Contato</h2>
        <div className="admin-grid-2">
          <Field label="Email" error={errors.contact_email}>
            <input
              type="email"
              className="admin-field__input"
              value={s.contact_email ?? ""}
              onChange={(e) => patch("contact_email", e.target.value)}
              maxLength={255}
              placeholder="contato@lorenaalvesarq.com"
            />
          </Field>
          <Field
            label="Telefone / WhatsApp (formato livre)"
            error={errors.contact_phone}
            hint="ex: +55 34 9 9999 9999"
          >
            <input
              className="admin-field__input"
              value={s.contact_phone ?? ""}
              onChange={(e) => patch("contact_phone", e.target.value)}
              maxLength={40}
              placeholder="+55 34 9 9999 9999"
            />
          </Field>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">Endereço</h2>
        <div className="admin-grid-2">
          <Field label="Rua / número" error={errors.address_street} full>
            <input
              className="admin-field__input"
              value={s.address_street ?? ""}
              onChange={(e) => patch("address_street", e.target.value)}
              maxLength={160}
            />
          </Field>
          <Field label="Cidade" error={errors.address_city}>
            <input
              className="admin-field__input"
              value={s.address_city ?? ""}
              onChange={(e) => patch("address_city", e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field label="UF" error={errors.address_region}>
            <input
              className="admin-field__input"
              value={s.address_region ?? ""}
              onChange={(e) => patch("address_region", e.target.value)}
              maxLength={40}
              placeholder="MG"
            />
          </Field>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">Redes sociais</h2>
        <div className="admin-grid-2">
          <Field label="Instagram (URL completa)" error={errors.instagram_url} full>
            <input
              className="admin-field__input"
              value={s.instagram_url ?? ""}
              onChange={(e) => patch("instagram_url", e.target.value)}
              placeholder="https://instagram.com/lorenaalves.arq"
            />
          </Field>
          <Field label="LinkedIn" error={errors.linkedin_url}>
            <input
              className="admin-field__input"
              value={s.linkedin_url ?? ""}
              onChange={(e) => patch("linkedin_url", e.target.value)}
              placeholder="https://linkedin.com/company/…"
            />
          </Field>
          <Field label="Pinterest" error={errors.pinterest_url}>
            <input
              className="admin-field__input"
              value={s.pinterest_url ?? ""}
              onChange={(e) => patch("pinterest_url", e.target.value)}
              placeholder="https://pinterest.com/…"
            />
          </Field>
        </div>
      </section>
    </AdminLayout>
  );
}

function Field({
  label,
  children,
  full,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <label className={`admin-field ${full ? "admin-field--full" : ""}`}>
      <span className="admin-field__label mono">{label}</span>
      {children}
      {error ? (
        <span className="mono" style={{ fontSize: 11, color: "tomato", marginTop: 4 }}>
          {error}
        </span>
      ) : hint ? (
        <span className="mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
