import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ReviewInput {
	rating: number;
	review_text?: string;
	longevity_rating?: number;
	sillage_rating?: number;
	projection_rating?: number;
}

export const useReviews = (perfumeId: string) => {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	const listQuery = useQuery({
		queryKey: ["reviews", perfumeId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("reviews")
				.select("id, user_id, rating, review_text, longevity_rating, sillage_rating, projection_rating, created_at")
				.eq("perfume_id", perfumeId)
				.order("created_at", { ascending: false });
			if (error) throw new Error(error.message);
			return data || [];
		},
		enabled: Boolean(perfumeId),
	});

	const userReviewQuery = useQuery({
		queryKey: ["reviews", "me", user?.id, perfumeId],
		queryFn: async () => {
			if (!user) return null;
			const { data, error } = await supabase
				.from("reviews")
				.select("id, rating, review_text, longevity_rating, sillage_rating, projection_rating")
				.eq("perfume_id", perfumeId)
				.eq("user_id", user.id)
				.maybeSingle();
			if (error) throw new Error(error.message);
			return data;
		},
		enabled: Boolean(user && perfumeId),
	});

	const submitReview = async (input: ReviewInput) => {
		if (!user) return { ok: false, reason: "not_authenticated" } as const;
		const payload = {
			user_id: user.id,
			perfume_id: perfumeId,
			rating: input.rating,
			review_text: input.review_text,
			longevity_rating: input.longevity_rating,
			sillage_rating: input.sillage_rating,
			projection_rating: input.projection_rating,
		};
		const { error } = await supabase
			.from("reviews")
			.upsert(payload, { onConflict: "user_id,perfume_id" });
		if (error) return { ok: false, reason: error.message } as const;
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["reviews", perfumeId] }),
			queryClient.invalidateQueries({ queryKey: ["reviews", "me", user.id, perfumeId] }),
		]);
		return { ok: true } as const;
	};

	return {
		reviews: listQuery.data || [],
		loading: listQuery.isLoading,
		myReview: userReviewQuery.data,
		submitReview,
	};
};