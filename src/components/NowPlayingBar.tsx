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
  isTrackLiked,
  addTrackToLikedSongs,
  removeTrackFromLikedSongs,
} from "@/utils/spotify";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Loader2,
  Heart,
} from "lucide-react";
import { useNavigate } from "@/App";
import { usePlayerStore } from "@/stores/playerStore";
import { toggleShuffleMode } from "@/utils/queue";

export function NowPlayingBar() {
  const [previousVolume, setPreviousVolume] = useState(50);
  const [isPlayerInitializing, setIsPlayerInitializing] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const navigate = useNavigate();

  // Get all needed state from playerStore
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isShuffleEnabled,
    isQueueReady,
    setVolume: updateStoreVolume,
    syncWithSpotifyState,
  } = usePlayerStore();  // Initialize player once when component mounts - with faster initialization
  useEffect(() => {
    const initPlayer = async () => {
      setIsPlayerInitializing(true);
      
      // Start player initialization but don't wait for it to complete
      const playerPromise = initializePlayer();
      
      // After a short timeout, stop showing the initializing state
      // This makes the UI feel more responsive while initialization continues in background
      const timeoutId = setTimeout(() => {
        setIsPlayerInitializing(false);
      }, 1000);
      
      try {
        // Continue initialization in the background
        await playerPromise;
        const trackInfo = await getCurrentTrackInfo();

        if (trackInfo) {
          syncWithSpotifyState({
            isPlaying: trackInfo.isPlaying,
            progress: trackInfo.progress,
            duration: trackInfo.duration,
            volume: trackInfo.deviceVolume || volume,
          });
        }
      } catch (error) {
        console.error("Failed to initialize player:", error);
      } finally {
        clearTimeout(timeoutId);
        setIsPlayerInitializing(false);
      }
    };

    initPlayer();
  }, []);
  
  // Check if current track is liked whenever it changes
  useEffect(() => {
    const checkTrackLiked = async () => {
      if (!currentTrack?.id) {
        setIsLiked(false);
        return;
      }
      
      setIsLikeLoading(true);
      try {
        const liked = await isTrackLiked(currentTrack.id);
        setIsLiked(liked);
      } catch (error) {
        console.error("Error checking if track is liked:", error);
      } finally {
        setIsLikeLoading(false);
      }
    };
    
    checkTrackLiked();
  }, [currentTrack?.id]);

  // Derived state
  const hasTrack = currentTrack !== null;
  const queueReady = isQueueReady();
  const loading = isPlayerInitializing || (!hasTrack && !queueReady);
  const error = !loading && !hasTrack ? "No track playing" : null;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const VolumeIcon = volume === 0 ? VolumeX : Volume2;

  // Playback control handlers
  const handlePlayPause = () =>
    hasTrack && (isPlaying ? pausePlayback() : resumePlayback());

  // Toggle shuffle mode
  const handleToggleShuffle = () => {
    toggleShuffleMode();
  };

  // Handle next/previous track
  const handleNextTrack = async () => {
    try {
      await playNextInQueue();
    } catch (error) {
      console.error("Failed to play next track:", error);
    }
  };

  const handlePreviousTrack = async () => {
    try {
      await playPreviousInQueue();
    } catch (error) {
      console.error("Failed to play previous track:", error);
    }
  };
  // Volume control
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    updateStoreVolume(newVolume);
    setVolume(newVolume);
    if (newVolume > 0) setPreviousVolume(newVolume);
  };

  const handleVolumeButtonClick = () => {
    const newVolume =
      volume === 0 ? (previousVolume > 0 ? previousVolume : 50) : 0;

    if (volume > 0) setPreviousVolume(volume);
    updateStoreVolume(newVolume);
    setVolume(newVolume);
  };
  
  // Handle like/unlike track
  const handleToggleLike = async () => {
    if (!currentTrack?.id) return;
    
    setIsLikeLoading(true);
    try {
      let success;
      if (isLiked) {
        success = await removeTrackFromLikedSongs(currentTrack.id);
        if (success) setIsLiked(false);
      } else {
        success = await addTrackToLikedSongs(currentTrack.id);
        if (success) setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling track liked status:", error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  // Seek handling
  const handleSeek = (value: number[]) => {
    if (!hasTrack || !duration) return;

    const seekPositionMs = Math.floor((value[0] / 100) * duration);
    usePlayerStore.getState().setProgress(seekPositionMs);
    seekToPosition(seekPositionMs);
  };

  // Format time for display
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Loading or empty state
  if (loading || error) {
    return (
      <div className="h-20 border-t flex items-center justify-center bg-background">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">
              {isPlayerInitializing ? "Initializing player..." : "Loading..."}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {error || "No track playing"}
          </span>
        )}
      </div>
    );
  }

  // Extract display information
  const albumArt = currentTrack?.album?.images?.[0]?.url;
  const trackName = currentTrack?.name || "Unknown Track";
  const artists = currentTrack?.artists || [];

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
                  onClick={() => navigate(`/artists/${artist.id}`)}
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
        <div className="flex items-center gap-2 ">
          {/* Shuffle button */}
          <Button
            size="icon"
            onClick={handleToggleShuffle}
            variant={isShuffleEnabled ? "default" : "ghost"}
            className={`h-8 w-8 ${isShuffleEnabled ? "bg-primary" : ""}`}
            title={isShuffleEnabled ? "Disable shuffle" : "Enable shuffle"}
          >
            <Shuffle className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousTrack}
            className="h-8 w-8"
            disabled={!queueReady}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            onClick={handlePlayPause}
            variant="default"
            size="icon"
            className="rounded-full h-9 w-9"
            disabled={!hasTrack}
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
            onClick={handleNextTrack}
            className="h-8 w-8"
            disabled={!queueReady}
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

      {/* Volume */}      <div className="flex items-center gap-2 w-1/3 justify-end">
        {/* Like/unlike button */}
        {currentTrack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-2"
            onClick={handleToggleLike}
            disabled={isLikeLoading || !currentTrack?.id}
            title={isLiked ? "Remove from Liked Songs" : "Add to Liked Songs"}
          >
            {isLikeLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isLiked ? (
              <Heart className="h-4 w-4 text-primary fill-primary" />
            ) : (
              <Heart className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
        
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
