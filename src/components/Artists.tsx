import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/App";
import { spotifyApi } from "@/utils/apiClient";
import { SpotifyArtistDetails } from "@/utils/spotify.types";
import { PersonStanding } from "lucide-react";

interface ArtistItem {
  id: string;
  name: string;
  images: { url: string }[];
  followers?: {
    total: number;
  };
  genres?: string[];
}

export function Artists() {
  const [topArtists, setTopArtists] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user's top artists
        const response = await spotifyApi.get<{
          items: SpotifyArtistDetails[];
        }>("/me/top/artists?time_range=medium_term&limit=18");

        if (response && response.items) {
          setTopArtists(response.items);
        } else {
          throw new Error("Failed to load artists");
        }
      } catch (error) {
        console.error("Error fetching artists:", error);
        setError("Failed to load artists. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Artists</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-muted/40 rounded-full mb-2"></div>
              <div className="h-4 bg-muted/40 rounded-md w-3/4 mb-1 mx-auto"></div>
              <div className="h-3 bg-muted/40 rounded-md w-1/2 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (topArtists.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Artists</h1>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No artists found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Your Top Artists</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {topArtists.map((artist) => (
          <div
            key={artist.id}
            className="flex flex-col items-center text-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/artists/${artist.id}`)}
          >
            <div className="aspect-square w-full rounded-full overflow-hidden bg-muted/40 mb-2 relative">
              {artist.images && artist.images.length > 0 ? (
                <img
                  src={artist.images[0].url}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PersonStanding className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="font-medium mt-2">{artist.name}</p>
            <p className="text-xs text-muted-foreground">Artist</p>
          </div>
        ))}
      </div>
    </div>
  );
}
