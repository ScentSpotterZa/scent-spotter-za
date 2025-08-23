import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useWishlist = (perfumeId: string) => {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	const wishlistQuery = useQuery({
		queryKey: ["wishlist", user?.id, perfumeId],
		queryFn: async () => {
			if (!user) return false;
			const { data, error } = await supabase
				.from("wishlists")
				.select("id")
				.eq("user_id", user.id)
				.eq("perfume_id", perfumeId)
				.limit(1);
			if (error) throw new Error(error.message);
			return (data?.length || 0) > 0;
		},
		enabled: Boolean(user && perfumeId),
	});

	const toggleWishlist = async () => {
		if (!user) return { ok: false, reason: "not_authenticated" } as const;
		const isWishlisted = wishlistQuery.data === true;
		if (isWishlisted) {
			const { error } = await supabase
				.from("wishlists")
				.delete()
				.eq("user_id", user.id)
				.eq("perfume_id", perfumeId);
			if (error) return { ok: false, reason: error.message } as const;
		} else {
			const { error } = await supabase
				.from("wishlists")
				.insert({ user_id: user.id, perfume_id: perfumeId });
			if (error) return { ok: false, reason: error.message } as const;
		}
		await queryClient.invalidateQueries({ queryKey: ["wishlist", user.id, perfumeId] });
		return { ok: true } as const;
	};

	return {
		isWishlisted: wishlistQuery.data === true,
		loading: wishlistQuery.isLoading,
		toggleWishlist,
	};
};