import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, ExternalLink, Clock, Wind, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Perfume } from "@/hooks/usePerfumes";

interface PerfumeCardProps {
  perfume: Perfume;
}

export const PerfumeCard = ({ perfume }: PerfumeCardProps) => {
  const navigate = useNavigate();

  const handleAmazonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track affiliate click
    await supabase.from("analytics").insert({
      event_type: "affiliate_click",
      perfume_id: perfume.id,
    });

    // Increment affiliate clicks
    await supabase
      .from("perfumes")
      .update({ affiliate_clicks: (perfume.affiliate_clicks || 0) + 1 })
      .eq("id", perfume.id);

    // Open Amazon link
    if (perfume.amazon_url) {
      window.open(perfume.amazon_url, "_blank");
    } else {
      toast.error("Amazon link not available");
    }
  };

  const handleCardClick = () => {
    navigate(`/perfume/${perfume.id}`);
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return "Price unavailable";
    return `${currency || "R"}${price.toFixed(0)}`;
  };

  const calculateAverageRating = () => {
    // This would typically come from reviews data
    // For now, return a mock rating based on view count
    const baseRating = 4.0;
    const viewBonus = Math.min((perfume.view_count || 0) / 100, 1) * 0.8;
    return Math.min(baseRating + viewBonus, 5.0);
  };
  return (
    <div 
      className="perfume-card group relative rounded-2xl p-6 border border-border/50 backdrop-blur-sm overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        {/* Header with wishlist */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
              {perfume.name}
            </h3>
            <p className="text-muted-foreground text-sm font-medium">{perfume.brand}</p>
          </div>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Perfume Image */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-primary-soft/20 to-accent-soft/20">
          <img 
            src={perfume.image_url || "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&h=400&fit=crop"}
            alt={`${perfume.brand} ${perfume.name}`}
            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(perfume.price, perfume.currency)}
          </span>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="text-sm font-medium">{calculateAverageRating().toFixed(1)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {(perfume.notes || []).slice(0, 3).map((note, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {note}
              </Badge>
            ))}
            {(perfume.notes || []).length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(perfume.notes || []).length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats - Hidden by default, revealed on hover */}
        <div className="perfume-reveal space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Longevity</span>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 w-2 rounded-full ${i < (perfume.longevity || 0) ? 'bg-primary' : 'bg-muted'}`} 
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-primary" />
              <span>Sillage</span>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 w-2 rounded-full ${i < (perfume.sillage || 0) ? 'bg-primary' : 'bg-muted'}`} 
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Projection</span>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 w-2 rounded-full ${i < (perfume.projection || 0) ? 'bg-primary' : 'bg-muted'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons - Hidden by default, revealed on hover */}
        <div className="perfume-reveal flex gap-2">
          <Button 
            variant="hero" 
            className="flex-1" 
            size="sm"
            onClick={handleAmazonClick}
          >
            Buy on Amazon ZA
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button 
            variant="minimal" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/perfume/${perfume.id}`);
            }}
          >
            Details
          </Button>
        </div>
      </div>
    </div>
  );
};