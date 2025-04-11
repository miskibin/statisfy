import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  pausePlayback,
  resumePlayback,
  setVolume,
  playNextInQueue,
  playPreviousInQueue,
  seekToPosition,
  getCurrentTrackInfo,
  initializePlayer,
} from "@/utils/spotify";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNavigate } from "@/App";
import { usePlayerStore } from "@/stores/playerStore";

export function NowPlayingBar() {
  const [previousVolume, setPreviousVolume] = useState(50);
  const navigate = useNavigate();

  // Get state from our Zustand store
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    setVolume: updateStoreVolume,
    syncWithSpotifyState,
  } = usePlayerStore();

  // Initialize player and load current track info when component mounts
  useEffect(() => {
    const initPlayer = async () => {
      // Initialize the player
      await initializePlayer();
      
      // Get current track info if available
      const trackInfo = await getCurrentTrackInfo();
      
      if (trackInfo) {
        // Update store with current track info
        syncWithSpotifyState({
          isPlaying: trackInfo.isPlaying,
          progress: trackInfo.progress,
          duration: trackInfo.duration,
          volume: trackInfo.deviceVolume || volume,
        });
      }
    };
    
    initPlayer();
  }, []);

  const hasTrack = currentTrack !== null;
  const loading = !hasTrack && duration === 0;
  const error = !hasTrack && !loading ? "No track playing" : null;

  // Handlers for playback control
  const handlePlayPause = async () => {
    if (!hasTrack) return;
    await (isPlaying ? pausePlayback() : resumePlayback());
  };

  // Volume control functions
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    updateStoreVolume(newVolume);
    setVolume(newVolume);

    if (newVolume > 0) setPreviousVolume(newVolume);
  };

  // Toggle mute on volume icon click
  const handleVolumeButtonClick = () => {
    const newVolume =
      volume === 0 ? (previousVolume > 0 ? previousVolume : 50) : 0;

    if (volume > 0) setPreviousVolume(volume);
    updateStoreVolume(newVolume);
    setVolume(newVolume);
  };

  // Seek control
  const handleSeek = (value: number[]) => {
    if (!hasTrack || !duration) return;

    const seekPositionMs = Math.floor((value[0] / 100) * duration);
    usePlayerStore.getState().setProgress(seekPositionMs);
    seekToPosition(seekPositionMs);
  };

  // Navigation and track controls
  const navigateToArtist = (artistId: string) =>
    navigate(`/artists/${artistId}`);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading || error) {
    return (
      <div className="h-20 border-t flex items-center justify-center">
        {loading ? (
          <div className="animate-pulse h-3 w-24 bg-gray-300 rounded"></div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {error || "No track playing"}
          </span>
        )}
      </div>
    );
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const albumArt = currentTrack?.album?.images?.[0]?.url;
  const trackName = currentTrack?.name || "Unknown Track";
  const artists = currentTrack?.artists || [];
  const VolumeIcon = volume === 0 ? VolumeX : Volume2;

  return (
    <div className="h-20 border-t px-4 py-2 bg-background flex items-center gap-4">
      {/* Track info */}
      <div className="flex gap-3 w-1/3">
        {albumArt && (
          <div className="flex-shrink-0 w-14 h-14 rounded overflow-hidden">
            <img
              src={albumArt}
              alt={`${trackName} album art`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-medium text-sm truncate">{trackName}</h3>
          <p className="text-muted-foreground text-xs truncate">
            {artists.map((artist, index) => (
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
            onClick={playPreviousInQueue}
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
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={playNextInQueue}
            className="h-8 w-8"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center w-full gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(progress)}
          </span>
          <Slider
            value={[progressPercent]}
            max={100}
            className="flex-1"
            onValueChange={handleSeek}
          />
          <span className="text-xs text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume - fixed layout issue */}
      <div className="flex items-center gap-2 w-1/3 justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0"
          onClick={handleVolumeButtonClick}
        >
          <VolumeIcon className="h-3 w-3 text-muted-foreground" />
        </Button>
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
