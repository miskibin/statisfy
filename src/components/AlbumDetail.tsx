import { useState, useEffect } from "react";
import {
  getAlbumDetails,
  playTrackWithContext,
  setPlaybackContext,
  playAlbum,
} from "@/utils/spotify";
import { spotifyApi } from "@/utils/apiClient";
import { MediaDetail } from "@/components/MediaDetail";
import {
  SpotifyAlbumDetails,
  SpotifyPlaybackState,
} from "@/utils/spotify.types";
import { Star } from "lucide-react";
import { useNavigate } from "@/App";

interface AlbumDetailProps {
  albumId: string;
  onBack: () => void;
  isPlaying?: boolean;
  onPlay?: (uri: string) => Promise<void>;
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
  const navigate = useNavigate(); // Added navigate for artist navigation

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
        const playback = await spotifyApi.get<SpotifyPlaybackState>(
          "/me/player"
        );

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
    // Create playback context with all album tracks
    const trackUris = album?.tracks.items.map((track) => track.uri) || [];

    // Set the playback context
    setPlaybackContext("album", albumId, trackUris, uri);

    // Play the track with context (which will queue subsequent tracks)
    const success = await playTrackWithContext(uri);
    if (success) {
      setCurrentlyPlaying({ uri, isPlaying: true });
    }
  };

  const handlePlayAlbum = async () => {
    if (album?.uri) {
      const success = await playAlbum(album.uri);
      if (success) {
        setAlbumIsPlaying(true);
      }
    }
  };

  // Handle artist click to navigate to artist detail page
  const handleArtistClick = (artistId: string) => {
    navigate(`/artists/${artistId}`);
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

  // Create clickable artist links for the album header
  const renderArtistLinks = () => {
    if (!album) return null;

    return (
      <p className="text-sm font-medium mb-1">
        {album.artists.map((artist, index) => (
          <span key={artist.id}>
            {index > 0 && ", "}
            <span
              className="hover:underline hover:text-primary cursor-pointer"
              onClick={() => handleArtistClick(artist.id)}
            >
              {artist.name}
            </span>
          </span>
        ))}
      </p>
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
                  {renderArtistLinks()}
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

          // Get the appropriate size of album image for track thumbnails
          const albumImages = album.images || [];
          const imageUrl =
            albumImages.length > 0
              ? albumImages.find((img) => img.width === 64 || img.height === 64)
                  ?.url ||
                albumImages.find(
                  (img) => img.width === 300 || img.height === 300
                )?.url ||
                albumImages[0].url
              : undefined;

          return {
            id: track.id,
            index: track.track_number,
            name: track.name,
            artists: track.artists.map((a) => a.name).join(", "),
            artistsData: track.artists.map((artist) => ({
              id: artist.id,
              name: artist.name,
            })),
            albumId: album.id,
            albumName: album.name,
            imageUrl: imageUrl, // Add album image URL
            duration: track.duration_ms,
            uri: track.uri,
            onPlay: handlePlayTrack,
            isCurrentTrack,
            isPlaying: isCurrentTrack && currentlyPlaying?.isPlaying,
            onArtistClick: handleArtistClick,
          };
        }) || []
      }
    />
  );
}
