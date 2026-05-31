import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFaq } from "@/lib/useFaq";

type Result = { data: unknown; error: unknown };

// Quando definido, a query rejeita em vez de resolver — simula falha de rede.
let rejection: Error | null;
let tableResult: Result;

vi.mock("@/integrations/supabase/client", () => {
  const makeQuery = () => {
    const q = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      order: vi.fn(() =>
        rejection ? Promise.reject(rejection) : Promise.resolve(tableResult)
      ),
    };
    return q;
  };
  const supabase = { from: vi.fn(() => makeQuery()) };
  return { supabase };
});

beforeEach(() => {
  rejection = null;
  tableResult = { data: null, error: null };
});

describe("useFaq", () => {
  it("usa os itens do banco quando a query retorna dados", async () => {
    tableResult = {
      data: [
        {
          id: "db-1",
          question: "Pergunta do banco?",
          answer: "Resposta do banco.",
          order_index: 1,
          visible: true,
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useFaq());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0].id).toBe("db-1");
  });

  it("mantém o fallback quando a query retorna vazio", async () => {
    tableResult = { data: [], error: null };

    const { result } = renderHook(() => useFaq());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0].id).toBe("fallback-1");
  });

  it("encerra o loading e mantém o fallback quando a query rejeita", async () => {
    rejection = new Error("network down");

    const { result } = renderHook(() => useFaq());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0].id).toBe("fallback-1");
  });
});
