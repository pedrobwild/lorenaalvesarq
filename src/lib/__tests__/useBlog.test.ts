/**
 * Cobertura do bug A5 do audit (#2): o desempate por data em
 * `useRelatedBlogPosts` quebrava com `TypeError` quando ambos
 * `published_at` e `created_at` eram nulos — derrubando o bloco
 * inteiro de "leia também" da página do post.
 *
 * Como `useRelatedBlogPosts` é um hook que depende de outro hook
 * (`useBlogPosts` → Supabase), testamos a função de ordenação que
 * está dentro dele indiretamente via render: mockamos o Supabase
 * com dados que reproduzem o cenário e verificamos que o hook
 * devolve a lista (ordenada) em vez de explodir.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";

const { selectMock } = vi.hoisted(() => {
  return { selectMock: vi.fn() };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: selectMock,
        })),
      })),
    })),
  },
}));

import { useRelatedBlogPosts, type BlogPost } from "@/lib/useBlog";

function makePost(overrides: Partial<BlogPost>): BlogPost {
  return {
    id: "id",
    slug: "slug",
    title: "Título",
    subtitle: null,
    excerpt: null,
    content_html: "<p>x</p>",
    cover_url: null,
    cover_url_md: null,
    cover_url_sm: null,
    cover_alt: null,
    cover_blur_data_url: null,
    category: null,
    tags: null,
    reading_minutes: null,
    author_name: null,
    author_role: null,
    published_at: null,
    visible: true,
    order_index: null,
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    og_image_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  selectMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("useRelatedBlogPosts — A5 (TypeError no desempate por data)", () => {
  it("não quebra quando posts têm published_at e created_at nulos", async () => {
    // Dois posts candidatos: ambos com datas nulas (cenário que
    // antes derrubava o `.localeCompare`).
    const current = makePost({
      id: "current",
      slug: "current",
      tags: ["arquitetura"],
      created_at: "2026-03-01T00:00:00.000Z",
    });
    const candidateA = makePost({
      id: "a",
      slug: "a",
      tags: ["arquitetura"],
      published_at: null,
      // @ts-expect-error simular dado vindo do banco com created_at nulo
      created_at: null,
    });
    const candidateB = makePost({
      id: "b",
      slug: "b",
      tags: ["arquitetura"],
      published_at: null,
      // @ts-expect-error simular dado vindo do banco com created_at nulo
      created_at: null,
    });

    selectMock.mockResolvedValueOnce({ data: [current, candidateA, candidateB] });

    const { result } = renderHook(() => useRelatedBlogPosts(current));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.related).toHaveLength(2);
    expect(result.current.related.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("ordena por mais recente quando as datas existem", async () => {
    const current = makePost({
      id: "current",
      slug: "current",
      tags: ["arquitetura"],
      published_at: "2026-04-01T00:00:00.000Z",
    });
    const older = makePost({
      id: "older",
      slug: "older",
      tags: ["arquitetura"],
      published_at: "2026-01-01T00:00:00.000Z",
    });
    const newer = makePost({
      id: "newer",
      slug: "newer",
      tags: ["arquitetura"],
      published_at: "2026-03-01T00:00:00.000Z",
    });

    selectMock.mockResolvedValueOnce({ data: [current, older, newer] });

    const { result } = renderHook(() => useRelatedBlogPosts(current));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.related.map((p) => p.id)).toEqual(["newer", "older"]);
  });

  it("devolve [] sem quebrar quando current é null", () => {
    selectMock.mockResolvedValueOnce({ data: [] });
    const { result } = renderHook(() => useRelatedBlogPosts(null));
    expect(result.current.related).toEqual([]);
  });
});
