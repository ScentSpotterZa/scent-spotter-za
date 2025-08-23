import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { PerfumeCard } from "@/components/PerfumeCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Award, Clock } from "lucide-react";
import heroImage from "@/assets/hero-perfume.jpg";

// Mock data for demonstration
const trendingPerfumes = [
  {
    id: "1",
    name: "Sauvage Eau de Toilette",
    brand: "Dior",
    price: "R1,250",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&h=400&fit=crop",
    notes: ["Bergamot", "Sichuan Pepper", "Cedar"],
    longevity: 4,
    sillage: 5,
    projection: 4
  },
  {
    id: "2", 
    name: "Aventus",
    brand: "Creed",
    price: "R4,200",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1565030209074-da3958db50b2?w=400&h=400&fit=crop",
    notes: ["Pineapple", "Birch", "Oakmoss"],
    longevity: 5,
    sillage: 5,
    projection: 5
  },
  {
    id: "3",
    name: "Black Opium",
    brand: "Yves Saint Laurent", 
    price: "R1,680",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?w=400&h=400&fit=crop",
    notes: ["Coffee", "Vanilla", "White Flowers"],
    longevity: 4,
    sillage: 4,
    projection: 3
  },
  {
    id: "4",
    name: "Oud Wood",
    brand: "Tom Ford",
    price: "R3,500",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop",
    notes: ["Oud", "Sandalwood", "Cedar"],
    longevity: 5,
    sillage: 3,
    projection: 3
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 hero-gradient overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
          <img 
            src={heroImage}
            alt="Luxury perfumes" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-6 animate-fade-in">
              <Sparkles className="h-3 w-3 mr-1" />
              South Africa's Premier Fragrance Hub
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 animate-fade-in">
              Discover Your
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Perfect Scent
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed animate-fade-in">
              Explore thousands of fragrances with detailed reviews, stats, and instant Amazon ZA purchasing. 
              Find your signature scent today.
            </p>
            
            <div className="animate-fade-in">
              <SearchBar />
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-20 right-20 w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-float" />
        <div className="absolute bottom-32 left-10 w-8 h-8 bg-gradient-to-br from-accent/30 to-primary/30 rounded-full animate-float" style={{ animationDelay: "1s" }} />
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-b border-border/50">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-soft rounded-xl mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">2,500+</div>
              <div className="text-muted-foreground">Fragrances</div>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-soft rounded-xl mb-4">
                <Award className="h-6 w-6 text-accent" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">200+</div>
              <div className="text-muted-foreground">Brands</div>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-soft rounded-xl mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">15K+</div>
              <div className="text-muted-foreground">Reviews</div>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-soft rounded-xl mb-4">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">24/7</div>
              <div className="text-muted-foreground">Updated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Fragrances */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-display font-bold text-foreground mb-4">
                Trending Now
              </h2>
              <p className="text-muted-foreground text-lg">
                The most popular fragrances among South African fragrance enthusiasts
              </p>
            </div>
            
            <Button variant="minimal" className="hidden md:flex">
              View All
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingPerfumes.map((perfume, index) => (
              <div 
                key={perfume.id} 
                className="animate-fade-in" 
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <PerfumeCard perfume={perfume} />
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button variant="hero" size="lg">
              Explore All Fragrances
              <Sparkles className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 py-12 px-4 border-t border-border/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">FF</span>
            </div>
            <span className="font-display font-bold text-xl">FragranceFinder.co.za</span>
          </div>
          <p className="text-muted-foreground">
            South Africa's premier perfume discovery platform
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
