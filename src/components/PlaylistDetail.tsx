import { useState, useEffect } from "react";
import {
  getPlaylistDetails,
  playTrack,
  playPlaylist,
  getCurrentPlayback,
} from "@/utils/spotify";
import { MediaDetail } from "@/components/MediaDetail";
import { SpotifyPlaylistDetails } from "@/utils/spotify.types";

interface PlaylistDetailProps {
  playlistId: string;
  onBack: () => void;
  isPlaying?: boolean;
  onPlay?: (uri: string) => Promise<void>;
}

export function PlaylistDetail({ playlistId, onBack }: PlaylistDetailProps) {
  const [playlist, setPlaylist] = useState<SpotifyPlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    uri: string;
    isPlaying: boolean;
  } | null>(null);
  const [playlistIsPlaying, setPlaylistIsPlaying] = useState(false);

  // Fetch playlist details
  useEffect(() => {
    const loadPlaylistDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const details = await getPlaylistDetails(playlistId);
        if (details) {
          setPlaylist(details);
        } else {
          setError("Could not load playlist details");
        }
      } catch (err) {
        setError("Error loading playlist details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylistDetails();
  }, [playlistId]);

  // Check if this playlist or any of its tracks is currently playing
  useEffect(() => {
    const checkPlaybackState = async () => {
      try {
        const playback = await getCurrentPlayback();

        if (playback && playback.item) {
          // Check if this playlist is the current context
          if (playback.context?.uri === playlist?.uri) {
            setPlaylistIsPlaying(playback.is_playing);
          } else {
            setPlaylistIsPlaying(false);
          }

          // Set currently playing track
          setCurrentlyPlaying({
            uri: playback.item.uri,
            isPlaying: playback.is_playing,
          });
        } else {
          setCurrentlyPlaying(null);
          setPlaylistIsPlaying(false);
        }
      } catch (err) {
        console.error("Error checking playback state:", err);
      }
    };

    if (playlist) {
      checkPlaybackState();

      // Set up interval to periodically check playback state
      const interval = setInterval(checkPlaybackState, 5000);
      return () => clearInterval(interval);
    }
  }, [playlist]);

  const handlePlayTrack = async (uri: string) => {
    await playTrack(uri);
    setCurrentlyPlaying({ uri, isPlaying: true });
  };

  const handlePlayPlaylist = async () => {
    if (playlist?.uri) {
      const success = await playPlaylist(playlist.uri);
      if (success) {
        setPlaylistIsPlaying(true);
      }
    }
  };

  if (!playlist && !loading && !error) {
    return null;
  }

  return (
    <MediaDetail
      title={playlist?.name || "Playlist"}
      loading={loading}
      error={error}
      onBack={onBack}
      headerProps={
        playlist
          ? {
              name: playlist.name,
              images: playlist.images,
              onBack,
              onPlay: handlePlayPlaylist,
              isPlaying: playlistIsPlaying,
              primaryInfo: (
                <>
                  {playlist.description && (
                    <p
                      className="text-muted-foreground mb-2"
                      dangerouslySetInnerHTML={{ __html: playlist.description }}
                    />
                  )}
                  <p className="text-sm mb-1">{playlist.tracks.total} tracks</p>
                  {playlist.owner && (
                    <p className="text-xs text-muted-foreground mb-4">
                      By {playlist.owner.display_name}
                    </p>
                  )}
                </>
              ),
              secondaryInfo: (
                <>
                  {playlist.followers && (
                    <p className="text-xs text-muted-foreground">
                      {playlist.followers.total.toLocaleString()} followers
                    </p>
                  )}
                </>
              ),
            }
          : undefined
      }
      tracks={
        playlist?.tracks.items.map((item, i) => {
          const track = item.track;
          const isCurrentTrack = currentlyPlaying?.uri === track.uri;

          return {
            id: track.id,
            index: i + 1,
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
