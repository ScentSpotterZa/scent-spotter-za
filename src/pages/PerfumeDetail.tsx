import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePerfume } from "@/hooks/usePerfumes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  ExternalLink, 
  Heart, 
  Clock, 
  Wind, 
  Sparkles, 
  Star,
  Eye,
  MousePointer
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const PerfumeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: perfume, isLoading, error } = usePerfume(id!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading perfume details...</span>
        </div>
      </div>
    );
  }

  if (error || !perfume) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Perfume Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The perfume you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const handleAmazonClick = async () => {
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

    if (perfume.amazon_url) {
      window.open(perfume.amazon_url, "_blank");
    } else {
      toast.error("Amazon link not available");
    }
  };

  const handleFragranticaClick = () => {
    if (perfume.fragrantica_url) {
      window.open(perfume.fragrantica_url, "_blank");
    } else {
      toast.error("Fragrantica link not available");
    }
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return "Price unavailable";
    return `${currency || "R"}${price.toFixed(0)}`;
  };

  const calculateAverageRating = () => {
    const baseRating = 4.0;
    const viewBonus = Math.min((perfume.view_count || 0) / 100, 1) * 0.8;
    return Math.min(baseRating + viewBonus, 5.0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Section */}
          <div className="space-y-6">
            <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary-soft/20 to-accent-soft/20">
              <img
                src={perfume.image_url || "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&h=600&fit=crop"}
                alt={`${perfume.brand} ${perfume.name}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <Eye className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{perfume.view_count || 0}</div>
                <div className="text-sm text-muted-foreground">Views</div>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <MousePointer className="h-5 w-5 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold">{perfume.affiliate_clicks || 0}</div>
                <div className="text-sm text-muted-foreground">Clicks</div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                {perfume.name}
              </h1>
              <p className="text-xl text-muted-foreground font-medium mb-4">
                {perfume.brand}
              </p>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="text-3xl font-bold text-primary">
                  {formatPrice(perfume.price, perfume.currency)}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-accent text-accent" />
                  <span className="text-lg font-medium">{calculateAverageRating().toFixed(1)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-8">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="flex-1"
                  onClick={handleAmazonClick}
                >
                  Buy on Amazon ZA
                  <ExternalLink className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg">
                  <Heart className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Description */}
            {perfume.description && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {perfume.description}
                </p>
              </div>
            )}

            {/* Notes */}
            {perfume.notes && perfume.notes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Fragrance Notes</h3>
                <div className="flex flex-wrap gap-2">
                  {perfume.notes.map((note, index) => (
                    <Badge key={index} variant="secondary">
                      {note}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Stats */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>Longevity</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-3 w-3 rounded-full ${i < (perfume.longevity || 0) ? 'bg-primary' : 'bg-muted'}`} 
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="h-5 w-5 text-primary" />
                    <span>Sillage</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-3 w-3 rounded-full ${i < (perfume.sillage || 0) ? 'bg-primary' : 'bg-muted'}`} 
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Projection</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-3 w-3 rounded-full ${i < (perfume.projection || 0) ? 'bg-primary' : 'bg-muted'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {perfume.category && (
                <div>
                  <h4 className="font-medium mb-2">Category</h4>
                  <Badge variant="outline">{perfume.category}</Badge>
                </div>
              )}
              
              {perfume.season && perfume.season.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Season</h4>
                  <div className="flex flex-wrap gap-1">
                    {perfume.season.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {perfume.occasion && perfume.occasion.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Occasion</h4>
                  <div className="flex flex-wrap gap-1">
                    {perfume.occasion.map((o, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{o}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* External Links */}
            <div className="pt-6 border-t border-border/50">
              <Button 
                variant="outline" 
                onClick={handleFragranticaClick}
                className="w-full"
              >
                View on Fragrantica
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfumeDetail;