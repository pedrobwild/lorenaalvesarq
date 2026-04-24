import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Trash2, Upload, RefreshCw, Plus } from "lucide-react";

/**
 * Admin: gestão de URLs 404.
 *
 * Lista todas as URLs registradas como 404 (capturadas automaticamente quando
 * algum visitante cai na NotFoundPage, ou importadas do Search Console / inseridas
 * manualmente). Para cada URL, o admin pode:
 *
 *  - Marcar status: pending | redirect | update_links | ignore | fixed
 *  - Definir um destino de redirecionamento (que será aplicado pela NotFoundPage)
 *  - Adicionar observações
 *  - Apagar registro
 *
 * Importação do Search Console é feita colando texto: o painel parseia URLs
 * (uma por linha) e insere com source='search_console'.
 */

type Row = {
  id: number;
  path: string;
  hits: number;
  first_seen_at: string;
  last_seen_at: string;
  referrer: string | null;
  source: string;
  status: string;
  redirect_to: string | null;
  notes: string | null;
};

const STATUS_OPTIONS: Array<{ value: string; label: string; tone: string }> = [
  { value: "pending", label: "Pendente", tone: "#a3a3a3" },
  { value: "redirect", label: "Redirecionar", tone: "#3b82f6" },
  { value: "update_links", label: "Atualizar links", tone: "#f59e0b" },
  { value: "ignore", label: "Ignorar", tone: "#737373" },
  { value: "fixed", label: "Corrigido", tone: "#10b981" },
];

const SOURCE_LABEL: Record<string, string> = {
  auto: "Automático",
  search_console: "Search Console",
  manual: "Manual",
};

