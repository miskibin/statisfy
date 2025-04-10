import { useState, useEffect } from "react";
import { useNavigate } from "@/App";
import { spotifyApi } from "@/utils/apiClient";
import { SpotifyArtistDetails } from "@/utils/spotify.types";
import { MediaGrid } from "./MediaGrid";
import { playTrackWithContext } from "@/utils/spotify";

export function Artists() {
  const [topArtists, setTopArtists] = useState<SpotifyArtistDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );
  const navigate = useNavigate();

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user's top artists
      const response = await spotifyApi.get<{
        items: SpotifyArtistDetails[];
      }>("/me/top/artists?time_range=medium_term&limit=18");

      if (response && response.items) {
        setTopArtists(response.items);
      } else {
        throw new Error("Failed to load artists");
      }
    } catch (error) {
      console.error("Error fetching artists:", error);
      setError("Failed to load artists. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleArtistSelect = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  const handlePlay = async (uri: string) => {
    try {
      // Extract the artist ID from URI
      const artistId = uri.split(":")[2];

      // Get top tracks for the artist and play them
      const topTracks = await spotifyApi.get<{ tracks: any[] }>(
        `/artists/${artistId}/top-tracks?market=from_token`
      );

      if (topTracks && topTracks.tracks && topTracks.tracks.length > 0) {
        // Get the track URIs
        const trackUris = topTracks.tracks.map((track) => track.uri);

        // Play the first track
        const success = await playTrackWithContext(trackUris[0]);

        if (success) {
          setCurrentlyPlayingId(artistId);
        }
      }
    } catch (error) {
      console.error("Error playing artist:", error);
    }
  };

  return (
    <MediaGrid
      title="Your Top Artists"
      items={topArtists.map((artist) => ({
        ...artist,
        uri: `spotify:artist:${artist.id}`, // Create URI for artist
      }))}
      loading={loading}
      error={error}
      onRetry={fetchArtists}
      onSelect={handleArtistSelect}
      onPlay={handlePlay}
      type="artist"
      currentlyPlayingId={currentlyPlayingId}
      useCircularImages={true}
    />
  );
}
