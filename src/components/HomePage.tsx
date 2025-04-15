import { useCallback, useEffect, useState, useRef } from "react";
import { Card } from "./ui/card";
import { MediaGrid } from "./MediaGrid";
import { MediaCard } from "./MediaCard";
import { TrackList, TrackItemProps } from "./TrackList";
import {
  getUserPlaylists,
  getNewReleases,
  playTrackWithContext,
  playPlaylist,
  playAlbum,
  getArtistDetails,
} from "@/utils/spotify";
import { useNavigate } from "@/App";
import { Music, Disc, Users, ListMusic, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { usePlayerStore } from "@/stores/playerStore";
import {
  SpotifyPlaylistItem,
  SpotifyAlbum,
  SpotifyArtistDetails,
} from "@/utils/spotify.types";
import { getInternalQueue, getTracksByUris } from "@/utils/queue";

export function HomePage() {
  // State for storing data
  const [queueTracks, setQueueTracks] = useState<TrackItemProps[]>([]);
  const [topPlaylists, setTopPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [newReleases, setNewReleases] = useState<SpotifyAlbum[]>([]);
  const [topArtists, setTopArtists] = useState<SpotifyArtistDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs to prevent infinite updates
  const initialLoadCompleted = useRef(false);
  const isMounted = useRef(true);
  
  // Navigation function
  const navigate = useNavigate();

  // Fetch queue tracks
  const fetchQueueTracks = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const queueUris = getInternalQueue();
      
      if (queueUris.length === 0) {
        setQueueTracks([]);
        return;
      }
      
      const tracks = await getTracksByUris(queueUris);
      
      // Get player state directly from the store
      const { currentTrack, isPlaying, manuallyAddedTracks } = usePlayerStore.getState();
      
      if (!isMounted.current) return;
      
      const trackItems: TrackItemProps[] = tracks.map((item, index) => ({
        id: item.id,
        index: index,
        name: item.name,
        artists: item.artists.map(artist => artist.name).join(", "),
        artistsData: item.artists.map(artist => ({ id: artist.id, name: artist.name })),
        duration: item.duration_ms,
        uri: item.uri,
        imageUrl: item.album.images[0]?.url,
        albumId: item.album.id,
        albumName: item.album.name,
        isCurrentTrack: currentTrack?.id === item.id,
        isPlaying: currentTrack?.id === item.id && isPlaying,
        isManuallyAdded: manuallyAddedTracks.has(item.uri),
        // Fix type error by converting Promise<boolean> to Promise<void>
        onPlay: async (uri: string) => { await playTrackWithContext(uri); },
        onArtistClick: (artistId: string) => navigate(`/artists/${artistId}`),
        onAlbumClick: (albumId: string) => navigate(`/albums/${albumId}`),
      }));

      setQueueTracks(trackItems);
    } catch (error) {
      console.error("Error fetching queue tracks:", error);
    }
  }, [navigate]);

  // Fetch top playlists
  const fetchTopPlaylists = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const data = await getUserPlaylists(6, 0);
      if (data?.items && isMounted.current) {
        setTopPlaylists(data.items);
      }
    } catch (error) {
      console.error("Error fetching top playlists:", error);
    }
  }, []);

  // Fetch new releases
  const fetchNewReleases = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const result = await getNewReleases(8, 0);
      
      if (!isMounted.current) return;
      
      // Fix error accessing albums property
      if (result && result.items) {
        setNewReleases(result.items);
      } else if (result?.items) {
        // Fallback structure
        setNewReleases(result.items);
      } else {
        console.error("Unexpected response format from getNewReleases");
      }
    } catch (error) {
      console.error("Error fetching new releases:", error);
    }
  }, []);

  // Fetch top artists
  const fetchTopArtists = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const response = await fetch("https://api.spotify.com/v1/me/top/artists?limit=6", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("spotify_access_token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch top artists");
      
      const data = await response.json();
      if (isMounted.current) {
        setTopArtists(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching top artists:", error);
      fetchFallbackArtists();
    }
  }, []);

  // Extract fallback artist fetching to a separate function for clarity
  const fetchFallbackArtists = async () => {
    if (!isMounted.current) return;
    
    try {
      const response = await fetch("https://api.spotify.com/v1/browse/featured-playlists?limit=1", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("spotify_access_token")}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch featured playlists");
      
      const data = await response.json();
      if (!data.playlists?.items?.[0] || !isMounted.current) return;
      
      // Get artists from the first featured playlist
      const playlistId = data.playlists.items[0].id;
      const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("spotify_access_token")}`,
        },
      });
      
      if (!playlistResponse.ok) throw new Error("Failed to fetch playlist details");
      
      const playlistData = await playlistResponse.json();
      const uniqueArtists = new Set();
      const artists: SpotifyArtistDetails[] = [];
      
      for (const item of playlistData.tracks.items || []) {
        if (artists.length >= 6) break;
        
        for (const artist of item.track?.artists || []) {
          if (!uniqueArtists.has(artist.id) && artists.length < 6) {
            uniqueArtists.add(artist.id);
            try {
              const artistDetails = await getArtistDetails(artist.id);
              if (artistDetails && isMounted.current) {
                artists.push(artistDetails);
              }
            } catch (e) {
              console.error("Error fetching artist details:", e);
            }
          }
        }
      }
      
      if (isMounted.current) {
        setTopArtists(artists);
      }
    } catch (error) {
      console.error("Error with fallback artist fetch:", error);
    }
  };

  // Initial data loading - only run once
  useEffect(() => {
    isMounted.current = true;
    
    // Only load data once
    if (initialLoadCompleted.current) return;
    
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load data sequentially to avoid overwhelming API
        await fetchTopPlaylists();
        await fetchNewReleases();
        await fetchTopArtists();
        await fetchQueueTracks();
        
        initialLoadCompleted.current = true;
      } catch (error) {
        console.error("Error loading home page data:", error);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted.current = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Set up player store subscriptions
  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state) => {
      const { currentTrack, isPlaying, manuallyAddedTracks } = state;
      if (isMounted.current && initialLoadCompleted.current) {
        fetchQueueTracks();
      }
      return {
        trackId: currentTrack?.id,
        isPlaying,
        manuallyAddedTracksSize: manuallyAddedTracks.size,
      };
    });
    
    return () => unsubscribe();
  }, [fetchQueueTracks]);

  // Play handlers
  const handlePlaylistPlay = async (uri: string) => {
    const playlistId = uri.split(":").pop();
    if (playlistId) {
      await playPlaylist(`spotify:playlist:${playlistId}`);
    }
  };

  const handleAlbumPlay = async (uri: string) => {
    const albumId = uri.split(":").pop();
    if (albumId) {
      await playAlbum(`spotify:album:${albumId}`);
    }
  };

  const handleArtistPlay = async (uri: string) => {
    const artistId = uri.split(":").pop();
    if (artistId) {
      navigate(`/artists/${artistId}`);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Welcome Back</h1>
        <div className="animate-pulse">
          <div className="h-8 bg-muted/40 rounded-md w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/40 rounded-md"></div>
            ))}
          </div>
          <div className="h-8 bg-muted/40 rounded-md w-48 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted/40 rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render sections
  const renderSection = (title: string, icon: JSX.Element, path: string, children: React.ReactNode) => (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <Button 
          variant="link" 
          onClick={() => navigate(path)}
          className="font-medium"
        >
          View All
        </Button>
      </div>
      {children}
    </section>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Welcome Back</h1>

      {/* Current Queue */}
      {renderSection("Current Queue", <Clock className="h-5 w-5" />, "/queue", (
        <Card className="p-4 bg-background/60">
          {queueTracks.length > 0 ? (
            <TrackList 
              tracks={queueTracks.slice(0, 5)} 
              showHeader={true}
            />
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Music className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Your queue is empty</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4" 
                onClick={() => navigate("/search")}
              >
                Find something to play
              </Button>
            </div>
          )}
        </Card>
      ))}

      {/* New Releases */}
      {newReleases.length > 0 && renderSection("New Releases", <Disc className="h-5 w-5" />, "/new-releases", (
        <MediaGrid>
          {newReleases.map((album) => (
            <MediaCard
              key={album.id}
              id={album.id}
              name={album.name}
              images={album.images}
              uri={album.uri}
              secondaryInfo={album.artists[0]?.name}
              onClick={() => navigate(`/albums/${album.id}`)}
              onPlay={handleAlbumPlay}
              isPlaying={false}
            />
          ))}
        </MediaGrid>
      ))}

      {/* Your Playlists */}
      {topPlaylists.length > 0 && renderSection("Your Playlists", <ListMusic className="h-5 w-5" />, "/playlists", (
        <MediaGrid>
          {topPlaylists.map((playlist) => (
            <MediaCard
              key={playlist.id}
              id={playlist.id}
              name={playlist.name}
              images={playlist.images}
              uri={playlist.uri}
              secondaryInfo={`${playlist.tracks.total} tracks`}
              onClick={() => navigate(`/playlists/${playlist.id}`)}
              onPlay={handlePlaylistPlay}
              isPlaying={false}
            />
          ))}
        </MediaGrid>
      ))}

      {/* Top Artists */}
      {topArtists.length > 0 && renderSection("Your Top Artists", <Users className="h-5 w-5" />, "/artists", (
        <MediaGrid>
          {topArtists.map((artist) => (
            <MediaCard
              key={artist.id}
              id={artist.id}
              name={artist.name}
              images={artist.images}
              uri={artist.uri}
              secondaryInfo={artist.genres?.slice(0, 2).join(", ")}
              onClick={() => navigate(`/artists/${artist.id}`)}
              onPlay={handleArtistPlay}
              useCircularImage={true}
              placeholderIcon={<Users className="h-8 w-8 text-muted-foreground" />}
            />
          ))}
        </MediaGrid>
      ))}
    </div>
  );
}
