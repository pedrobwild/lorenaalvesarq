import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { routes } from "@/lib/useHashRoute";

type Row = {
  id: string;
  slug: string;
  number: string | null;
  title: string;
  em: string | null;
  tag: string;
  year: string | null;
  cover_url: string | null;
  visible: boolean;
  order_index: number | null;
};

const TAGS = ["Todos", "Residencial", "Interiores", "Comercial", "Rural"] as const;

export default function ProjectsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("projects")
      .select("id, slug, number, title, em, tag, year, cover_url, visible, order_index")
      .order("order_index", { ascending: true });
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleVisible(id: string, current: boolean) {
    setBusy(id);
    await supabase.from("projects").update({ visible: !current }).eq("id", id);
    setBusy(null);
    load();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const swapWith = rows[idx + dir];
    if (!swapWith) return;
    setBusy(id);
    const a = rows[idx].order_index ?? idx + 1;
    const b = swapWith.order_index ?? idx + 1 + dir;
    await Promise.all([
      supabase.from("projects").update({ order_index: b }).eq("id", rows[idx].id),
      supabase.from("projects").update({ order_index: a }).eq("id", swapWith.id),
    ]);
    setBusy(null);
    load();
  }

  async function remove(id: string, slug: string) {
    if (!confirm(`Excluir o projeto "${slug}"? Essa ação não pode ser desfeita.`)) return;
    setBusy(id);
    await supabase.from("projects").delete().eq("id", id);
    setBusy(null);
    load();
  }

  const filtered = rows.filter((r) => {
    if (filter !== "Todos" && r.tag !== filter) return false;
    if (search && !`${r.title} ${r.em ?? ""}`.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <AdminLayout active="projects">
      <div className="admin-toolbar">
        <div className="admin-toolbar__filters">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              className={`admin-chip ${filter === t ? "is-active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
          <input
            type="search"
            placeholder="buscar título…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-field__input admin-toolbar__search"
          />
        </div>
        <a className="admin-btn admin-btn--primary" href={routes.adminProjectNew}>
          + novo projeto
        </a>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Projeto</th>
              <th>Categoria</th>
              <th>Ano</th>
              <th>Visível</th>
              <th>Ordem</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ width: 64 }}>
                  {r.cover_url ? (
                    <img src={r.cover_url} alt="" className="admin-thumb" />
                  ) : (
                    <div className="admin-thumb admin-thumb--empty" />
                  )}
                </td>
                <td>
                  <strong>
                    {r.title} <em>{r.em}</em>
                  </strong>
                  <div className="mono admin-table__sub">{r.slug}</div>
                </td>
                <td className="mono">{r.tag}</td>
                <td className="mono">{r.year}</td>
                <td>
                  <button
                    type="button"
                    className={`admin-toggle ${r.visible ? "is-on" : ""}`}
                    onClick={() => toggleVisible(r.id, r.visible)}
                    disabled={busy === r.id}
                    aria-label={r.visible ? "ocultar do site" : "mostrar no site"}
                  >
                    <span />
                  </button>
                </td>
                <td className="mono">
                  <button
                    className="admin-link"
                    onClick={() => move(r.id, -1)}
                    disabled={busy === r.id}
                  >
                    ↑
                  </button>{" "}
                  <button
                    className="admin-link"
                    onClick={() => move(r.id, 1)}
                    disabled={busy === r.id}
                  >
                    ↓
                  </button>
                </td>
                <td style={{ textAlign: "right" }}>
                  <a className="admin-link" href={routes.adminProjectEdit(r.slug)}>
                    editar
                  </a>
                  {"  ·  "}
                  <button
                    className="admin-link admin-link--danger"
                    onClick={() => remove(r.id, r.slug)}
                    disabled={busy === r.id}
                  >
                    excluir
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="mono" style={{ opacity: 0.6 }}>
                  nenhum projeto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
