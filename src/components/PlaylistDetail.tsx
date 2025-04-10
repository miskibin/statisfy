import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@/App";
import { MediaDetail } from "@/components/MediaDetail";
import {
  getPlaylistDetails,
  playPlaylist,
  playTrack,
  getLikedSongs,
} from "@/utils/spotify";
import {
  SpotifyPlaylistDetails,
  SpotifyPagingObject,
  SpotifyPlaylistTrack,
  SpotifySavedTrack,
  SpotifyPlaybackState,
} from "@/utils/spotify.types";
import { spotifyApi } from "@/utils/apiClient";
import { Heart } from "lucide-react";

interface PlaylistDetailProps {
  playlistId: string;
  onBack?: () => void;
  isPlaying?: boolean;
  onPlay?: (uri: string) => void;
}

export function PlaylistDetail({ playlistId }: PlaylistDetailProps) {
  const [playlist, setPlaylist] = useState<SpotifyPlaylistDetails | null>(null);
  const [tracks, setTracks] = useState<
    (SpotifyPlaylistTrack | SpotifySavedTrack)[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    uri: string;
    isPlaying: boolean;
  } | null>(null);
  const [playlistIsPlaying, setPlaylistIsPlaying] = useState(false);
  const [loadingMoreTracks, setLoadingMoreTracks] = useState(false);
  const [tracksOffset, setTracksOffset] = useState(0);
  const [tracksTotal, setTracksTotal] = useState(0);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);
  const [nextTracksUrl, setNextTracksUrl] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navigate = useNavigate();

  const isLikedSongs = playlistId === "liked-songs";

  // Fetch playlist details or liked songs
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setTracks([]);

      try {
        if (isLikedSongs) {
          const result = await getLikedSongs(50, 0);
          if (result && result.items) {
            setTracks(result.items);
            setTracksTotal(result.total);
            setTracksOffset(50); // Set to limit for next page
            setHasMoreTracks(result.items.length < result.total);
            setNextTracksUrl(result.next);

            // Create a virtual playlist object for liked songs
            setPlaylist({
              id: "liked-songs",
              name: "Liked Songs",
              description: "Songs you've liked across Spotify",
              images: [
                { url: "https://misc.scdn.co/liked-songs/liked-songs-640.png" },
              ],
              uri: "spotify:playlist:liked-songs",
              owner: { display_name: "You" },
              tracks: {
                items: [],
                total: result.total,
                next: result.next,
              },
              followers: { total: 0 },
            });
          } else {
            setError("Could not load your liked songs");
          }
        } else {
          const details = await getPlaylistDetails(playlistId);
          if (details) {
            setPlaylist(details);
            setTracks(details.tracks.items);
            setTracksTotal(details.tracks.total);
            setTracksOffset(details.tracks.items.length); // Set to current items count
            setHasMoreTracks(!!details.tracks.next);
            setNextTracksUrl(details.tracks.next);
          } else {
            setError("Could not load playlist details");
          }
        }
      } catch (err) {
        setError("Error loading music");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [playlistId, isLikedSongs]);

  // Check playback state
  useEffect(() => {
    const checkPlaybackState = async () => {
      try {
        const playback = await spotifyApi.get<SpotifyPlaybackState>(
          "/me/player"
        );

        if (playback && playback.item) {
          // Check if this playlist is the current context
          const playlistUri = playlist?.uri;
          if (playback.context?.uri === playlistUri) {
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
      const interval = setInterval(checkPlaybackState, 5000);
      return () => clearInterval(interval);
    }
  }, [playlist]);

  // Load more tracks when scrolling
  const loadMoreTracks = async () => {
    // Don't attempt to load more if we're already loading or there's nothing more to load
    if (loadingMoreTracks || !hasMoreTracks) return false;

    console.log("Loading more tracks...", {
      isLikedSongs,
      tracksOffset,
      nextTracksUrl,
    });
    setLoadingMoreTracks(true);

    try {
      if (isLikedSongs) {
        const result = await getLikedSongs(50, tracksOffset);
        if (result && result.items && result.items.length > 0) {
          setTracks((prev) => [...prev, ...result.items]);
          setTracksOffset(tracksOffset + result.items.length);
          setHasMoreTracks(result.next !== null);
          setNextTracksUrl(result.next);
          return true;
        } else {
          setHasMoreTracks(false);
          return false;
        }
      } else if (nextTracksUrl) {
        // Extract URL path without base API URL for regular playlists
        const path = nextTracksUrl.substring(nextTracksUrl.indexOf("v1/") + 2);
        const moreTracksData = await spotifyApi.get<
          SpotifyPagingObject<SpotifyPlaylistTrack>
        >(path);

        if (
          moreTracksData &&
          moreTracksData.items &&
          moreTracksData.items.length > 0
        ) {
          setTracks((prev) => [...prev, ...moreTracksData.items]);
          setTracksOffset(tracksOffset + moreTracksData.items.length);
          setHasMoreTracks(moreTracksData.next !== null);
          setNextTracksUrl(moreTracksData.next);
          return true;
        } else {
          setHasMoreTracks(false);
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error("Error loading more tracks:", error);
      return false;
    } finally {
      setLoadingMoreTracks(false);
    }
  };

  // Intersection observer for infinite scroll
  const loadingRef = useCallback(
    (node: HTMLDivElement) => {
      if (!node || loadingMoreTracks || !hasMoreTracks) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0]?.isIntersecting &&
            hasMoreTracks &&
            !loadingMoreTracks
          ) {
            loadMoreTracks();
          }
        },
        {
          rootMargin: "200px", // Load more when 200px from bottom
          threshold: 0.1,
        }
      );

      if (node) observerRef.current.observe(node);
    },
    [loadingMoreTracks, hasMoreTracks, tracksOffset]
  );

  const handlePlayTrack = async (uri: string) => {
    const success = await playTrack(uri);
    if (success) {
      setCurrentlyPlaying({ uri, isPlaying: true });
    }
  };

  const handlePlayPlaylist = async () => {
    if (!playlist?.uri) return;

    if (isLikedSongs && tracks.length > 0) {
      // For liked songs, start playing the first track
      const firstTrackUri =
        "track" in tracks[0]
          ? tracks[0].track.uri
          : (tracks[0] as SpotifySavedTrack).track.uri;

      const success = await playTrack(firstTrackUri);
      if (success) {
        setCurrentlyPlaying({ uri: firstTrackUri, isPlaying: true });
      }
    } else {
      // For regular playlists, play the whole playlist
      const success = await playPlaylist(playlist.uri);
      if (success) {
        setPlaylistIsPlaying(true);
      }
    }
  };

  // Navigation handlers
  const handleArtistClick = (artistId: string) =>
    navigate(`/artists/${artistId}`);
  const handleAlbumClick = (albumId: string) => navigate(`/albums/${albumId}`);

  // Format date for added_at fields
  const formatAddedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Map tracks to the format expected by MediaDetail
  const tracksToDisplay = tracks.map((item, index) => {
    // Handle both types of tracks (from playlists and saved tracks)
    const track =
      "track" in item ? item.track : (item as SpotifyPlaylistTrack).track;
    const isCurrentTrack = currentlyPlaying?.uri === track.uri;
    const isPlaying = isCurrentTrack && currentlyPlaying?.isPlaying;
    const addedAt =
      "added_at" in item ? formatAddedDate(item.added_at) : undefined;

    // Get album image URL - select the appropriate size
    const albumImages = track.album?.images || [];
    // Prefer small images for thumbnails (~64px)
    const imageUrl =
      albumImages.length > 0
        ? // Find smallest suitable image for thumbnails
          albumImages.find((img) => img.width === 64 || img.height === 64)
            ?.url ||
          albumImages.find((img) => img.width === 300 || img.height === 300)
            ?.url ||
          albumImages[0].url // Fallback to first image if no suitable size found
        : undefined;

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
      imageUrl,
      duration: track.duration_ms,
      uri: track.uri,
      onPlay: handlePlayTrack,
      isCurrentTrack,
      isPlaying,
      addedAt,
      onArtistClick: handleArtistClick,
      onAlbumClick: handleAlbumClick,
    };
  });

  // Build header props from playlist data
  const headerProps = playlist
    ? {
        name: playlist.name,
        images: playlist.images,
        primaryInfo: (
          <>
            {isLikedSongs ? (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" fill="#ff0000" />
                <p className="text-sm font-medium">Your Liked Songs</p>
              </div>
            ) : (
              <p className="text-muted-foreground mb-1">
                By {playlist.owner?.display_name || "Unknown"}
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-1">
              {tracksTotal} tracks
            </p>
          </>
        ),
        secondaryInfo: (
          <>
            {playlist.description && (
              <p
                className="text-sm text-muted-foreground mb-1"
                dangerouslySetInnerHTML={{ __html: playlist.description }}
              />
            )}
            {!isLikedSongs && playlist.followers && (
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
    : undefined;

  return (
    <MediaDetail
      title={playlist?.name || "Playlist"}
      loading={loading}
      error={error}
      onBack={() => navigate("/playlists")}
      loadingRef={loadingRef}
      loadingMore={loadingMoreTracks}
      hasMore={hasMoreTracks}
      headerProps={headerProps}
      tracks={tracksToDisplay}
    />
  );
}
