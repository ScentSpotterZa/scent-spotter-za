import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, ExternalLink, Clock, Wind, Sparkles } from "lucide-react";

interface PerfumeCardProps {
  perfume: {
    id: string;
    name: string;
    brand: string;
    image: string;
    price: string;
    rating: number;
    notes: string[];
    longevity: number;
    sillage: number;
    projection: number;
    isWishlisted?: boolean;
  };
}

export const PerfumeCard = ({ perfume }: PerfumeCardProps) => {
  return (
    <div className="perfume-card group relative rounded-2xl p-6 border border-border/50 backdrop-blur-sm overflow-hidden">
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
            src={perfume.image}
            alt={`${perfume.brand} ${perfume.name}`}
            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-primary">{perfume.price}</span>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="text-sm font-medium">{perfume.rating}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {perfume.notes.slice(0, 3).map((note, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {note}
              </Badge>
            ))}
            {perfume.notes.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{perfume.notes.length - 3}
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
                  className={`h-2 w-2 rounded-full ${i < perfume.longevity ? 'bg-primary' : 'bg-muted'}`} 
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
                  className={`h-2 w-2 rounded-full ${i < perfume.sillage ? 'bg-primary' : 'bg-muted'}`} 
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
                  className={`h-2 w-2 rounded-full ${i < perfume.projection ? 'bg-primary' : 'bg-muted'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons - Hidden by default, revealed on hover */}
        <div className="perfume-reveal flex gap-2">
          <Button variant="hero" className="flex-1" size="sm">
            Buy on Amazon ZA
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="minimal" size="sm">
            Details
          </Button>
        </div>
      </div>
    </div>
  );
};