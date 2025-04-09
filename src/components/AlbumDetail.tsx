import { useState, useEffect } from "react";
import {
  getAlbumDetails,
  playTrack,
  playAlbum,
  getCurrentPlayback,
} from "@/utils/spotify";
import { MediaDetail } from "@/components/MediaDetail";
import { SpotifyAlbumDetails } from "@/utils/spotify.types";
import { Star } from "lucide-react";

interface AlbumDetailProps {
  albumId: string;
  onBack: () => void;
}

export function AlbumDetail({ albumId, onBack }: AlbumDetailProps) {
  const [album, setAlbum] = useState<SpotifyAlbumDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    uri: string;
    isPlaying: boolean;
  } | null>(null);
  const [albumIsPlaying, setAlbumIsPlaying] = useState(false);

  // Fetch album details
  useEffect(() => {
    const loadAlbumDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const details = await getAlbumDetails(albumId);
        if (details) {
          setAlbum(details);
        } else {
          setError("Could not load album details");
        }
      } catch (err) {
        setError("Error loading album details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAlbumDetails();
  }, [albumId]);

  // Check if this album or any of its tracks is currently playing
  useEffect(() => {
    const checkPlaybackState = async () => {
      try {
        const playback = await getCurrentPlayback();

        if (playback && playback.item) {
          // Check if this album is the current context
          if (playback.context?.uri === album?.uri) {
            setAlbumIsPlaying(playback.is_playing);
          } else {
            setAlbumIsPlaying(false);
          }

          // Set currently playing track
          setCurrentlyPlaying({
            uri: playback.item.uri,
            isPlaying: playback.is_playing,
          });
        } else {
          setCurrentlyPlaying(null);
          setAlbumIsPlaying(false);
        }
      } catch (err) {
        console.error("Error checking playback state:", err);
      }
    };

    if (album) {
      checkPlaybackState();

      // Set up interval to periodically check playback state
      const interval = setInterval(checkPlaybackState, 5000);
      return () => clearInterval(interval);
    }
  }, [album]);

  const handlePlayTrack = async (uri: string) => {
    await playTrack(uri);
    setCurrentlyPlaying({ uri, isPlaying: true });
  };

  const handlePlayAlbum = async () => {
    if (album?.uri) {
      const success = await playAlbum(album.uri);
      if (success) {
        setAlbumIsPlaying(true);
      }
    }
  };

  if (!album && !loading && !error) {
    return null;
  }

  // Format release date nicely
  const formatReleaseDate = (dateStr?: string, precision?: string) => {
    if (!dateStr) return "";

    try {
      const date = new Date(dateStr);

      if (precision === "day") {
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } else if (precision === "month") {
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        });
      } else {
        return dateStr.substring(0, 4); // Just the year
      }
    } catch (e) {
      return dateStr; // Fallback to original string
    }
  };

  // Render popularity stars
  const renderPopularity = (popularity?: number) => {
    if (!popularity && popularity !== 0) return null;

    // Convert 0-100 scale to 0-5 stars
    const starCount = Math.round((popularity / 100) * 5);

    return (
      <div className="flex items-center gap-1 text-xs mb-2">
        <span className="text-muted-foreground mr-1">Popularity:</span>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={
              i < starCount ? "fill-current text-amber-400" : "text-muted/30"
            }
          />
        ))}
      </div>
    );
  };

  return (
    <MediaDetail
      title={album?.name || "Album"}
      loading={loading}
      error={error}
      onBack={onBack}
      headerProps={
        album
          ? {
              name: album.name,
              images: album.images,
              onBack,
              onPlay: handlePlayAlbum,
              isPlaying: albumIsPlaying,
              primaryInfo: (
                <>
                  <p className="text-sm font-medium mb-1">
                    {album.artists.map((a) => a.name).join(", ")}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    {formatReleaseDate(
                      album.release_date,
                      album.release_date_precision
                    )}{" "}
                    • {album.total_tracks} tracks
                  </p>
                  {album.copyrights && album.copyrights.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {album.copyrights[0].text}
                    </p>
                  )}
                </>
              ),
              secondaryInfo: (
                <>
                  {album.label && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {album.label}
                    </p>
                  )}
                  {album.genres && album.genres.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {album.genres.join(", ")}
                    </p>
                  )}
                  {renderPopularity(album.popularity)}
                </>
              ),
            }
          : undefined
      }
      tracks={
        album?.tracks.items.map((track) => {
          const isCurrentTrack = currentlyPlaying?.uri === track.uri;

          return {
            id: track.id,
            index: track.track_number,
            name: track.name,
            artists: track.artists.map((a) => a.name).join(", "),
            duration: track.duration_ms,
            uri: track.uri,
            onPlay: handlePlayTrack,
            isCurrentTrack,
          };
        }) || []
      }
    />
  );
}
