import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  initializePlayer,
  getDeviceId,
  ensureActiveDevice,
} from "@/utils/spotify";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { WebPlaybackPlayer, WebPlaybackState } from "@/utils/spotify.types";
import { useNavigate } from "@/App";

interface TrackInfo {
  name: string;
  artists: { name: string; id: string }[];
  albumArt: string;
  isPlaying: boolean;
  duration: number;
  progress: number;
  deviceVolume: number;
}

export function NowPlayingBar() {
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [volume, setVolume] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<WebPlaybackPlayer | null>(null);
  const progressUpdateRef = useRef<number | null>(null);
  const initializationAttempts = useRef(0);
  const navigate = useNavigate();

  // Initialize Spotify Player SDK
  useEffect(() => {
    let mounted = true;

    const updateProgressTimer = (
      isPlaying: boolean,
      initialPosition: number,
      duration: number
    ) => {
      if (progressUpdateRef.current) {
        window.clearInterval(progressUpdateRef.current);
        progressUpdateRef.current = null;
      }

      if (isPlaying) {
        let currentPosition = initialPosition;
        const startTime = Date.now();

        progressUpdateRef.current = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          currentPosition = Math.min(initialPosition + elapsed, duration);

          setTrackInfo((prev) =>
            prev ? { ...prev, progress: currentPosition } : null
          );

          if (currentPosition >= duration) {
            window.clearInterval(progressUpdateRef.current!);
            progressUpdateRef.current = null;
          }
        }, 1000);
      }
    };

    const updatePlayerState = (state: WebPlaybackState | null) => {
      if (!state) return;

      try {
        const { track_window, paused, position, duration } = state;
        const { current_track } = track_window;

        if (!current_track) return;

        const artists = current_track.artists.map((a) => ({
          name: a.name,
          id: a.uri.split(":")[2], // Extract ID from URI (spotify:artist:id)
        }));

        const newTrackInfo = {
          name: current_track.name,
          artists,
          albumArt: current_track.album.images[0]?.url || "",
          isPlaying: !paused,
          duration,
          progress: position,
          deviceVolume: volume,
        };

        setTrackInfo(newTrackInfo);
        setError(null);
        updateProgressTimer(!paused, position, duration);
      } catch (err) {
        console.error("Error processing player state:", err);
      }
    };

    const setupPlayer = async () => {
      try {
        if (initializationAttempts.current >= 3) {
          if (mounted)
            setError(
              "Failed to initialize Spotify player after multiple attempts"
            );
          return;
        }

        initializationAttempts.current++;
        const player = await initializePlayer("Statisfy Web Player");

        if (!mounted) return;

        if (player && getDeviceId()) {
          playerRef.current = player;

          player.addListener("player_state_changed", (state) => {
            if (mounted) updatePlayerState(state);
          });

          try {
            const initialState = await player.getCurrentState();

            if (initialState) {
              updatePlayerState(initialState);
            } else {
              await ensureActiveDevice();

              setTimeout(async () => {
                if (mounted) {
                  const stateAfterActivation = await player.getCurrentState();
                  if (stateAfterActivation)
                    updatePlayerState(stateAfterActivation);
                }
              }, 2000);
            }

            const initialVolume = await player.getVolume();
            if (mounted) setVolume(Math.round(initialVolume * 100));

            setError(null);
          } catch (err) {
            console.error("Error initializing player state:", err);
          }
        } else {
          setTimeout(() => {
            if (mounted) setupPlayer();
          }, 2000);
        }
      } catch (err) {
        console.error("Error initializing player:", err);
        setTimeout(() => {
          if (mounted) setupPlayer();
        }, 2000);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setupPlayer();

    return () => {
      mounted = false;
      if (playerRef.current)
        playerRef.current.removeListener("player_state_changed");
      if (progressUpdateRef.current)
        window.clearInterval(progressUpdateRef.current);
    };
  }, [volume]);

  const ensureDeviceAndExecute = async (action: () => Promise<void>) => {
    if (!playerRef.current) return;

    try {
      if (!getDeviceId()) {
        setError("No Spotify device available");
        return;
      }

      const activated = await ensureActiveDevice();
      if (!activated) {
        setError("Couldn't activate Spotify device");
        return;
      }

      await action();
    } catch (err) {
      console.error("Player control error:", err);
      setError("Playback error occurred");
    }
  };

  const handlePlayPause = async () => {
    if (!trackInfo || !playerRef.current) return;

    await ensureDeviceAndExecute(async () => {
      if (trackInfo.isPlaying) {
        await playerRef.current!.pause();
      } else {
        await playerRef.current!.resume();
      }

      // Update UI immediately for responsiveness
      setTrackInfo({
        ...trackInfo,
        isPlaying: !trackInfo.isPlaying,
      });
    });
  };

  const handleNext = () =>
    ensureDeviceAndExecute(() => playerRef.current!.nextTrack());

  const handlePrevious = () =>
    ensureDeviceAndExecute(() => playerRef.current!.previousTrack());

  const handleVolumeChange = async (value: number[]) => {
    if (!playerRef.current) return;
    const newVolume = value[0];
    setVolume(newVolume);
    try {
      await playerRef.current.setVolume(newVolume / 100);
    } catch (err) {
      console.error("Error setting volume:", err);
    }
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
