import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  getCurrentPlayback,
  togglePlayback,
  skipToNext,
  skipToPrevious,
  setVolume as setSpotifyVolume,
} from "@/utils/spotify";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import {
  SpotifyPlaybackState,
  SpotifyTrackItem,
  SpotifyEpisodeItem,
} from "@/utils/apiClient";

interface TrackInfo {
  name: string;
  artists: string;
  albumArt: string;
  isPlaying: boolean;
  duration: number;
  progress: number;
  deviceVolume: number;
}

// Type guard to determine if item is a Track
function isTrack(
  item: SpotifyTrackItem | SpotifyEpisodeItem
): item is SpotifyTrackItem {
  return item !== null && "album" in item;
}

export function NowPlayingBar() {
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [volume, setVolume] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const pollingRef = useRef<number | null>(null);

  const fetchPlaybackInfo = async () => {
    try {
      const playbackData =
        (await getCurrentPlayback()) as SpotifyPlaybackState | null;

      if (playbackData && playbackData.item) {
        // Extract data based on whether it's a track or an episode
        let newTrackInfo: TrackInfo;

        if (isTrack(playbackData.item)) {
          // Handle Track
          newTrackInfo = {
            name: playbackData.item.name,
            artists: playbackData.item.artists.map((a) => a.name).join(", "),
            albumArt: playbackData.item.album.images[0]?.url || "",
            isPlaying: playbackData.is_playing,
            duration: playbackData.item.duration_ms,
            progress: playbackData.progress_ms || 0,
            deviceVolume: playbackData.device?.volume_percent || 50,
          };
        } else {
          // Handle Episode or other item types
          newTrackInfo = {
            name: playbackData.item.name,
            artists: playbackData.item.show?.name || "",
            albumArt: playbackData.item.images?.[0]?.url || "",
            isPlaying: playbackData.is_playing,
            duration: playbackData.item.duration_ms,
            progress: playbackData.progress_ms || 0,
            deviceVolume: playbackData.device?.volume_percent || 50,
          };
        }

        setTrackInfo(newTrackInfo);
        setVolume(playbackData.device?.volume_percent || 50);
        setError(null);
        setConsecutiveErrors(0);

        // Update polling frequency based on playback state
        updatePollingInterval(playbackData.is_playing ? 3000 : 10000);
      } else if (trackInfo) {
        // If we had a track before but now don't, keep displaying it but mark as not playing
        setTrackInfo({
          ...trackInfo,
          isPlaying: false,
        });
      } else {
        setTrackInfo(null);
      }
    } catch (err) {
      console.error("Error fetching playback:", err);
      setConsecutiveErrors((prev) => prev + 1);

      // Only show error after multiple consecutive failures
      if (consecutiveErrors > 2) {
        setError("Unable to connect to Spotify");
      }

      // Back off polling frequency after errors
      updatePollingInterval(Math.min(15000, 3000 * consecutiveErrors));
    } finally {
      setLoading(false);
    }
  };

  // Update polling interval with smart backoff
  const updatePollingInterval = (interval: number) => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
    }

    pollingRef.current = window.setInterval(fetchPlaybackInfo, interval);
  };

  useEffect(() => {
    fetchPlaybackInfo();
    pollingRef.current = window.setInterval(fetchPlaybackInfo, 3000);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (!trackInfo) return;

    try {
      const success = await togglePlayback(trackInfo.isPlaying);
      if (success) {
        setTrackInfo({
          ...trackInfo,
          isPlaying: !trackInfo.isPlaying,
        });
      }
    } catch (err) {
      console.error("Error toggling playback:", err);
    }
  };

  const handleNext = async () => {
    try {
      const success = await skipToNext();
      if (success) {
        setTimeout(fetchPlaybackInfo, 300);
      }
    } catch (err) {
      console.error("Error skipping to next track:", err);
    }
  };

  const handlePrevious = async () => {
    try {
      const success = await skipToPrevious();
      if (success) {
        setTimeout(fetchPlaybackInfo, 300);
      }
    } catch (err) {
      console.error("Error skipping to previous track:", err);
    }
  };

  const handleVolumeChange = async (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    try {
      await setSpotifyVolume(newVolume);
    } catch (err) {
      console.error("Error setting volume:", err);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading && !trackInfo) {
    return (
      <div className="h-20 border-t flex items-center justify-center">
        <div className="animate-pulse h-3 w-24 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (error && !trackInfo) {
    return (
      <div className="h-20 border-t flex items-center justify-center">
        <span className="text-sm text-muted-foreground">{error}</span>
      </div>
    );
  }

  if (!trackInfo) {
    return (
      <div className="h-20 border-t flex items-center justify-center">
        <span className="text-sm text-muted-foreground">No track playing</span>
      </div>
    );
  }

  const progress = (trackInfo.progress / trackInfo.duration) * 100;

  return (
    <div className="h-20 border-t px-4 py-2 bg-background flex items-center gap-4">
      {/* Track info */}
      <div className="flex gap-3 w-1/3">
        {trackInfo.albumArt && (
          <div className="flex-shrink-0 w-14 h-14 rounded overflow-hidden">
            <img
              src={trackInfo.albumArt}
              alt={`${trackInfo.name} album art`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-medium text-sm truncate">{trackInfo.name}</h3>
          <p className="text-muted-foreground text-xs truncate">
            {trackInfo.artists}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-1/3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="h-8 w-8"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            onClick={handlePlayPause}
            variant="default"
            size="icon"
            className="rounded-full h-9 w-9"
          >
            {trackInfo.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center w-full gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(trackInfo.progress)}
          </span>
          <Slider
            value={[progress]}
            max={100}
            className="flex-1 cursor-default"
            disabled
          />
          <span className="text-xs text-muted-foreground">
            {formatTime(trackInfo.duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 ml-auto w-24">
        <Volume2 className="h-3 w-3 text-muted-foreground" />
        <Slider
          value={[volume]}
          max={100}
          step={5}
          className="flex-1"
          onValueChange={handleVolumeChange}
        />
      </div>
    </div>
  );
}
