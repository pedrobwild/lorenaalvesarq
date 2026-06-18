import { useEffect, useRef, useState } from "react";

/**
 * Autosave de rascunho em `localStorage` para formulários longos.
 *
 * - Persiste o estado serializado com debounce de 800 ms.
 * - Expõe `savedAt` (timestamp do último write) para o indicador
 *   "salvo às HH:mm" perto do botão de salvar.
 * - Expõe `loadDraft()` para o componente decidir se restaura, e
 *   `clearDraft()` para chamar após save bem-sucedido no banco.
 *
 * Não restaura automaticamente: deixa o componente perguntar ao
 * usuário antes de sobrescrever dados vindos do banco — evita
 * surpresa de "perdi minhas edições do servidor".
 */
const PREFIX = "lovable-draft:";
const DEBOUNCE_MS = 800;

type Stored<T> = { data: T; savedAt: number };

export function useAutosaveDraft<T>(key: string | null, data: T, enabled = true) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const timer = useRef<number | null>(null);
  const firstRun = useRef(true);

  // Detecta rascunho existente no mount
  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored<T>;
        setHasDraft(true);
        setSavedAt(parsed.savedAt);
      }
    } catch {
      /* localStorage indisponível ou JSON corrompido — ignora */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced write
  useEffect(() => {
    if (!enabled || !key) return;
    // Evita gravar no primeiro render (estado inicial vazio) — só salva
    // após a primeira mudança real do usuário.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        const stamp = Date.now();
        const payload: Stored<T> = { data, savedAt: stamp };
        localStorage.setItem(PREFIX + key, JSON.stringify(payload));
        setSavedAt(stamp);
        setHasDraft(true);
      } catch {
        /* quota cheia ou modo privado — falha silenciosa */
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [data, enabled, key]);

  function loadDraft(): T | null {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      return (JSON.parse(raw) as Stored<T>).data;
    } catch {
      return null;
    }
  }

  function clearDraft() {
    if (!key) return;
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignora */
    }
    setHasDraft(false);
    setSavedAt(null);
  }

  return { savedAt, hasDraft, loadDraft, clearDraft };
}

export function formatSavedAt(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
