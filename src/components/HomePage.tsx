import { useCallback, useEffect, useState } from "react";
import { Card } from "./ui/card";
import { MediaCard } from "./MediaCard";
import { MediaGrid } from "./MediaGrid";
import { TrackList, TrackItemProps } from "./TrackList";
import {
  getUserPlaylists,
  getNewReleases,
  getTracksByUris,
  playTrackWithContext,
  playPlaylist,
  playAlbum,
  getArtistDetails,
} from "@/utils/spotify";
import { useNavigate } from "@/App";
import { Music, Disc, Users, ListMusic } from "lucide-react";
import { Button } from "./ui/button";
import { usePlayerStore } from "@/stores/playerStore";
import {
  SpotifyTrackItem,
  SpotifyPlaylistItem,
  SpotifyAlbum,
  SpotifyArtistDetails,
  SpotifyPagingObject,
} from "@/utils/spotify.types";

interface RecentlyPlayedTrack {
  track: SpotifyTrackItem;
  played_at: string;
}

export function HomePage() {
  // State for storing data
  const [recentlyPlayed, setRecentlyPlayed] = useState<TrackItemProps[]>([]);
  const [topPlaylists, setTopPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [newReleases, setNewReleases] = useState<SpotifyAlbum[]>([]);
  const [topArtists, setTopArtists] = useState<SpotifyArtistDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);

  // Get the player state to determine what's playing
  const { currentTrack, isPlaying } = usePlayerStore();

  // Navigation function
  const navigate = useNavigate();

  // Fetch recently played tracks
  const fetchRecentlyPlayed = useCallback(async () => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("spotify_access_token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch recently played tracks");
      
      const data = await response.json();
      const recentTracks: RecentlyPlayedTrack[] = data.items || [];
      
      // Convert to our track format
      const trackItems: TrackItemProps[] = recentTracks.map((item, index) => ({
        id: item.track.id,
        index: index,
        name: item.track.name,
        artists: item.track.artists.map(artist => artist.name).join(", "),
        artistsData: item.track.artists.map(artist => ({ id: artist.id, name: artist.name })),
        duration: item.track.duration_ms,
        uri: item.track.uri,
        imageUrl: item.track.album.images[0]?.url,
        albumId: item.track.album.id,
        albumName: item.track.album.name,
        isCurrentTrack: currentTrack?.id === item.track.id,
        isPlaying: currentTrack?.id === item.track.id && isPlaying,
        onPlay: (uri: string) => playTrackWithContext(uri),
        onArtistClick: (artistId: string) => navigate(`/artists/${artistId}`),
        onAlbumClick: (albumId: string) => navigate(`/albums/${albumId}`),
      }));

      setRecentlyPlayed(trackItems);
    } catch (error) {
      console.error("Error fetching recently played:", error);
    }
  }, [currentTrack, isPlaying, navigate]);

  // Fetch top playlists (user's playlists)
  const fetchTopPlaylists = useCallback(async () => {
    try {
      const data = await getUserPlaylists(6, 0);
      if (data?.items) {
        setTopPlaylists(data.items);
      }
    } catch (error) {
      console.error("Error fetching top playlists:", error);
    }
  }, []);

  // Fetch new releases
  const fetchNewReleases = useCallback(async () => {
    try {
      const data = await getNewReleases(6, 0);
      if (data?.albums?.items) {
        setNewReleases(data.albums.items);
      }
    } catch (error) {
      console.error("Error fetching new releases:", error);
    }
  }, []);

  // Fetch top artists
  const fetchTopArtists = useCallback(async () => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/top/artists?limit=6", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("spotify_access_token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch top artists");
      
      const data = await response.json();
      setTopArtists(data.items || []);
    } catch (error) {
      console.error("Error fetching top artists:", error);
      
      // Fallback: If unable to get user's top artists, get some recommended ones
      try {
        const response = await fetch("https://api.spotify.com/v1/browse/featured-playlists?limit=1", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("spotify_access_token")}`,
          },
        });
        
        if (!response.ok) throw new Error("Failed to fetch featured playlists");
        
        const data = await response.json();
        if (data.playlists?.items?.[0]) {
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
              if (!uniqueArtists.has(artist.id)) {
                uniqueArtists.add(artist.id);
                try {
                  const artistDetails = await getArtistDetails(artist.id);
                  if (artistDetails) {
                    artists.push(artistDetails);
                    if (artists.length >= 6) break;
                  }
                } catch (e) {
                  console.error("Error fetching artist details:", e);
                }
              }
            }
          }
          
          setTopArtists(artists);
        }
      } catch (fallbackError) {
        console.error("Error with fallback artist fetch:", fallbackError);
      }
    }
  }, []);
  // Load all data on component mount
  useEffect(() => {
    // Only fetch data once when the component mounts
    if (dataFetched) return;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchRecentlyPlayed(),
          fetchTopPlaylists(),
          fetchNewReleases(), 
          fetchTopArtists()
        ]);
        setDataFetched(true);
      } catch (error) {
        console.error("Error loading home page data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dataFetched, fetchRecentlyPlayed, fetchNewReleases, fetchTopPlaylists, fetchTopArtists]);

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Welcome Back</h1>

      {/* Recently played tracks */}
      {recentlyPlayed.length > 0 && (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ListMusic className="h-5 w-5" />
              Recently Played
            </h2>
          </div>
          <Card className="p-4 bg-background/60">
            <TrackList 
              tracks={recentlyPlayed.slice(0, 5)} 
              showHeader={true}
              actionButtons={
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4" 
                  onClick={() => navigate("/queue")}
                >
                  View All
                </Button>
              }
            />
          </Card>
        </section>
      )}

      {/* Your Playlists */}
      {topPlaylists.length > 0 && (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ListMusic className="h-5 w-5" />
              Your Playlists
            </h2>
            <Button 
              variant="link" 
              onClick={() => navigate("/playlists")}
              className="font-medium"
            >
              View All
            </Button>
          </div>
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
        </section>
      )}

      {/* New Releases */}
      {newReleases.length > 0 && (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Disc className="h-5 w-5" />
              New Releases
            </h2>
            <Button 
              variant="link" 
              onClick={() => navigate("/new-releases")}
              className="font-medium"
            >
              View All
            </Button>
          </div>
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
        </section>
      )}

      {/* Top Artists */}
      {topArtists.length > 0 && (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Top Artists
            </h2>
            <Button 
              variant="link" 
              onClick={() => navigate("/artists")}
              className="font-medium"
            >
              View All
            </Button>
          </div>
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
        </section>
      )}
    </div>
  );
}
