import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { PerfumeCard } from "@/components/PerfumeCard";
import { usePerfumes } from "@/hooks/usePerfumes";
import { Loader2 } from "lucide-react";

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { data: perfumes, isLoading, error } = usePerfumes(query, 24);

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Search Section */}
      <section className="py-12 px-4 border-b border-border/50">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-display font-bold text-center mb-8">
              {query ? `Search Results for "${query}"` : "Search Fragrances"}
            </h1>
            <SearchBar onSearch={handleSearch} defaultValue={query} />
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Searching fragrances...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-destructive mb-4">Error loading search results</p>
              <p className="text-muted-foreground">Please try again later</p>
            </div>
          ) : perfumes && perfumes.length > 0 ? (
            <>
              <div className="mb-8">
                <p className="text-muted-foreground">
                  Found {perfumes.length} fragrance{perfumes.length !== 1 ? 's' : ''}
                  {query && ` for "${query}"`}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {perfumes.map((perfume, index) => (
                  <div 
                    key={perfume.id} 
                    className="animate-fade-in" 
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <PerfumeCard perfume={perfume} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold mb-4">No fragrances found</h2>
              <p className="text-muted-foreground mb-8">
                {query 
                  ? `We couldn't find any fragrances matching "${query}". Try a different search term.`
                  : "Start searching to discover amazing fragrances!"
                }
              </p>
              <div className="max-w-md mx-auto">
                <SearchBar onSearch={handleSearch} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SearchResults;