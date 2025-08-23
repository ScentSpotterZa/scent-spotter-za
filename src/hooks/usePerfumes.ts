import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Perfume = Tables<"perfumes">;

export const usePerfumes = (searchQuery?: string, limit = 12) => {
  return useQuery({
    queryKey: ["perfumes", searchQuery, limit],
    queryFn: async () => {
      let query = supabase
        .from("perfumes")
        .select("*")
        .eq("is_available", true)
        .order("view_count", { ascending: false });

      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,notes.cs.{${searchQuery}}`
        );
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
  });
};

export const usePerfume = (id: string) => {
  return useQuery({
    queryKey: ["perfume", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Track view
      await supabase.from("analytics").insert({
        event_type: "view",
        perfume_id: id,
      });

      // Increment view count
      await supabase
        .from("perfumes")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", id);

      return data;
    },
  });
};

export const useTrendingPerfumes = (limit = 8) => {
  return useQuery({
    queryKey: ["trending-perfumes", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("*")
        .eq("is_available", true)
        .order("view_count", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
  });
};