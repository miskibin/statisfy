import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@/App";
import { MediaDetail } from "@/components/MediaDetail";
import {
  getPlaylistDetails,
  playPlaylist,
  playTrack,
  getLikedSongs,
  playTrackWithContext,
  setPlaybackContext,
} from "@/utils/spotify";
import {
  SpotifyPlaylistDetails,
  SpotifyPagingObject,
  SpotifyPlaylistTrack,
  SpotifySavedTrack,
} from "@/utils/spotify.types";
import { spotifyApi } from "@/utils/apiClient";
import { Heart } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";

interface PlaylistDetailProps {
  playlistId: string;
  onBack?: () => void;
  isPlaying?: boolean;
  onPlay?: (uri: string) => void;
}

export function PlaylistDetail({ playlistId, onBack }: PlaylistDetailProps) {
  const [playlist, setPlaylist] = useState<SpotifyPlaylistDetails | null>(null);
  const [tracks, setTracks] = useState<(SpotifyPlaylistTrack | SpotifySavedTrack)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMoreTracks, setLoadingMoreTracks] = useState(false);
  const [tracksOffset, setTracksOffset] = useState(0);
  const [tracksTotal, setTracksTotal] = useState(0);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);
  const [nextTracksUrl, setNextTracksUrl] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navigate = useNavigate();

  // Get player state from store
  const { isPlaying, currentTrack, sourceType, sourceId } = usePlayerStore();

  const isLikedSongs = playlistId === "liked-songs";
  const isCurrentPlaylist = sourceType === "playlist" && sourceId === playlistId;

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
            setTracksOffset(50);
            setHasMoreTracks(result.items.length < result.total);
            setNextTracksUrl(result.next);

            // Create virtual playlist object
            setPlaylist({
              id: "liked-songs",
              name: "Liked Songs",
              description: "Songs you've liked across Spotify",
              images: [{
                url: "https://misc.scdn.co/liked-songs/liked-songs-640.png",
                height: 640,
                width: 640,
              }],
              uri: "spotify:playlist:liked-songs",
              owner: { display_name: "You" },
              tracks: {
                href: "",
                items: [],
                limit: 50,
                next: result.next,
                offset: 0,
                previous: null,
                total: result.total,
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
            setTracksOffset(details.tracks.items.length);
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

  // Load more tracks when scrolling
  const loadMoreTracks = async () => {
    if (loadingMoreTracks || !hasMoreTracks) return false;

    setLoadingMoreTracks(true);
    try {
      if (isLikedSongs) {
        const result = await getLikedSongs(50, tracksOffset);
        if (result?.items?.length) {
          setTracks(prev => [...prev, ...result.items]);
          setTracksOffset(tracksOffset + result.items.length);
          setHasMoreTracks(!!result.next);
          setNextTracksUrl(result.next);
          return true;
        }
      } else if (nextTracksUrl) {
        const path = nextTracksUrl.substring(nextTracksUrl.indexOf("v1/") + 2);
        const moreTracksData = await spotifyApi.get<SpotifyPagingObject<SpotifyPlaylistTrack>>(path);
        
        if (moreTracksData?.items?.length) {
          setTracks(prev => [...prev, ...moreTracksData.items]);
          setTracksOffset(tracksOffset + moreTracksData.items.length);
          setHasMoreTracks(!!moreTracksData.next);
          setNextTracksUrl(moreTracksData.next);
          return true;
        }
      }
      
      setHasMoreTracks(false);
      return false;
    } catch (error) {
      console.error("Error loading more tracks:", error);
      return false;
    } finally {
      setLoadingMoreTracks(false);
    }
  };

  // Intersection observer for infinite scroll
  const loadingRef = useCallback(node => {
    if (!node || loadingMoreTracks || !hasMoreTracks) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMoreTracks && !loadingMoreTracks) {
          loadMoreTracks();
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    
    observerRef.current.observe(node);
  }, [loadingMoreTracks, hasMoreTracks]);

  // Handle playing a track from the playlist
  const handlePlayTrack = async (uri: string) => {
    // Get all track URIs from the playlist
    const trackUris = tracks.map(item => 
      "track" in item ? item.track.uri : item.track.uri
    );
    
    // Set up playback context
    setPlaybackContext(
      "playlist", 
      isLikedSongs ? "liked-songs" : playlistId, 
      trackUris, 
      uri
    );
    
    // Play the track with context
    await playTrackWithContext(uri);
  };

  // Handle playing the whole playlist
  const handlePlayPlaylist = async () => {
    if (!playlist?.uri) return;
    
    if (isLikedSongs && tracks.length > 0) {
      // For liked songs, get all track URIs and set up playback
      const trackUris = tracks.map(item => 
        "track" in item ? item.track.uri : item.track.uri
      );
      
      setPlaybackContext("playlist", "liked-songs", trackUris, trackUris[0]);
      await playTrack(trackUris[0]);
    } else {
      // For regular playlists
      await playPlaylist(playlist.uri);
    }
  };

  // Navigation handlers
  const handleArtistClick = (artistId: string) => navigate(`/artists/${artistId}`);
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
    // Handle both playlist and saved track types
    const track = "track" in item ? item.track : item.track;
    const isCurrentlyPlaying = currentTrack?.uri === track.uri;
    const addedAt = "added_at" in item ? formatAddedDate(item.added_at) : undefined;

    // Get appropriate album image
    const albumImages = track.album?.images || [];
    const imageUrl = albumImages.length > 0
      ? albumImages.find(img => img.width === 64 || img.height === 64)?.url || 
        albumImages.find(img => img.width === 300 || img.height === 300)?.url || 
        albumImages[0].url
      : undefined;

    return {
      id: track.id,
      index: index + 1,
      name: track.name,
      artists: track.artists.map(a => a.name).join(", "),
      artistsData: track.artists,
      albumId: track.album.id,
      albumName: track.album.name,
      imageUrl,
      duration: track.duration_ms,
      uri: track.uri,
      onPlay: handlePlayTrack,
      isCurrentTrack: isCurrentlyPlaying,
      isPlaying: isCurrentlyPlaying && isPlaying,
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
        onBack: onBack || (() => navigate("/playlists")), // Use passed onBack or fallback
        isPlaying: isCurrentPlaylist && isPlaying,
      }
    : undefined;

  return (
    <MediaDetail
      title={playlist?.name || "Playlist"}
      loading={loading}
      error={error}
      onBack={onBack || (() => navigate("/playlists"))} // Use passed onBack or fallback
      loadingRef={loadingRef}
      loadingMore={loadingMoreTracks}
      hasMore={hasMoreTracks}
      headerProps={headerProps}
      tracks={tracksToDisplay}
    />
  );
}
