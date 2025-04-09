import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@/App";
import { MediaDetail } from "@/components/MediaDetail";
import {
  getPlaylistDetails,
  playPlaylist,
  playTrack,
  getCurrentPlayback,
} from "@/utils/spotify";
import {
  SpotifyPlaylistDetails,
  SpotifyPagingObject,
  SpotifyPlaylistTrack,
} from "@/utils/spotify.types";
import { spotifyApi } from "@/utils/apiClient";

interface PlaylistDetailProps {
  playlistId: string;
  onBack?: () => void;
  isPlaying?: boolean;
  onPlay?: (uri: string) => void;
}

export function PlaylistDetail({ playlistId }: PlaylistDetailProps) {
  const [playlist, setPlaylist] = useState<SpotifyPlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    uri: string;
    isPlaying: boolean;
  } | null>(null);
  const [playlistIsPlaying, setPlaylistIsPlaying] = useState(false);
  const [loadingMoreTracks, setLoadingMoreTracks] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navigate = useNavigate();

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

  // Function to load more tracks when user scrolls to the bottom
  const loadMoreTracks = async () => {
    if (!playlist || !playlist.tracks.next || loadingMoreTracks) return false;

    setLoadingMoreTracks(true);
    try {
      const nextUrl = playlist.tracks.next;
      // Extract URL path without base API URL
      const path = nextUrl.substring(
        nextUrl.indexOf("v1/") + 2,
        nextUrl.length
      );

      const moreTracksData = await spotifyApi.get<
        SpotifyPagingObject<SpotifyPlaylistTrack>
      >(path);

      if (moreTracksData && moreTracksData.items) {
        setPlaylist({
          ...playlist,
          tracks: {
            ...playlist.tracks,
            items: [...playlist.tracks.items, ...moreTracksData.items],
            next: moreTracksData.next,
          },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error loading more tracks:", error);
      return false;
    } finally {
      setLoadingMoreTracks(false);
    }
  };

  // Handle intersection with load more trigger
  const loadingRef = useCallback(
    (node: HTMLDivElement) => {
      if (loadingMoreTracks) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreTracks();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loadingMoreTracks]
  );

  const handlePlayTrack = async (uri: string) => {
    const success = await playTrack(uri);
    if (success) {
      setCurrentlyPlaying({ uri, isPlaying: true });
    }
  };

  const handlePlayPlaylist = async () => {
    if (playlist?.uri) {
      const success = await playPlaylist(playlist.uri);
      if (success) {
        setPlaylistIsPlaying(true);
      }
    }
  };

  // Navigate to artist profile
  const handleArtistClick = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  // Navigate to album page
  const handleAlbumClick = (albumId: string) => {
    navigate(`/albums/${albumId}`);
  };

  return (
    <MediaDetail
      title={playlist?.name || "Playlist"}
      loading={loading}
      error={error}
      onBack={() => navigate("/playlists")}
      loadingRef={loadingRef}
      loadingMore={loadingMoreTracks}
      hasMore={!!playlist?.tracks.next}
      headerProps={
        playlist
          ? {
              images: playlist.images,
              name: playlist.name,
              primaryInfo: (
                <p className="text-muted-foreground mb-1">
                  By {playlist.owner?.display_name || "Unknown"}
                </p>
              ),
              secondaryInfo: (
                <>
                  <p className="text-sm text-muted-foreground mb-1">
                    {playlist.tracks.total} tracks
                  </p>
                  {playlist.description && (
                    <p
                      className="text-sm text-muted-foreground mb-1"
                      dangerouslySetInnerHTML={{ __html: playlist.description }}
                    />
                  )}
                  {playlist.followers && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {playlist.followers.total.toLocaleString()} followers
                    </p>
                  )}
                </>
              ),
              onPlay: handlePlayPlaylist,
              onBack: () => navigate("/playlists"),
              isPlaying: playlistIsPlaying,
            }
          : undefined
      }
      tracks={
        playlist?.tracks.items.map((item, index) => {
          const { track } = item;
          const isCurrentTrack = currentlyPlaying?.uri === track.uri;

          return {
            id: track.id,
            index: index + 1,
            name: track.name,
            artists: track.artists.map((a) => a.name).join(", "),
            artistsData: track.artists.map((artist) => ({
              id: artist.id,
              name: artist.name,
            })),
            albumId: track.album.id,
            albumName: track.album.name,
            duration: track.duration_ms,
            uri: track.uri,
            onPlay: handlePlayTrack,
            isCurrentTrack,
            isPlaying: isCurrentTrack && currentlyPlaying?.isPlaying,
            onArtistClick: handleArtistClick,
            onAlbumClick: handleAlbumClick,
          };
        }) || []
      }
    />
  );
}
