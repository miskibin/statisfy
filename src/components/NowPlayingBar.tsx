import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  initializePlayer,
  getDeviceId,
  WebPlaybackPlayer,
  WebPlaybackState,
  ensureActiveDevice,
  playOnThisDevice,
} from "@/utils/spotify";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

interface TrackInfo {
  name: string;
  artists: string;
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

  // Initialize Spotify Player SDK
  useEffect(() => {
    let mounted = true;
    console.log("NowPlayingBar: Initializing Spotify Web Playback SDK");

    const setupPlayer = async () => {
      try {
        // If we've already tried 3 times, show an error
        if (initializationAttempts.current >= 3) {
          console.error("Maximum initialization attempts reached");
          if (mounted)
            setError(
              "Failed to initialize Spotify player after multiple attempts"
            );
          return;
        }

        initializationAttempts.current++;
        console.log(
          `NowPlayingBar: Initialization attempt ${initializationAttempts.current}`
        );

        const player = await initializePlayer("Statisfy Web Player");

        if (!mounted) return;

        if (player && getDeviceId()) {
          console.log("NowPlayingBar: Player initialized successfully");
          playerRef.current = player;

          // Setup state listener
          player.addListener("player_state_changed", (state) => {
            if (!mounted) return;
            console.log("NowPlayingBar: Player state changed", state);
            updatePlayerState(state);
          });

          // Get initial state
          try {
            const initialState = await player.getCurrentState();
            console.log("Initial player state:", initialState);

            if (initialState) {
              updatePlayerState(initialState);
            } else {
              console.log("No initial state, will try to activate device");
              // Try to activate the device if we don't have a state
              await ensureActiveDevice();

              // Check state again after activation
              setTimeout(async () => {
                if (!mounted) return;
                const stateAfterActivation = await player.getCurrentState();
                if (stateAfterActivation) {
                  updatePlayerState(stateAfterActivation);
                }
              }, 2000);
            }

            setError(null);
          } catch (err) {
            console.error("Error getting initial state:", err);
          }

          // Set initial volume
          try {
            const initialVolume = await player.getVolume();
            if (mounted) setVolume(Math.round(initialVolume * 100));
          } catch (err) {
            console.error("Error getting volume:", err);
          }
        } else {
          console.error("NowPlayingBar: Failed to initialize player");

          // Retry after a delay
          setTimeout(() => {
            if (mounted) setupPlayer();
          }, 2000);
        }
      } catch (err) {
        console.error("NowPlayingBar: Error initializing player:", err);

        // Retry after a delay
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

      // Clean up player listeners
      if (playerRef.current) {
        console.log("NowPlayingBar: Cleaning up player listeners");
        playerRef.current.removeListener("player_state_changed");
      }

      // Clean up progress timer
      if (progressUpdateRef.current) {
        window.clearInterval(progressUpdateRef.current);
      }
    };
  }, []);

  // Update player state from SDK state object
  const updatePlayerState = (state: WebPlaybackState | null) => {
    if (!state) {
      console.log("NowPlayingBar: Received null player state");
      return;
    }

    try {
      console.log("NowPlayingBar: Updating from player state", state);
      const { track_window, paused, position, duration } = state;
      const { current_track } = track_window;

      if (!current_track) {
        console.log("No current track in player state");
        return;
      }

      const newTrackInfo: TrackInfo = {
        name: current_track.name,
        artists: current_track.artists.map((a) => a.name).join(", "),
        albumArt: current_track.album.images[0]?.url || "",
        isPlaying: !paused,
        duration: duration,
        progress: position,
        deviceVolume: volume, // Keep current volume as SDK doesn't provide it in state
      };

      setTrackInfo(newTrackInfo);
      setError(null);

      // Setup progress update timer if playing
      updateProgressTimer(!paused, position, duration);
    } catch (err) {
      console.error("NowPlayingBar: Error processing player state:", err);
    }
  };

  // Setup a timer to update progress if track is playing
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
      console.log("NowPlayingBar: Setting up progress timer");
      let currentPosition = initialPosition;
      const startTime = Date.now();

      progressUpdateRef.current = window.setInterval(() => {
        // Calculate elapsed time and update position
        const elapsed = Date.now() - startTime;
        currentPosition = Math.min(initialPosition + elapsed, duration);

        setTrackInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            progress: currentPosition,
          };
        });

        // Stop timer if we reached the end
        if (currentPosition >= duration) {
          window.clearInterval(progressUpdateRef.current!);
          progressUpdateRef.current = null;
        }
      }, 1000);
    }
  };

  const handlePlayPause = async () => {
    if (!trackInfo || !playerRef.current) return;

    try {
      console.log("NowPlayingBar: Toggling playback", {
        isPlaying: trackInfo.isPlaying,
      });

      // Ensure this device is active before trying to play/pause
      const deviceId = getDeviceId();
      if (!deviceId) {
        console.error("No device ID available for playback");
        setError("No Spotify device available");
        return;
      }

      // Ensure our device is the active one
      if (!trackInfo.isPlaying) {
        const activated = await ensureActiveDevice();
        console.log("Device activation result:", activated);
        if (!activated) {
          setError("Couldn't activate Spotify device");
          return;
        }
      }

      // Toggle playback
      if (trackInfo.isPlaying) {
        await playerRef.current.pause();
      } else {
        await playerRef.current.resume();
      }

      // Update UI immediately for responsiveness
      setTrackInfo({
        ...trackInfo,
        isPlaying: !trackInfo.isPlaying,
      });

      // Update progress timer
      updateProgressTimer(
        !trackInfo.isPlaying,
        trackInfo.progress,
        trackInfo.duration
      );
    } catch (err) {
      console.error("NowPlayingBar: Error toggling playback:", err);
      setError("Playback error occurred");
    }
  };

  const handleNext = async () => {
    if (!playerRef.current) return;

    try {
      console.log("NowPlayingBar: Skipping to next track");

      // Ensure this device is active before trying to change tracks
      const deviceId = getDeviceId();
      if (!deviceId) {
        console.error("No device ID available for next track");
        return;
      }

      const activated = await ensureActiveDevice();
      if (!activated) return;

      await playerRef.current.nextTrack();
    } catch (err) {
      console.error("NowPlayingBar: Error skipping to next track:", err);
    }
  };

  const handlePrevious = async () => {
    if (!playerRef.current) return;

    try {
      console.log("NowPlayingBar: Skipping to previous track");

      // Ensure this device is active before trying to change tracks
      const deviceId = getDeviceId();
      if (!deviceId) {
        console.error("No device ID available for previous track");
        return;
      }

      const activated = await ensureActiveDevice();
      if (!activated) return;

      await playerRef.current.previousTrack();
    } catch (err) {
      console.error("NowPlayingBar: Error skipping to previous track:", err);
    }
  };

  const handleVolumeChange = async (value: number[]) => {
    if (!playerRef.current) return;

    const newVolume = value[0];
    console.log("NowPlayingBar: Setting volume to", newVolume);
    setVolume(newVolume);

    try {
      await playerRef.current.setVolume(newVolume / 100);
    } catch (err) {
      console.error("NowPlayingBar: Error setting volume:", err);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="h-20 border-t flex items-center justify-center">
        <div className="animate-pulse h-3 w-24 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (error) {
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
      <div className="flex items-center gap-2 ml-auto w-24"></div>
      <Volume2 className="h-3 w-3 text-muted-foreground" />
      <Slider
        value={[volume]}
        max={100}
        step={5}
        className="flex-1"
        onValueChange={handleVolumeChange}
      />
    </div>
  );
}
