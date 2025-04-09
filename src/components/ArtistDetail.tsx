import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "@/App";
import { MediaDetail } from "./MediaDetail";
import { AlbumDetail } from "./AlbumDetail";
import { MediaCard } from "./MediaCard";
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
import { PersonStanding, Music } from "lucide-react";

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
  const albumsSectionRef = useRef<HTMLDivElement>(null);
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
          setTopTracks(tracks.tracks.slice(0, 10)); // Show top 10 tracks
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
          setCurrentlyPlayingAlbumId(null);
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
          setCurrentlyPlayingTrackId(null);
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Failed to play album:", error);
    }
  }, []);

  // Handle artist playback
  const handlePlayArtist = useCallback(async () => {
    if (topTracks.length > 0) {
      await handlePlayTrack(topTracks[0].uri);
    }
  }, [topTracks, handlePlayTrack]);

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
      images:
        artistDetails.images && artistDetails.images.length > 0
          ? artistDetails.images
          : [{ url: "" }],
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
      onPlay: handlePlayArtist,
      onBack: () => navigate("/artists"),
      isPlaying: isPlaying && !currentlyPlayingAlbumId,
    };
  }, [
    artistDetails,
    isPlaying,
    currentlyPlayingAlbumId,
    handlePlayArtist,
    navigate,
  ]);

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
    <div className="h-full flex flex-col overflow-hidden">
      {loading ? (
        <MediaDetail
          title="Artist"
          loading={true}
          error={null}
          headerProps={undefined}
          tracks={[]}
          onBack={() => navigate("/artists")}
        />
      ) : error || !artistDetails ? (
        <MediaDetail
          title="Artist"
          loading={false}
          error={error || "Could not load artist details"}
          headerProps={undefined}
          tracks={[]}
          onBack={() => navigate("/artists")}
        />
      ) : (
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar scrollbar-thumb-accent scrollbar-track-base-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
            {/* Artist details and top tracks */}
            <MediaDetail
              title={artistDetails.name}
              loading={false}
              error={null}
              headerProps={headerProps}
              tracks={mediaDetailTracks}
              onBack={() => navigate("/artists")}
              noScrollContainer={true}
            />

            {/* Albums section */}
            <div ref={albumsSectionRef} className="px-6 pb-6 mt-8">
              <h2 className="text-xl font-bold mb-4">Albums</h2>
              {albums.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {albums.map((album) => (
                    <MediaCard
                      key={album.id}
                      id={album.id}
                      name={album.name}
                      images={album.images || []}
                      uri={album.uri}
                      onClick={setSelectedAlbumId}
                      onPlay={handlePlayAlbum}
                      isPlaying={
                        isPlaying && album.id === currentlyPlayingAlbumId
                      }
                      type="album"
                      additionalInfo={
                        <>
                          {album.release_date?.substring(0, 4)} •{" "}
                          {album.name.toLowerCase().includes("single")
                            ? "Single"
                            : "Album"}
                        </>
                      }
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <Music className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No albums found</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
