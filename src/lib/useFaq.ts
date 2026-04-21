import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  order_index: number;
  visible: boolean;
};

/**
 * useFaq — busca os FAQs visíveis do banco.
 *
 * Estratégia de fallback: se a chamada falhar ou retornar vazio, devolve um
 * array mínimo para que o site nunca renderize sem conteúdo.
 *
 * Os 7 itens originais foram migrados para a tabela `faq_items` quando a
 * feature foi implantada. A partir daí, o admin é a fonte de verdade.
 */
const FALLBACK: FaqItem[] = [
  {
    id: "fallback-1",
    question: "O estúdio atende em Uberlândia e em outras cidades?",
    answer:
      "Sim. A base do estúdio é em Uberlândia/MG, mas atendemos projetos em todo o Triângulo Mineiro, em Minas Gerais e em outros estados.",
    order_index: 10,
    visible: true,
  },
];

export function useFaq() {
  const [items, setItems] = useState<FaqItem[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("faq_items")
      .select("id, question, answer, order_index, visible")
      .eq("visible", true)
      .order("order_index", { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (data && data.length > 0 && !error) {
          setItems(data as FaqItem[]);
        }
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { items, loading };
}
