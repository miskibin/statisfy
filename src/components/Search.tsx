import { useState, useEffect } from "react";
import {
  searchSpotify,
  playTrackWithContext,
  playPlaylist,
  playAlbum,
  getArtistTopTracks,
} from "@/utils/spotify";
import { SpotifySearchResponse } from "@/utils/spotify.types";
import { Loader2, ArrowLeft } from "lucide-react";
import { MediaCard } from "./MediaCard";
import { Button } from "./ui/button";
import { useNavigate } from "@/App";
import { TrackList } from "./TrackList";
import { PlaylistDetail } from "./PlaylistDetail";
import { AlbumDetail } from "./AlbumDetail";
import { ArtistDetail } from "./ArtistDetail";

interface SearchProps {
  query: string;
}

const Search = ({ query }: SearchProps) => {
  const [results, setResults] = useState<SpotifySearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [currentlyPlayingUri, setCurrentlyPlayingUri] = useState<string | null>(
    null
  );
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );
  const [selectedDetail, setSelectedDetail] = useState<{
    type: "artist" | "album" | "playlist";
    id: string;
  } | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults(null);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await searchSpotify(
          query,
          ["album", "artist", "track", "playlist"],
          20
        );
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handlePlayTrack = async (uri: string) => {
    try {
      const success = await playTrackWithContext(uri);
      if (success) {
        setCurrentlyPlayingUri(uri);
        // Set the ID based on URI for highlighting
        const trackId = uri.split(":")[2];
        setCurrentlyPlayingId(trackId);
      }
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };

  const handlePlayAlbum = async (uri: string) => {
    try {
      const success = await playAlbum(uri);
      if (success) {
        // Find the album ID from the URI
        const albumId = uri.split(":").pop() || null;
        setCurrentlyPlayingId(albumId);
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  const handlePlayPlaylist = async (uri: string) => {
    try {
      const success = await playPlaylist(uri);
      if (success) {
        // Find the playlist ID from the URI
        const playlistId = uri.split(":").pop() || null;
        setCurrentlyPlayingId(playlistId);
      }
    } catch (error) {
      console.error("Error playing playlist:", error);
    }
  };

  const handlePlayArtist = async (uri: string) => {
    try {
      // Extract the artist ID from URI
      const artistId = uri.split(":")[2];

      // Use the imported function to get top tracks instead of direct API access
      const topTracks = await getArtistTopTracks(artistId);

      if (topTracks && topTracks.tracks && topTracks.tracks.length > 0) {
        // Play the first track
        const success = await playTrackWithContext(topTracks.tracks[0].uri);
        if (success) {
          setCurrentlyPlayingId(artistId);
        }
      }
    } catch (error) {
      console.error("Error playing artist:", error);
    }
  };

  const handleArtistClick = (artistId: string) => {
    setSelectedDetail({ type: "artist", id: artistId });
  };

  const handleAlbumClick = (albumId: string) => {
    setSelectedDetail({ type: "album", id: albumId });
  };

  const handlePlaylistClick = (playlistId: string) => {
    setSelectedDetail({ type: "playlist", id: playlistId });
  };

  const handleBackFromDetail = () => {
    setSelectedDetail(null);
  };

  const handleBackToResults = () => {
    navigate(-1);
  };

  // Show detail views when an item is selected
  if (selectedDetail) {
    if (selectedDetail.type === "artist") {
      return (
        <ArtistDetail
          artistId={selectedDetail.id}
          onBack={handleBackFromDetail}
        />
      );
    } else if (selectedDetail.type === "album") {
      return (
        <AlbumDetail
          albumId={selectedDetail.id}
          onBack={handleBackFromDetail}
        />
      );
    } else if (selectedDetail.type === "playlist") {
      return (
        <PlaylistDetail
          playlistId={selectedDetail.id}
          onBack={handleBackFromDetail}
          isPlaying={selectedDetail.id === currentlyPlayingId}
          onPlay={(uri: string) => handlePlayPlaylist(uri)}
        />
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-14rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!results || !query.trim()) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Search for music, artists, albums, or playlists
      </div>
    );
  }

  const hasResults =
    (results.tracks?.items?.length || 0) > 0 ||
    (results.albums?.items?.length || 0) > 0 ||
    (results.artists?.items?.length || 0) > 0 ||
    (results.playlists?.items?.length || 0) > 0;

  if (!hasResults) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No results found for "{query}"
      </div>
    );
  }

  // Filter out any null/undefined items
  const tracks =
    results.tracks?.items?.filter(
      (track) => track !== null && track !== undefined
    ) || [];
  const albums =
    results.albums?.items?.filter(
      (album) => album !== null && album !== undefined
    ) || [];
  const artists =
    results.artists?.items?.filter(
      (artist) => artist !== null && artist !== undefined
    ) || [];
  const playlists =
    results.playlists?.items?.filter(
      (playlist) => playlist !== null && playlist !== undefined
    ) || [];

  return (
    <div className="h-full ">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToResults}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Search results for "{query}"</h1>
        </div>

        {/* Tracks section using TrackList */}
        {tracks.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">Tracks</h2>
            <TrackList
              tracks={tracks.slice(0, 5).map((track, index) => ({
                id: track.id,
                index: index + 1,
                name: track.name,
                artists: track.artists.map((a) => a.name).join(", "),
                artistsData: track.artists.map((a) => ({
                  id: a.id,
                  name: a.name,
                })),
                duration: track.duration_ms,
                uri: track.uri,
                imageUrl: track.album.images[0]?.url,
                onPlay: handlePlayTrack,
                isPlaying: currentlyPlayingUri === track.uri,
                isCurrentTrack: currentlyPlayingUri === track.uri,
                onArtistClick: handleArtistClick,
                albumId: track.album.id,
                albumName: track.album.name,
                onAlbumClick: handleAlbumClick,
              }))}
              actionButtons={
                tracks.length > 5 && (
                  <Button
                    variant="link"
                    className="p-0 mt-2"
                    onClick={() => navigate(`/search/tracks/${query}`)}
                  >
                    See all tracks
                  </Button>
                )
              }
            />
          </div>
        )}

        {/* Albums section using MediaCard */}
        {albums.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
              {albums.slice(0, 7).map((album) => (
                <MediaCard
                  key={album.id}
                  id={album.id}
                  name={album.name}
                  secondaryInfo={album.artists.map((a) => a.name).join(", ")}
                  images={album.images}
                  uri={album.uri}
                  onClick={() => handleAlbumClick(album.id)}
                  onPlay={(uri) => handlePlayAlbum(uri)}
                  isPlaying={currentlyPlayingId === album.id}
                />
              ))}
            </div>
            {albums.length > 7 && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate(`/search/albums/${query}`)}
              >
                See all albums
              </Button>
            )}
          </div>
        )}

        {/* Artists section using MediaCard with circular images */}
        {artists.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">Artists</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-6">
              {artists.slice(0, 7).map((artist) => (
                <MediaCard
                  key={artist.id}
                  id={artist.id}
                  name={artist.name}
                  secondaryInfo="Artist"
                  images={artist.images}
                  uri={`spotify:artist:${artist.id}`}
                  onClick={() => handleArtistClick(artist.id)}
                  onPlay={(uri) => handlePlayArtist(uri)}
                  isPlaying={currentlyPlayingId === artist.id}
                  useCircularImage={true}
                />
              ))}
            </div>
            {artists.length > 7 && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate(`/search/artists/${query}`)}
              >
                See all artists
              </Button>
            )}
          </div>
        )}

        {/* Playlists section using MediaCard */}
        {playlists.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Playlists</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
              {playlists.slice(0, 7).map((playlist) => (
                <MediaCard
                  key={playlist.id}
                  id={playlist.id}
                  name={playlist.name}
                  secondaryInfo={
                    playlist.description || `${playlist.tracks.total} tracks`
                  }
                  images={playlist.images}
                  uri={playlist.uri}
                  onClick={() => handlePlaylistClick(playlist.id)}
                  onPlay={(uri) => handlePlayPlaylist(uri)}
                  isPlaying={currentlyPlayingId === playlist.id}
                />
              ))}
            </div>
            {playlists.length > 7 && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate(`/search/playlists/${query}`)}
              >
                See all playlists
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
