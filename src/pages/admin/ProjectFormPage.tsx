import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { navigate, routes } from "@/lib/useHashRoute";
import { uploadImage } from "@/lib/uploadImage";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SortableRow, DragHandle } from "@/components/admin/SortableRow";

type Tag = "Residencial" | "Interiores" | "Comercial" | "Rural";

type Form = {
  id?: string;
  slug: string;
  number: string;
  title: string;
  em: string;
  tag: Tag;
  year: string;
  location: string;
  area: string;
  status: string;
  program: string;
  team: string;
  photographer: string;
  summary: string;
  intro: string;
  materials: string; // edited as comma-separated string in UI
  cover_url: string;
  cover_url_md: string;
  cover_url_sm: string;
  cover_blur_data_url: string;
  cover_alt: string;
  visible: boolean;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
};

type GalleryRow = {
  id?: string;
  uid: string;
  url: string;
  url_md: string | null;
  url_sm: string | null;
  blur_data_url: string | null;
  alt: string;
  caption: string | null;
  format: string;
  order_index: number;
  _new?: boolean;
};

const EMPTY: Form = {
  slug: "",
  number: "",
  title: "",
  em: "",
  tag: "Residencial",
  year: "",
  location: "",
  area: "",
  status: "Em projeto",
  program: "",
  team: "",
  photographer: "",
  summary: "",
  intro: "",
  materials: "",
  cover_url: "",
  cover_url_md: "",
  cover_url_sm: "",
  cover_blur_data_url: "",
  cover_alt: "",
  visible: true,
  seo_title: "",
  seo_description: "",
  og_image_url: "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Props = { slug?: string };

export default function ProjectFormPage({ slug }: Props) {
  const isNew = !slug;
  const [form, setForm] = useState<Form>(EMPTY);
  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [tab, setTab] = useState<"geral" | "ficha" | "midia" | "seo">("geral");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [slugDirty, setSlugDirty] = useState(false);
  const [genAlt, setGenAlt] = useState<{ kind: "cover" | "gallery"; key: string } | null>(null);

  async function generateAltText(imageUrl: string): Promise<string> {
    const context = [form.title, form.em, form.tag].filter(Boolean).join(" ");
    const { data, error } = await supabase.functions.invoke("generate-alt-text", {
      body: { imageUrl, context },
    });
    if (error) throw new Error(error.message || "falha ao gerar");
    if (!data?.alt) throw new Error("resposta vazia da IA");
    return data.alt as string;
  }

  async function handleGenerateCoverAlt() {
    if (!form.cover_url) {
      setMsg({ kind: "err", text: "envie a capa antes de gerar o alt-text." });
      return;
    }
    setGenAlt({ kind: "cover", key: "cover" });
    try {
      const alt = await generateAltText(form.cover_url);
      set("cover_alt", alt);
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "erro" });
    } finally {
      setGenAlt(null);
    }
  }

  async function handleGenerateGalleryAlt(idx: number) {
    const item = gallery[idx];
    if (!item?.url) return;
    setGenAlt({ kind: "gallery", key: item.uid });
    try {
      const alt = await generateAltText(item.url);
      updateImg(idx, { alt });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "erro" });
    } finally {
      setGenAlt(null);
    }
  }

  const gallerySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "*, project_images(id, url, url_md, url_sm, blur_data_url, alt, caption, format, order_index)"
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) {
        setMsg({ kind: "err", text: "projeto não encontrado" });
        setLoading(false);
        return;
      }
      setForm({
        id: data.id,
        slug: data.slug,
        number: data.number ?? "",
        title: data.title,
        em: data.em ?? "",
        tag: data.tag as Tag,
        year: data.year ?? "",
        location: data.location ?? "",
        area: data.area ?? "",
        status: data.status ?? "",
        program: data.program ?? "",
        team: data.team ?? "",
        photographer: data.photographer ?? "",
        summary: data.summary ?? "",
        intro: data.intro ?? "",
        materials: (data.materials ?? []).join(", "),
        cover_url: data.cover_url ?? "",
        cover_url_md: data.cover_url_md ?? "",
        cover_url_sm: data.cover_url_sm ?? "",
        cover_blur_data_url: data.cover_blur_data_url ?? "",
        cover_alt: data.cover_alt ?? "",
        visible: !!data.visible,
        seo_title: data.seo_title ?? "",
        seo_description: data.seo_description ?? "",
        og_image_url: data.og_image_url ?? "",
      });
      type DbImg = {
        id: string;
        url: string;
        url_md: string | null;
        url_sm: string | null;
        blur_data_url: string | null;
        alt: string;
        caption: string | null;
        format: string | null;
        order_index: number | null;
      };
      const imgs = (data.project_images ?? []) as DbImg[];
      setGallery(
        imgs
          .slice()
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((i) => ({
            id: i.id,
            uid: i.id ?? crypto.randomUUID(),
            url: i.url,
            url_md: i.url_md,
            url_sm: i.url_sm,
            blur_data_url: i.blur_data_url,
            alt: i.alt,
            caption: i.caption,
            format: i.format ?? "full",
            order_index: i.order_index ?? 0,
          }))
      );
      setSlugDirty(true);
      setLoading(false);
    })();
  }, [slug, isNew]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onTitleChange(v: string) {
    set("title", v);
    if (isNew && !slugDirty) {
      setForm((f) => ({ ...f, title: v, slug: slugify(`${v}-${f.em}`).replace(/-+$/, "") }));
    }
  }

  async function uploadCover(file: File) {
    const slugSafe = form.slug || slugify(form.title) || "novo";
    const result = await uploadImage(file, "project-covers", slugSafe);
    setForm((f) => ({
      ...f,
      cover_url: result.url,
      cover_url_md: result.urlMd,
      cover_url_sm: result.urlSm,
      cover_blur_data_url: result.blurDataUrl,
    }));
  }

  async function uploadGalleryFiles(files: FileList) {
    const slugSafe = form.slug || slugify(form.title) || "novo";
    const items: GalleryRow[] = [];
    for (const f of Array.from(files)) {
      const result = await uploadImage(f, "project-gallery", slugSafe);
      items.push({
        uid: crypto.randomUUID(),
        url: result.url,
        url_md: result.urlMd,
        url_sm: result.urlSm,
        blur_data_url: result.blurDataUrl,
        alt: form.title ? `${form.title} ${form.em}` : "imagem",
        caption: null,
        format: "full",
        order_index: gallery.length + items.length + 1,
        _new: true,
      });
    }
    setGallery((g) => [...g, ...items]);
  }

  function handleGalleryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = gallery.findIndex((g) => g.uid === active.id);
    const newIndex = gallery.findIndex((g) => g.uid === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(gallery, oldIndex, newIndex).map((g, i) => ({
      ...g,
      order_index: i + 1,
    }));
    setGallery(reordered);
  }

  function updateImg(idx: number, patch: Partial<GalleryRow>) {
    setGallery((g) => g.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function removeImg(idx: number) {
    const it = gallery[idx];
    if (it.id) {
      await supabase.from("project_images").delete().eq("id", it.id);
    }
    setGallery((g) => g.filter((_, i) => i !== idx));
  }

  const materialsArr = useMemo(
    () =>
      form.materials
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [form.materials]
  );

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      if (!form.title || !form.slug || !form.tag) {
        throw new Error("título, slug e categoria são obrigatórios");
      }

      const payload = {
        slug: form.slug,
        number: form.number || null,
        title: form.title,
        em: form.em || null,
        tag: form.tag,
        year: form.year || null,
        location: form.location || null,
        area: form.area || null,
        status: form.status || null,
        program: form.program || null,
        team: form.team || null,
        photographer: form.photographer || null,
        summary: form.summary || null,
        intro: form.intro || null,
        materials: materialsArr,
        cover_url: form.cover_url || null,
        cover_url_md: form.cover_url_md || null,
        cover_url_sm: form.cover_url_sm || null,
        cover_blur_data_url: form.cover_blur_data_url || null,
        cover_alt: form.cover_alt || null,
        visible: form.visible,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        og_image_url: form.og_image_url || null,
      };

      let projectId = form.id;
      if (isNew) {
        const { data, error } = await supabase
          .from("projects")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        projectId = data.id;
      } else {
        const { error } = await supabase.from("projects").update(payload).eq("id", form.id!);
        if (error) throw error;
      }

      // gallery: insert _new ones, update existing ones (alt/caption/format/order)
      const toInsert = gallery
        .filter((g) => g._new)
        .map((g) => ({
          project_id: projectId!,
          url: g.url,
          url_md: g.url_md,
          url_sm: g.url_sm,
          blur_data_url: g.blur_data_url,
          alt: g.alt,
          caption: g.caption,
          format: g.format,
          order_index: g.order_index,
        }));
      if (toInsert.length) {
        const { error } = await supabase.from("project_images").insert(toInsert);
        if (error) throw error;
      }
      const toUpdate = gallery.filter((g) => !g._new && g.id);
      for (const g of toUpdate) {
        await supabase
          .from("project_images")
          .update({
            alt: g.alt,
            caption: g.caption,
            format: g.format,
            order_index: g.order_index,
          })
          .eq("id", g.id!);
      }

      setMsg({ kind: "ok", text: "salvo." });
      if (isNew) {
        setTimeout(() => navigate(routes.adminProjectEdit(form.slug)), 600);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "erro ao salvar";
      setMsg({ kind: "err", text });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout active="projects">
        <p className="mono">carregando…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="projects">
      <div className="admin-form-head">
        <a href={routes.adminProjects} className="admin-link">
          ← projetos
        </a>
        <h1 className="admin-form-head__title">
          {isNew ? "Novo projeto" : `Editar · ${form.title} ${form.em}`}
        </h1>
        <div className="admin-form-head__actions">
          {msg && (
            <span className={`admin-flash admin-flash--${msg.kind} mono`}>{msg.text}</span>
          )}
          <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
            {saving ? "salvando…" : "salvar"}
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        {(["geral", "ficha", "midia", "seo"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "geral"
              ? "Geral"
              : t === "ficha"
              ? "Ficha técnica"
              : t === "midia"
              ? "Mídia"
              : "SEO"}
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <div className="admin-grid-2">
          <Field label="Título">
            <input
              className="admin-field__input"
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </Field>
          <Field label="Em (ênfase)">
            <input
              className="admin-field__input"
              value={form.em}
              onChange={(e) => set("em", e.target.value)}
            />
          </Field>
          <Field label="Slug (URL)">
            <input
              className="admin-field__input"
              value={form.slug}
              onChange={(e) => {
                setSlugDirty(true);
                set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Número">
            <input
              className="admin-field__input"
              value={form.number}
              onChange={(e) => set("number", e.target.value)}
              placeholder="01"
            />
          </Field>
          <Field label="Categoria">
            <select
              className="admin-field__input"
              value={form.tag}
              onChange={(e) => set("tag", e.target.value as Tag)}
            >
              <option>Residencial</option>
              <option>Interiores</option>
              <option>Comercial</option>
              <option>Rural</option>
            </select>
          </Field>
          <Field label="Ano">
            <input
              className="admin-field__input"
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
            />
          </Field>
          <Field label="Local">
            <input
              className="admin-field__input"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>
          <Field label="Visível no site">
            <label className="admin-inline">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => set("visible", e.target.checked)}
              />
              <span className="mono">{form.visible ? "publicado" : "oculto"}</span>
            </label>
          </Field>
          <Field label="Resumo (1–2 linhas)" full>
            <textarea
              className="admin-field__input"
              rows={2}
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
          </Field>
          <Field label="Intro (parágrafo da página do projeto)" full>
            <textarea
              className="admin-field__input"
              rows={6}
              value={form.intro}
              onChange={(e) => set("intro", e.target.value)}
            />
          </Field>
        </div>
      )}

      {tab === "ficha" && (
        <div className="admin-grid-2">
          <Field label="Área">
            <input
              className="admin-field__input"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className="admin-field__input"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option>Em projeto</option>
              <option>Em obra</option>
              <option>Concluído</option>
            </select>
          </Field>
          <Field label="Programa" full>
            <input
              className="admin-field__input"
              value={form.program}
              onChange={(e) => set("program", e.target.value)}
            />
          </Field>
          <Field label="Materiais (separados por vírgula)" full>
            <input
              className="admin-field__input"
              value={form.materials}
              onChange={(e) => set("materials", e.target.value)}
              placeholder="concreto aparente, ipê, linho"
            />
          </Field>
          <Field label="Equipe">
            <input
              className="admin-field__input"
              value={form.team}
              onChange={(e) => set("team", e.target.value)}
            />
          </Field>
          <Field label="Fotografia">
            <input
              className="admin-field__input"
              value={form.photographer}
              onChange={(e) => set("photographer", e.target.value)}
            />
          </Field>
        </div>
      )}

      {tab === "midia" && (
        <>
          <section className="admin-section">
            <h2 className="admin-section__title">Capa</h2>
            <div className="admin-cover">
              <div className="admin-cover__preview">
                {form.cover_url ? (
                  <img src={form.cover_url} alt="" />
                ) : (
                  <div className="admin-cover__empty mono">sem capa</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadCover(f);
                  }}
                />
                <Field label="Alt-text da capa" full>
                  <div className="admin-alt-row">
                    <input
                      className="admin-field__input"
                      value={form.cover_alt}
                      onChange={(e) => set("cover_alt", e.target.value)}
                      placeholder="Descrição visual da capa"
                    />
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      onClick={handleGenerateCoverAlt}
                      disabled={!form.cover_url || genAlt?.kind === "cover"}
                      title="Gerar alt-text com IA a partir da imagem"
                    >
                      {genAlt?.kind === "cover" ? "gerando…" : "✨ gerar com IA"}
                    </button>
                  </div>
                </Field>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <header className="admin-section__head">
              <h2 className="admin-section__title">Galeria</h2>
              <label className="admin-btn admin-btn--ghost">
                + adicionar imagens
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files) uploadGalleryFiles(e.target.files);
                  }}
                />
              </label>
            </header>
            <DndContext
              sensors={gallerySensors}
              collisionDetection={closestCenter}
              onDragEnd={handleGalleryDragEnd}
            >
              <SortableContext
                items={gallery.map((g) => g.uid)}
                strategy={rectSortingStrategy}
              >
                <div className="admin-gallery">
                  {gallery.map((g, i) => (
                    <SortableRow key={g.uid} id={g.uid} as="div" className="admin-gallery__item">
                      {({ listeners, attributes, isDragging }) => (
                        <>
                          <div className="admin-gallery__drag">
                            <DragHandle
                              listeners={listeners}
                              attributes={attributes}
                              label="arrastar imagem"
                            />
                          </div>
                          <img src={g.url} alt={g.alt} />
                          <div className="admin-gallery__fields">
                            <input
                              className="admin-field__input"
                              placeholder="alt-text"
                              value={g.alt}
                              onChange={(e) => updateImg(i, { alt: e.target.value })}
                            />
                            <input
                              className="admin-field__input"
                              placeholder="legenda (opcional)"
                              value={g.caption ?? ""}
                              onChange={(e) => updateImg(i, { caption: e.target.value })}
                            />
                            <select
                              className="admin-field__input"
                              value={g.format}
                              onChange={(e) => updateImg(i, { format: e.target.value })}
                            >
                              <option value="full">full</option>
                              <option value="half">half</option>
                              <option value="tall">tall</option>
                              <option value="wide">wide</option>
                            </select>
                            <div className="admin-gallery__actions">
                              <button
                                className="admin-link admin-link--danger"
                                onClick={() => removeImg(i)}
                                disabled={isDragging}
                              >
                                excluir
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </SortableRow>
                  ))}
                  {gallery.length === 0 && (
                    <p className="mono" style={{ opacity: 0.6 }}>
                      ainda sem imagens.
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        </>
      )}

      {tab === "seo" && (
        <div className="admin-grid-2">
          <Field label="SEO Title (opcional)" full>
            <input
              className="admin-field__input"
              value={form.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
              placeholder={`${form.title} ${form.em} — lorenaalves arq`}
            />
          </Field>
          <Field
            label={`SEO Description (${form.seo_description.length}/160)`}
            full
          >
            <textarea
              className="admin-field__input"
              rows={3}
              maxLength={160}
              value={form.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
            />
          </Field>
          <Field label="Open Graph image URL (opcional)" full>
            <input
              className="admin-field__input"
              value={form.og_image_url}
              onChange={(e) => set("og_image_url", e.target.value)}
              placeholder="usa a capa quando vazio"
            />
          </Field>
        </div>
      )}
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