function statusLabel(v: string) {
  return STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
function statusTone(v: string) {
  return STATUS_OPTIONS.find((o) => o.value === v)?.tone ?? "#a3a3a3";
}

const SITE_BASE = "https://lorenaalvesarq.com";

export default function Seo404Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [newPath, setNewPath] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_404_log")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);
    if (error) {
      setMsg({ kind: "err", text: `Erro ao carregar: ${error.message}` });
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  async function updateRow(id: number, patch: Partial<Row>) {
    const optimistic = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRows(optimistic);
    const { error } = await supabase.from("seo_404_log").update(patch).eq("id", id);
    if (error) {
      setMsg({ kind: "err", text: `Erro ao salvar: ${error.message}` });
      void load();
    }
  }

  async function deleteRow(id: number) {
    if (!confirm("Apagar este registro?")) return;
    const { error } = await supabase.from("seo_404_log").delete().eq("id", id);
    if (error) {
      setMsg({ kind: "err", text: `Erro ao apagar: ${error.message}` });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function addManualPath() {
    const p = newPath.trim();
    if (!p) return;
    const path = normalizePath(p);
    if (!path) {
      setMsg({ kind: "err", text: "Caminho inválido. Use algo como /pagina-antiga" });
      return;
    }
    const { error } = await supabase
      .from("seo_404_log")
      .upsert({ path, source: "manual", hits: 0 }, { onConflict: "path" });
    if (error) {
      setMsg({ kind: "err", text: `Erro: ${error.message}` });
      return;
    }
    setNewPath("");
    setMsg({ kind: "ok", text: "URL adicionada." });
    void load();
  }

  async function importFromText() {
    setImporting(true);
    setMsg(null);
    const lines = importText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const paths = lines
      .map(normalizePath)
      .filter((p): p is string => Boolean(p));
    const unique = Array.from(new Set(paths));
    if (unique.length === 0) {
      setImporting(false);
      setMsg({ kind: "err", text: "Nenhuma URL válida encontrada." });
      return;
    }
    const payload = unique.map((path) => ({
      path,
      source: "search_console",
      hits: 0,
    }));
    const { error } = await supabase
      .from("seo_404_log")
      .upsert(payload, { onConflict: "path", ignoreDuplicates: true });
    setImporting(false);
    if (error) {
      setMsg({ kind: "err", text: `Erro ao importar: ${error.message}` });
      return;
    }
    setMsg({ kind: "ok", text: `${unique.length} URL(s) importada(s).` });
    setImportText("");
    setImportOpen(false);
    void load();
  }

  return (
    <AdminLayout
      active="seo"
      title="URLs 404 — Search Console"
      description="Veja todas as URLs que retornaram “Não encontrado”, configure redirecionamentos e marque as que precisam de atualização de links."
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn-ghost" onClick={() => setImportOpen((v) => !v)}>
            <Upload size={14} /> Importar do Search Console
          </button>
          <button type="button" className="btn-ghost" onClick={() => void load()}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      }
    >
      {msg && (
        <div
          role={msg.kind === "err" ? "alert" : "status"}
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: 6,
            background: msg.kind === "ok" ? "#10b98120" : "#ef444420",
            color: msg.kind === "ok" ? "#065f46" : "#991b1b",
            fontSize: "0.875rem",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Filtros por status */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[{ value: "all", label: "Todas" }, ...STATUS_OPTIONS].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: 999,
              border: "1px solid #e5e5e5",
              background: filter === opt.value ? "#111" : "#fff",
              color: filter === opt.value ? "#fff" : "#111",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {opt.label} <span style={{ opacity: 0.6 }}>({counts[opt.value] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Importação Search Console */}
      {importOpen && (
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "1.5rem",
            background: "#fafafa",
          }}
        >
          <h2 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
            Colar URLs do Search Console
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.75rem" }}>
            No Search Console, abra o relatório <strong>Páginas → Não encontrado (404)</strong>,
            exporte ou copie a coluna de URLs e cole abaixo (uma por linha).
            URLs absolutas (https://…) são convertidas em caminho relativo automaticamente.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            placeholder={"/pagina-antiga\nhttps://lorenaalvesarq.com/projeto/casa-removida\n/blog/post-deletado"}
            style={{
              width: "100%",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              padding: "0.5rem",
              border: "1px solid #d4d4d4",
              borderRadius: 4,
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void importFromText()}
              disabled={importing}
            >
              {importing ? "Importando…" : "Importar"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setImportOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Adicionar URL manual */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addManualPath();
          }}
          placeholder="/caminho-da-url-quebrada"
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            border: "1px solid #d4d4d4",
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: "0.85rem",
          }}
        />
        <button type="button" className="btn-ghost" onClick={() => void addManualPath()}>
          <Plus size={14} /> Adicionar URL
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: "#737373" }}>Carregando…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#737373" }}>
          Nenhuma URL registrada{filter !== "all" ? " com este status" : ""}.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {filtered.map((r) => (
            <article
              key={r.id}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 8,
                padding: "1rem",
                background: "#fff",
              }}
            >
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                  marginBottom: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <code
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        wordBreak: "break-all",
                      }}
                    >
                      {r.path}
                    </code>
                    <a
                      href={`${SITE_BASE}${r.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no site"
                      style={{ color: "#737373", lineHeight: 0 }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#737373",
                      display: "flex",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      <strong>{r.hits}</strong> {r.hits === 1 ? "acesso" : "acessos"}
                    </span>
                    <span>Origem: {SOURCE_LABEL[r.source] ?? r.source}</span>
                    <span>Última visita: {formatDate(r.last_seen_at)}</span>
                    {r.referrer && (
                      <span title={r.referrer}>
                        Veio de: <code>{shortUrl(r.referrer)}</code>
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: 999,
                    background: `${statusTone(r.status)}20`,
                    color: statusTone(r.status),
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLabel(r.status)}
                </span>
              </header>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr) auto",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <select
                  value={r.status}
                  onChange={(e) => void updateRow(r.id, { status: e.target.value })}
                  style={{
                    padding: "0.4rem",
                    border: "1px solid #d4d4d4",
                    borderRadius: 4,
                    fontSize: "0.85rem",
                  }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={r.redirect_to ?? ""}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x) =>
                        x.id === r.id ? { ...x, redirect_to: e.target.value } : x
                      )
                    )
                  }
                  onBlur={(e) =>
                    void updateRow(r.id, { redirect_to: e.target.value || null })
                  }
                  placeholder={
                    r.status === "redirect"
                      ? "/destino-do-redirect (ex: /portfolio)"
                      : "Destino opcional"
                  }
                  style={{
                    padding: "0.4rem 0.6rem",
                    border: "1px solid #d4d4d4",
                    borderRadius: 4,
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                  }}
                />

                <button
                  type="button"
                  onClick={() => void deleteRow(r.id)}
                  title="Apagar"
                  aria-label="Apagar"
                  style={{
                    padding: "0.4rem",
                    border: "1px solid #fecaca",
                    background: "#fff",
                    color: "#dc2626",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <textarea
                value={r.notes ?? ""}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x) => (x.id === r.id ? { ...x, notes: e.target.value } : x))
                  )
                }
                onBlur={(e) => void updateRow(r.id, { notes: e.target.value || null })}
                placeholder="Observações (ex: link quebrado vindo de revista X, atualizar no Instagram, etc.)"
                rows={1}
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                  padding: "0.4rem 0.6rem",
                  border: "1px solid #e5e5e5",
                  borderRadius: 4,
                  fontSize: "0.8rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </article>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

// ---------- helpers ----------

function normalizePath(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  try {
    if (/^https?:\/\//i.test(v)) {
      const u = new URL(v);
      return (u.pathname || "/") + (u.search || "");
    }
    if (v.startsWith("/")) return v;
    return "/" + v;
  } catch {
    return null;
  }
}

function shortUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.host + (url.pathname.length > 1 ? url.pathname : "");
  } catch {
    return u.slice(0, 40);
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
