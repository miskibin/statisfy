import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "@/App";
import { MediaDetail } from "./MediaDetail";
import { AlbumDetail } from "./AlbumDetail";
import {
  getArtistDetails,
  getArtistTopTracks,
  getArtistAlbums,
  playTrack,
  playAlbum,
} from "@/utils/spotify";
import {
  SpotifyArtistDetails,
  SpotifyAlbum,
  SpotifyTrackItem,
} from "@/utils/spotify.types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Disc, Play } from "lucide-react";

interface ArtistDetailProps {
  artistId: string;
}

export function ArtistDetail({ artistId }: ArtistDetailProps) {
  const [artistDetails, setArtistDetails] =
    useState<SpotifyArtistDetails | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyTrackItem[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlayingTrackId, setCurrentlyPlayingTrackId] = useState<
    string | null
  >(null);
  const [currentlyPlayingAlbumId, setCurrentlyPlayingAlbumId] = useState<
    string | null
  >(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate();

  // Load artist data
  useEffect(() => {
    const loadArtistData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch artist details
        const artist = await getArtistDetails(artistId);
        if (!artist) {
          throw new Error("Could not load artist details");
        }

        setArtistDetails(artist);

        // Fetch top tracks
        const tracks = await getArtistTopTracks(artistId);
        if (tracks && tracks.tracks) {
          setTopTracks(tracks.tracks.slice(0, 6)); // Limit to 6 top tracks
        }

        // Fetch albums
        const albumData = await getArtistAlbums(artistId);
        if (albumData && albumData.items) {
          setAlbums(albumData.items);
        }
      } catch (error) {
        console.error("Error loading artist data:", error);
        setError("Failed to load artist data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadArtistData();
  }, [artistId]);

  // Format followers count
  const formatFollowers = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M followers`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K followers`;
    } else {
      return `${count} followers`;
    }
  };

  // Handle track play
  const handlePlayTrack = useCallback(async (uri: string) => {
    try {
      const success = await playTrack(uri);
      if (success) {
        // Extract track ID from URI (format: spotify:track:id)
        const idParts = uri.split(":");
        if (idParts.length === 3) {
          setCurrentlyPlayingTrackId(idParts[2]);
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Failed to play track:", error);
    }
  }, []);

  // Handle album play
  const handlePlayAlbum = useCallback(async (uri: string) => {
    try {
      const success = await playAlbum(uri);
      if (success) {
        // Extract album ID from URI (format: spotify:album:id)
        const idParts = uri.split(":");
        if (idParts.length === 3) {
          setCurrentlyPlayingAlbumId(idParts[2]);
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Failed to play album:", error);
    }
  }, []);

  // Handle navigation to another artist
  const handleArtistClick = useCallback(
    (artistId: string) => {
      navigate(`/artists/${artistId}`);
    },
    [navigate]
  );

  // Format the track data for MediaDetail component with artist data
  const mediaDetailTracks = useMemo(() => {
    return topTracks.map((track, index) => ({
      id: track.id,
      index: index + 1,
      name: track.name,
      artists: track.artists.map((artist) => artist.name).join(", "),
      artistsData: track.artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),
      duration: track.duration_ms,
      uri: track.uri,
      onPlay: handlePlayTrack,
      isCurrentTrack: track.id === currentlyPlayingTrackId,
      isPlaying: isPlaying && track.id === currentlyPlayingTrackId,
      onArtistClick: handleArtistClick,
    }));
  }, [
    topTracks,
    currentlyPlayingTrackId,
    isPlaying,
    handlePlayTrack,
    handleArtistClick,
  ]);

  // Create header props for MediaDetail
  const headerProps = useMemo(() => {
    if (!artistDetails) return undefined;

    return {
      images: artistDetails.images,
      name: artistDetails.name,
      primaryInfo: (
        <p className="text-muted-foreground mb-2">
          {formatFollowers(artistDetails.followers.total)}
        </p>
      ),
      secondaryInfo: (
        <div className="flex flex-wrap gap-1 mb-4 max-w-md">
          {artistDetails.genres.slice(0, 5).map((genre, index) => (
            <span
              key={index}
              className="bg-muted text-xs rounded-full px-2 py-1 text-muted-foreground"
            >
              {genre}
            </span>
          ))}
        </div>
      ),
      onPlay: async () => {
        if (topTracks.length > 0) {
          await handlePlayTrack(topTracks[0].uri);
        }
      },
      onBack: () => navigate("/artists"),
      isPlaying: isPlaying,
      compact: false,
    };
  }, [artistDetails, topTracks, isPlaying, handlePlayTrack, navigate]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-10 bg-muted/40 rounded-md w-1/4 mb-4"></div>
          <div className="flex gap-6 mb-8">
            <div className="w-48 h-48 bg-muted/40 rounded-md"></div>
            <div className="flex-1">
              <div className="h-4 bg-muted/40 rounded-md w-1/3 mb-2"></div>
              <div className="h-4 bg-muted/40 rounded-md w-1/2 mb-4"></div>
              <div className="h-8 bg-muted/40 rounded-md w-24 mb-2"></div>
            </div>
          </div>
          <div className="h-8 bg-muted/40 rounded-md w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !artistDetails) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            {error || "Could not load artist details"}
          </p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </Card>
      </div>
    );
  }

  // If an album is selected, show the album detail view
  if (selectedAlbumId) {
    return (
      <AlbumDetail
        albumId={selectedAlbumId}
        onBack={() => setSelectedAlbumId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Artist info header and tabs */}
      <div className="px-6 pb-0">
        <MediaDetail
          title={artistDetails.name}
          loading={false}
          error={null}
          headerProps={headerProps}
          tracks={mediaDetailTracks}
          onBack={() => navigate("/artists")}
        />
      </div>

      {/* Albums section */}
      <div className="px-6 pb-6">
        <h2 className="text-xl font-bold mb-4">Albums</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {albums.map((album) => (
            <div
              key={album.id}
              className="group cursor-pointer"
              onClick={() => setSelectedAlbumId(album.id)}
            >
              <div className="aspect-square bg-muted/40 rounded-md overflow-hidden relative mb-2">
                {album.images && album.images.length > 0 ? (
                  <img
                    src={album.images[0].url}
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={(e) => {
                      e.stopPropagation();
                      album.uri && handlePlayAlbum(album.uri);
                    }}
                  >
                    <Play className="h-6 w-6 ml-0.5" />
                  </Button>
                </div>
              </div>
              <div className="truncate font-medium">{album.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {album.release_date?.substring(0, 4)} •{" "}
                {album.name.toLowerCase().includes("single")
                  ? "Single"
                  : "Album"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
