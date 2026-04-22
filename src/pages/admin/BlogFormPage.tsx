import { useEffect, useState, useRef, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { uploadImageGeneric, type UploadResult } from "@/lib/uploadImage";
import { navigate, routes } from "@/lib/useHashRoute";
import { slugify, readingTime, type BlogPost } from "@/lib/useBlog";

type Props = { slug?: string };

type Draft = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content_html: string;
  cover_url: string;
  cover_url_md: string;
  cover_url_sm: string;
  cover_alt: string;
  cover_blur_data_url: string;
  category: string;
  tags: string;
  reading_minutes: number;
  author_name: string;
  author_role: string;
  published_at: string;
  visible: boolean;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_image_url: string;
};

const EMPTY: Draft = {
  slug: "",
  title: "",
  subtitle: "",
  excerpt: "",
  content_html: "",
  cover_url: "",
  cover_url_md: "",
  cover_url_sm: "",
  cover_alt: "",
  cover_blur_data_url: "",
  category: "Arquitetura Residencial",
  tags: "",
  reading_minutes: 5,
  author_name: "Lorena Alves",
  author_role: "Arquiteta · CAU BR",
  published_at: "",
  visible: true,
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  og_image_url: "",
};

export default function BlogFormPage({ slug }: Props) {
  const isEdit = !!slug;
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const slugTouchedRef = useRef(isEdit);

  // Carrega o post existente
  useEffect(() => {
    if (!isEdit || !slug) return;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        const p = data as BlogPost;
        setPostId(p.id);
        setDraft({
          slug: p.slug,
          title: p.title,
          subtitle: p.subtitle ?? "",
          excerpt: p.excerpt ?? "",
          content_html: p.content_html ?? "",
          cover_url: p.cover_url ?? "",
          cover_url_md: p.cover_url_md ?? "",
          cover_url_sm: p.cover_url_sm ?? "",
          cover_alt: p.cover_alt ?? "",
          cover_blur_data_url: p.cover_blur_data_url ?? "",
          category: p.category ?? "Arquitetura Residencial",
          tags: (p.tags ?? []).join(", "),
          reading_minutes: p.reading_minutes ?? 5,
          author_name: p.author_name ?? "Lorena Alves",
          author_role: p.author_role ?? "Arquiteta · CAU BR",
          published_at: p.published_at ? p.published_at.slice(0, 16) : "",
          visible: p.visible,
          seo_title: p.seo_title ?? "",
          seo_description: p.seo_description ?? "",
          seo_keywords: p.seo_keywords ?? "",
          og_image_url: p.og_image_url ?? "",
        });
        if (editorRef.current) editorRef.current.innerHTML = p.content_html ?? "";
      }
      setLoading(false);
    })();
  }, [isEdit, slug]);

  // Auto-slug a partir do título (somente em criação e até alguém editar manualmente)
  function setTitle(t: string) {
    setDraft((d) => ({
      ...d,
      title: t,
      slug: slugTouchedRef.current ? d.slug : slugify(t),
    }));
  }

  // Sincroniza HTML do editor com state em cada mudança
  function syncEditor() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setDraft((d) => ({
      ...d,
      content_html: html,
      reading_minutes: readingTime(html),
    }));
  }

  // ---------- Upload imagens (AVIF + WebP + JPEG, lazy + decoding async) ----------
  async function uploadFile(file: File, folder: "covers" | "inline"): Promise<UploadResult> {
    return uploadImageGeneric(file, "blog-images", folder);
  }

  async function handleCoverUpload(file: File) {
    setUploadingCover(true);
    try {
      const r = await uploadFile(file, "covers");
      setDraft((d) => ({
        ...d,
        cover_url: r.url,
        cover_url_md: r.urlMd,
        cover_url_sm: r.urlSm,
        cover_blur_data_url: r.blurDataUrl,
      }));
    } catch (err) {
      alert("Falha no upload: " + (err as Error).message);
    } finally {
      setUploadingCover(false);
    }
  }

  /**
   * Insere uma <picture> com sources AVIF + WebP + JPEG no editor.
   * Browsers escolhem o melhor formato suportado automaticamente; loading="lazy"
   * + decoding="async" evitam bloquear o render do conteúdo acima.
   */
  async function handleInlineImageUpload(file: File) {
    setUploadingInline(true);
    try {
      const r = await uploadFile(file, "inline");
      const alt = (prompt("Texto alternativo da imagem (importante para SEO):") || "")
        .replace(/"/g, "&quot;");
      const sizes = "(max-width: 900px) 100vw, 900px";
      const sources: string[] = [];
      if (r.avif) {
        sources.push(
          `<source type="image/avif" srcset="${r.avif.sm} 640w, ${r.avif.md} 1280w, ${r.avif.lg} 1920w" sizes="${sizes}" />`
        );
      }
      sources.push(
        `<source type="image/webp" srcset="${r.webp.sm} 640w, ${r.webp.md} 1280w, ${r.webp.lg} 1920w" sizes="${sizes}" />`
      );
      const imgTag =
        `<img src="${r.jpeg.md}" srcset="${r.jpeg.sm} 640w, ${r.jpeg.md} 1280w, ${r.jpeg.lg} 1920w" ` +
        `sizes="${sizes}" alt="${alt}" loading="lazy" decoding="async" width="1280" height="720" />`;
      const html = `<figure><picture>${sources.join("")}${imgTag}</picture></figure>`;
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand("insertHTML", false, html);
        syncEditor();
      }
    } catch (err) {
      alert("Falha no upload: " + (err as Error).message);
    } finally {
      setUploadingInline(false);
    }
  }

  // ---------- Toolbar do editor ----------
  const exec = useCallback((cmd: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, value);
    syncEditor();
  }, []);

  function insertHeading(level: 2 | 3) {
    exec("formatBlock", `H${level}`);
  }
  function insertQuote() {
    exec("formatBlock", "BLOCKQUOTE");
  }
  function insertParagraph() {
    exec("formatBlock", "P");
  }
  function insertLink() {
    const url = prompt("URL do link:");
    if (!url) return;
    exec("createLink", url);
  }
  function insertHorizontalRule() {
    exec("insertHorizontalRule");
  }

  // ---------- Save ----------
  async function save() {
    if (!draft.title.trim()) {
      alert("O título é obrigatório.");
      return;
    }
    if (!draft.slug.trim()) {
      alert("O slug é obrigatório.");
      return;
    }
    if (!draft.content_html.trim()) {
      alert("O conteúdo do artigo está vazio.");
      return;
    }
    setSaving(true);
    const tags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      slug: draft.slug.trim(),
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim() || null,
      excerpt: draft.excerpt.trim() || null,
      content_html: draft.content_html,
      cover_url: draft.cover_url || null,
      cover_url_md: draft.cover_url_md || null,
      cover_url_sm: draft.cover_url_sm || null,
      cover_alt: draft.cover_alt.trim() || null,
      cover_blur_data_url: draft.cover_blur_data_url || null,
      category: draft.category.trim() || null,
      tags,
      reading_minutes: draft.reading_minutes || readingTime(draft.content_html),
      author_name: draft.author_name.trim() || null,
      author_role: draft.author_role.trim() || null,
      published_at: draft.published_at
        ? new Date(draft.published_at).toISOString()
        : null,
      visible: draft.visible,
      seo_title: draft.seo_title.trim() || null,
      seo_description: draft.seo_description.trim() || null,
      seo_keywords: draft.seo_keywords.trim() || null,
      og_image_url: draft.og_image_url.trim() || null,
    };
    const { error } = isEdit && postId
      ? await supabase.from("blog_posts").update(payload).eq("id", postId)
      : await supabase.from("blog_posts").insert(payload);
    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }
    navigate(routes.adminBlog);
  }

  if (loading) {
    return (
      <AdminLayout active="blog" title="Carregando…">
        <p className="mono" style={{ opacity: 0.5 }}>carregando artigo…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      active="blog"
      title={isEdit ? "Editar artigo" : "Novo artigo"}
      description={isEdit ? `/blog/${draft.slug}` : "Crie um novo artigo para o blog."}
      actions={
        <>
          <a className="admin-btn" href={routes.adminBlog}>
            cancelar
          </a>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? "salvando…" : isEdit ? "salvar alterações" : "criar artigo"}
          </button>
        </>
      }
    >
      <div className="admin-form-grid">
        {/* Coluna principal */}
        <div className="admin-form-grid__main">
          <div className="admin-card">
            <div className="admin-field">
              <label className="admin-field__label">Título</label>
              <input
                className="admin-field__input"
                value={draft.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quero construir minha casa. Por onde começar?"
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Subtítulo (opcional)</label>
              <input
                className="admin-field__input"
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                placeholder="Um guia para começar com clareza"
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">
                Slug · URL <span style={{ opacity: 0.5 }}>(/blog/...)</span>
              </label>
              <input
                className="admin-field__input"
                value={draft.slug}
                onChange={(e) => {
                  slugTouchedRef.current = true;
                  setDraft({ ...draft, slug: slugify(e.target.value) });
                }}
                placeholder="como-construir-minha-casa"
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">
                Resumo · aparece na lista do blog e nos compartilhamentos
              </label>
              <textarea
                className="admin-field__input"
                rows={3}
                value={draft.excerpt}
                onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                placeholder="Construir a própria casa é um dos projetos mais significativos…"
              />
            </div>
          </div>

          {/* Editor de conteúdo */}
          <div className="admin-card">
            <label className="admin-field__label">Conteúdo do artigo</label>
            <div className="blog-editor-toolbar">
              <button type="button" onClick={() => insertHeading(2)} title="Título de seção">H2</button>
              <button type="button" onClick={() => insertHeading(3)} title="Subtítulo">H3</button>
              <button type="button" onClick={insertParagraph} title="Parágrafo">¶</button>
              <span className="blog-editor-toolbar__sep" />
              <button type="button" onClick={() => exec("bold")} title="Negrito"><b>B</b></button>
              <button type="button" onClick={() => exec("italic")} title="Itálico"><i>I</i></button>
              <button type="button" onClick={() => exec("underline")} title="Sublinhado"><u>U</u></button>
              <span className="blog-editor-toolbar__sep" />
              <button type="button" onClick={() => exec("insertUnorderedList")} title="Lista">• Lista</button>
              <button type="button" onClick={() => exec("insertOrderedList")} title="Lista numerada">1. Lista</button>
              <button type="button" onClick={insertQuote} title="Citação">❝ Citação</button>
              <button type="button" onClick={insertHorizontalRule} title="Divisor">— Divisor</button>
              <span className="blog-editor-toolbar__sep" />
              <button type="button" onClick={insertLink} title="Inserir link">🔗 Link</button>
              <label className="blog-editor-toolbar__file">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleInlineImageUpload(f);
                    e.target.value = "";
                  }}
                  hidden
                />
                {uploadingInline ? "enviando…" : "🖼 Imagem"}
              </label>
              <span className="blog-editor-toolbar__sep" />
              <button type="button" onClick={() => exec("removeFormat")} title="Limpar formatação">✕ Limpar</button>
            </div>
            <div
              ref={editorRef}
              className="blog-editor"
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditor}
              onBlur={syncEditor}
              spellCheck
            />
            <p className="mono admin-hint" style={{ marginTop: 8 }}>
              ~{draft.reading_minutes} min de leitura · use H2 para divisões grandes (rich result no Google) e H3 para subseções.
            </p>
          </div>
        </div>

        {/* Coluna lateral */}
        <aside className="admin-form-grid__side">
          <div className="admin-card">
            <h3 className="admin-section__title" style={{ marginBottom: 12 }}>Publicação</h3>
            <div className="admin-field">
              <label className="admin-field__label">Categoria</label>
              <input
                className="admin-field__input"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Tags (separadas por vírgula)</label>
              <input
                className="admin-field__input"
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="construção, terreno, projeto"
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Data de publicação</label>
              <input
                type="datetime-local"
                className="admin-field__input"
                value={draft.published_at}
                onChange={(e) => setDraft({ ...draft, published_at: e.target.value })}
              />
              <p className="mono admin-hint">deixe em branco para publicar imediatamente.</p>
            </div>
            <label className="admin-field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={draft.visible}
                onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
              />
              <span className="mono">visível no site</span>
            </label>
          </div>

          <div className="admin-card">
            <h3 className="admin-section__title" style={{ marginBottom: 12 }}>Imagem de capa</h3>
            {draft.cover_url ? (
              <div style={{ marginBottom: 10 }}>
                <img
                  src={draft.cover_url_md || draft.cover_url}
                  alt={draft.cover_alt || "capa"}
                  style={{ width: "100%", borderRadius: 6, display: "block" }}
                />
              </div>
            ) : null}
            <label className="admin-btn" style={{ width: "100%", justifyContent: "center", textAlign: "center" }}>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCoverUpload(f);
                  e.target.value = "";
                }}
              />
              {uploadingCover ? "enviando…" : draft.cover_url ? "trocar capa" : "enviar capa"}
            </label>
            <div className="admin-field" style={{ marginTop: 12 }}>
              <label className="admin-field__label">Alt da capa (acessibilidade + SEO)</label>
              <input
                className="admin-field__input"
                value={draft.cover_alt}
                onChange={(e) => setDraft({ ...draft, cover_alt: e.target.value })}
                placeholder="Descreva o que aparece na imagem"
              />
            </div>
          </div>

          <div className="admin-card">
            <h3 className="admin-section__title" style={{ marginBottom: 12 }}>Autoria</h3>
            <div className="admin-field">
              <label className="admin-field__label">Autor</label>
              <input
                className="admin-field__input"
                value={draft.author_name}
                onChange={(e) => setDraft({ ...draft, author_name: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Cargo / credencial</label>
              <input
                className="admin-field__input"
                value={draft.author_role}
                onChange={(e) => setDraft({ ...draft, author_role: e.target.value })}
              />
            </div>
          </div>

          <div className="admin-card">
            <h3 className="admin-section__title" style={{ marginBottom: 12 }}>SEO</h3>
            <div className="admin-field">
              <label className="admin-field__label">Título SEO (deixe vazio = usa o título do artigo)</label>
              <input
                className="admin-field__input"
                value={draft.seo_title}
                onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })}
                maxLength={70}
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Descrição SEO (até 160 chars)</label>
              <textarea
                className="admin-field__input"
                rows={3}
                maxLength={160}
                value={draft.seo_description}
                onChange={(e) => setDraft({ ...draft, seo_description: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Palavras-chave (separadas por vírgula)</label>
              <input
                className="admin-field__input"
                value={draft.seo_keywords}
                onChange={(e) => setDraft({ ...draft, seo_keywords: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">URL da imagem para compartilhamento (OG)</label>
              <input
                className="admin-field__input"
                value={draft.og_image_url}
                onChange={(e) => setDraft({ ...draft, og_image_url: e.target.value })}
                placeholder="deixe vazio para usar a capa"
              />
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
