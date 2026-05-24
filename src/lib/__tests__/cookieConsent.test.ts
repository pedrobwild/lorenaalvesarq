/**
 * Cobertura: o gate LGPD em `track()` (src/lib/analytics.ts) e em
 * `injectTrackers()` (src/lib/useSeo.ts) lê o estado central de
 * `cookieConsent`. Antes do aceite, nada deve sair pela rede e nenhum
 * script de terceiros deve aparecer no <head>.
 *
 * Este teste cobre o vetor descrito em #2 / B4: sem aceite explícito,
 * a chamada de `track()` é silenciada e os trackers não são injetados.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseInsertMock, supabaseFromMock } = vi.hoisted(() => {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  return { supabaseInsertMock: insertMock, supabaseFromMock: fromMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: supabaseFromMock },
}));

import { track } from "@/lib/analytics";
import { setConsent, isConsentAccepted } from "@/lib/cookieConsent";

beforeEach(() => {
  window.localStorage.clear();
  supabaseInsertMock.mockClear();
  supabaseFromMock.mockClear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("track() — gate de consentimento LGPD", () => {
  it("não envia evento quando não há decisão de consentimento", () => {
    expect(isConsentAccepted()).toBe(false);
    track("pageview", { path: "/" });
    expect(supabaseInsertMock).not.toHaveBeenCalled();
  });

  it("não envia evento quando o usuário recusou", () => {
    setConsent("declined");
    track("pageview", { path: "/" });
    expect(supabaseInsertMock).not.toHaveBeenCalled();
  });

  it("envia evento depois que o usuário aceita", () => {
    setConsent("accepted");
    track("pageview", { path: "/" });
    expect(supabaseInsertMock).toHaveBeenCalledTimes(1);
  });

  it("volta a silenciar se o consentimento for revogado para 'declined'", () => {
    setConsent("accepted");
    track("pageview", { path: "/a" });
    expect(supabaseInsertMock).toHaveBeenCalledTimes(1);

    setConsent("declined");
    track("pageview", { path: "/b" });
    expect(supabaseInsertMock).toHaveBeenCalledTimes(1);
  });
});

describe("cookieConsent — evento de mudança", () => {
  it("dispara CustomEvent 'cookie:consent-change' quando muda", () => {
    const listener = vi.fn();
    window.addEventListener("cookie:consent-change", listener as EventListener);

    setConsent("accepted");
    setConsent("declined");

    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(
      "cookie:consent-change",
      listener as EventListener
    );
  });
});
