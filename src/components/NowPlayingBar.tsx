import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  getCurrentTrackInfo,
  pausePlayback,
  resumePlayback,
  skipToNext,
  skipToPrevious,
  setVolume,
  subscribeToPlayerState,
  unsubscribeFromPlayerState,
} from "@/utils/spotify";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useNavigate } from "@/App";

interface TrackInfo {
  name: string;
  artists: { name: string; id: string }[];
  albumArt: string;
  isPlaying: boolean;
  duration: number;
  progress: number;
}

export function NowPlayingBar() {
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [volume, setVolumeState] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initialize player and set up state subscribers
  useEffect(() => {
    let isMounted = true;

    const handlePlayerStateChange = (
      state: TrackInfo | null,
      playerError: string | null
    ) => {
      if (!isMounted) return;

      if (state) {
        setTrackInfo(state);
        setError(null);
      } else if (playerError) {
        setError(playerError);
      } else {
        setTrackInfo(null);
      }

      setLoading(false);
    };

    // Subscribe to player state changes
    subscribeToPlayerState(handlePlayerStateChange);

    // Get initial volume
    getCurrentTrackInfo().then((info) => {
      if (isMounted && info?.deviceVolume) {
        setVolumeState(info.deviceVolume);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeFromPlayerState(handlePlayerStateChange);
    };
  }, []);

  const handlePlayPause = async () => {
    if (!trackInfo) return;

    if (trackInfo.isPlaying) {
      await pausePlayback();
    } else {
      await resumePlayback();
    }

    // Optimistic UI update
    setTrackInfo({
      ...trackInfo,
      isPlaying: !trackInfo.isPlaying,
    });
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

  const navigateToArtist = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Simplified rendering logic
  if (loading || error || !trackInfo) {
    return (
      <div className="h-20 border-t flex items-center justify-center">
        {loading ? (
          <div className="animate-pulse h-3 w-24 bg-gray-300 rounded"></div>
        ) : error ? (
          <span className="text-sm text-muted-foreground">{error}</span>
        ) : (
          <span className="text-sm text-muted-foreground">
            No track playing
          </span>
        )}
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
            {trackInfo.artists.map((artist, index) => (
              <span key={artist.id}>
                {index > 0 && ", "}
                <span
                  className="hover:underline hover:text-primary cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToArtist(artist.id);
                  }}
                >
                  {artist.name}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-1/3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipToPrevious}
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
            onClick={skipToNext}
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
      <div className="flex items-center gap-2 w-1/3 justify-end">
        <Volume2 className="h-3 w-3 text-muted-foreground mr-1" />
        <Slider
          value={[volume]}
          max={100}
          step={5}
          className="w-24 md:w-32 lg:w-40"
          onValueChange={handleVolumeChange}
        />
      </div>
    </div>
  );
}
