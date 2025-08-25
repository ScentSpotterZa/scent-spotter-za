import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  defaultValue?: string;
}

export const SearchBar = ({ onSearch, defaultValue = "" }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState(defaultValue);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      // Log analytics (fire-and-forget)  
      supabase.from("analytics").insert({ event_type: "search", search_query: query });
      if (onSearch) {
        onSearch(query);
      } else {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className="search-glow relative flex items-center rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-2 transition-all duration-300">
          <Search className="h-5 w-5 text-muted-foreground ml-4" />
          
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for your perfect fragrance..."
            className="flex-1 border-0 bg-transparent text-lg placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
          />
          
          <div className="flex items-center gap-2 mr-2">
            <Button 
              type="button" 
              variant="minimal" 
              size="sm"
              className="hidden sm:flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            <Button 
              type="submit" 
              variant="hero" 
              size="sm"
              className="px-6"
            >
              <Sparkles className="h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      </form>
      
      {/* Quick search suggestions */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {["Tom Ford", "Creed", "Dior", "Chanel", "YSL"].map((suggestion) => (
          <Button 
            key={suggestion} 
            variant="search" 
            size="sm"
            onClick={() => setSearchQuery(suggestion)}
            className="rounded-full text-xs"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
};