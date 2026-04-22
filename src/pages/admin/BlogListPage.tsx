import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { routes } from "@/lib/useHashRoute";

type Row = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  visible: boolean;
  published_at: string | null;
  updated_at: string;
};

export default function BlogListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, category, visible, published_at, updated_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleVisible(id: string, current: boolean) {
    setBusy(id);
    await supabase.from("blog_posts").update({ visible: !current }).eq("id", id);
    setBusy(null);
    load();
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Excluir o artigo "${title}"? Essa ação não pode ser desfeita.`)) return;
    setBusy(id);
    await supabase.from("blog_posts").delete().eq("id", id);
    setBusy(null);
    load();
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(s) ||
      r.slug.toLowerCase().includes(s) ||
      (r.category ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout
      active="blog"
      title="Blog"
      description="Crie, edite e publique artigos do blog do estúdio."
      actions={
        <a className="admin-btn admin-btn--primary" href={routes.adminBlogNew}>
          + novo artigo
        </a>
      }
    >
      <div className="admin-toolbar">
        <div className="admin-toolbar__filters">
          <input
            type="search"
            placeholder="buscar por título, slug ou categoria…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-field__input admin-toolbar__search"
          />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Artigo</th>
              <th style={{ width: 160 }}>Categoria</th>
              <th style={{ width: 140 }}>Publicado</th>
              <th style={{ width: 90 }}>Visível</th>
              <th style={{ width: 200 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.title}</strong>
                  <div className="admin-table__sub">/blog/{r.slug}</div>
                </td>
                <td className="mono">{r.category ?? "—"}</td>
                <td className="mono">
                  {r.published_at
                    ? new Date(r.published_at).toLocaleDateString("pt-BR")
                    : "rascunho"}
                </td>
                <td>
                  <button
                    type="button"
                    className={`admin-toggle ${r.visible ? "is-on" : ""}`}
                    onClick={() => toggleVisible(r.id, r.visible)}
                    disabled={busy === r.id}
                    aria-label={r.visible ? "ocultar do site" : "publicar no site"}
                  >
                    <span />
                  </button>
                </td>
                <td style={{ textAlign: "right" }}>
                  <a className="admin-link" href={`/blog/${r.slug}`} target="_blank" rel="noreferrer">
                    ver →
                  </a>
                  {"  ·  "}
                  <a className="admin-link" href={routes.adminBlogEdit(r.slug)}>
                    editar
                  </a>
                  {"  ·  "}
                  <button
                    className="admin-link admin-link--danger"
                    onClick={() => remove(r.id, r.title)}
                    disabled={busy === r.id}
                  >
                    excluir
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="mono" style={{ opacity: 0.6 }}>
                  nenhum artigo {search ? "encontrado" : "ainda — crie o primeiro"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
