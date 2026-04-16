import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type CatalogState = {
  loading: boolean;
  formats: string[];
  error: string | null;
};

export function useMagicCatalog() {
  const [state, setState] = useState<CatalogState>({
    loading: true,
    formats: [],
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      const { data, error } = await supabase
        .from("formats")
        .select("name")
        .order("name", { ascending: true });

      if (!active) {
        return;
      }

      if (error) {
        setState({
          loading: false,
          formats: [],
          error: error.message,
        });
        return;
      }

      setState({
        loading: false,
        formats: data.map((item) => item.name),
        error: null,
      });
    }

    loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  return state;
}

