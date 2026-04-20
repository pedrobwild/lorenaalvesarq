import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import SessionsChart, { type DailyPoint } from "@/components/admin/SessionsChart";
import { supabase } from "@/integrations/supabase/client";
import { routes } from "@/lib/useHashRoute";

type Stats = {
  totalProjects: number;
  pageviews30: number;
  uniqueVisitors30: number;
  contactClicks30: number;
};

type RecentProject = { slug: string; title: string; em: string | null; updated_at: string };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [daily14, setDaily14] = useState<DailyPoint[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();

      const since14 = new Date(Date.now() - 14 * 86400_000).toISOString();

      const [{ count: totalProjects }, pv, uv, cc, recentRes, daily14Res] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "pageview")
          .gte("created_at", since),
        supabase
          .from("analytics_events")
          .select("session_id")
          .eq("event_type", "pageview")
          .gte("created_at", since),
        supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "click_contact")
          .gte("created_at", since),
        supabase
          .from("projects")
          .select("slug, title, em, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("analytics_events")
          .select("session_id, created_at")
          .eq("event_type", "pageview")
          .gte("created_at", since14)
          .order("created_at", { ascending: true })
          .limit(20000),
      ]);

      const uniqueIds = new Set((uv.data ?? []).map((r) => r.session_id).filter(Boolean));

      setStats({
        totalProjects: totalProjects ?? 0,
        pageviews30: pv.count ?? 0,
        uniqueVisitors30: uniqueIds.size,
        contactClicks30: cc.count ?? 0,
      });
      setRecent((recentRes.data ?? []) as RecentProject[]);

      // Constrói série diária dos últimos 14 dias
      const buckets = new Map<string, { sessions: Set<string>; pageviews: number }>();
      const today = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400_000);
        const k = d.toISOString().slice(0, 10);
        buckets.set(k, { sessions: new Set(), pageviews: 0 });
      }
      for (const r of (daily14Res.data ?? []) as { session_id: string | null; created_at: string }[]) {
        const k = new Date(r.created_at).toISOString().slice(0, 10);
        const b = buckets.get(k);
        if (!b) continue;
        b.pageviews++;
        if (r.session_id) b.sessions.add(r.session_id);
      }
      setDaily14(
        Array.from(buckets.entries()).map(([day, v]) => ({
          day,
          sessions: v.sessions.size,
          pageviews: v.pageviews,
        }))
      );
    })();
  }, []);

  return (
    <AdminLayout active="dashboard">
      <section className="admin-cards">
        <Card label="Projetos" value={stats?.totalProjects ?? "—"} />
        <Card label="Sessões (30d)" value={stats?.pageviews30 ?? "—"} />
        <Card label="Visitantes únicos (30d)" value={stats?.uniqueVisitors30 ?? "—"} />
        <Card label="Cliques em contato (30d)" value={stats?.contactClicks30 ?? "—"} />
      </section>

      <section className="admin-section">
        <header className="admin-section__head">
          <h2 className="admin-section__title">Sessões — últimos 14 dias</h2>
          <a className="admin-link" href={routes.adminAnalytics}>
            ver analytics completo →
          </a>
        </header>
        <div className="admin-chart" style={{ height: 180 }}>
          {daily14.length > 0 && <SessionsChart data={daily14} height={180} />}
        </div>
      </section>

      <section className="admin-section">
        <header className="admin-section__head">
          <h2 className="admin-section__title">Últimos projetos editados</h2>
          <a className="admin-btn admin-btn--ghost" href={routes.adminProjects}>
            ver todos
          </a>
        </header>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Atualizado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.slug}>
                  <td>
                    {p.title} <em>{p.em}</em>
                  </td>
                  <td className="mono">{new Date(p.updated_at).toLocaleString("pt-BR")}</td>
                  <td style={{ textAlign: "right" }}>
                    <a className="admin-link" href={routes.adminProjectEdit(p.slug)}>
                      editar →
                    </a>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={3} className="mono" style={{ opacity: 0.6 }}>
                    sem projetos ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-card">
      <span className="admin-card__label mono">{label}</span>
      <span className="admin-card__value">{value}</span>
    </div>
  );
}
