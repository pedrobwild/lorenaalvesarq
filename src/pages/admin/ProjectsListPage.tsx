import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { routes } from "@/lib/useHashRoute";
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableRow, DragHandle } from "@/components/admin/SortableRow";

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
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // Drag-and-drop só faz sentido quando estamos vendo todos sem busca,
  // porque a ordem global é o que persiste no banco.
  const canReorder = filter === "Todos" && search.trim() === "";

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = rows;
    const reordered = arrayMove(rows, oldIndex, newIndex).map((r, i) => ({
      ...r,
      order_index: i + 1,
    }));
    setRows(reordered);

    setSavingOrder(true);
    try {
      await Promise.all(
        reordered.map((r) =>
          supabase.from("projects").update({ order_index: r.order_index }).eq("id", r.id)
        )
      );
    } catch {
      setRows(previous);
    } finally {
      setSavingOrder(false);
    }
  }

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

      {!canReorder && (
        <p className="mono admin-hint">
          arraste para reordenar é desabilitado quando há filtro ou busca ativos.
        </p>
      )}
      {savingOrder && <p className="mono admin-hint">salvando nova ordem…</p>}

      <div className="admin-table-wrap">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filtered.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th></th>
                  <th>Projeto</th>
                  <th>Categoria</th>
                  <th>Ano</th>
                  <th>Visível</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <SortableRow key={r.id} id={r.id}>
                    {({ listeners, attributes, isDragging }) => (
                      <>
                        <td style={{ width: 32 }}>
                          {canReorder ? (
                            <DragHandle listeners={listeners} attributes={attributes} />
                          ) : (
                            <span className="admin-drag-handle is-disabled" aria-hidden>
                              ≡
                            </span>
                          )}
                        </td>
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
                            disabled={busy === r.id || isDragging}
                            aria-label={r.visible ? "ocultar do site" : "mostrar no site"}
                          >
                            <span />
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
                            disabled={busy === r.id || isDragging}
                          >
                            excluir
                          </button>
                        </td>
                      </>
                    )}
                  </SortableRow>
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
          </SortableContext>
        </DndContext>
      </div>
    </AdminLayout>
  );
}
