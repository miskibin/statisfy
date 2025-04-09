import { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlaylists } from "@/components/UserPlaylists";
import {
  getCurrentPlayback,
  togglePlayback,
  skipToNext,
  skipToPrevious,
  setVolume as setSpotifyVolume,
} from "@/utils/spotify";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  ListMusic,
  Radio,
} from "lucide-react";
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

// Memoized player controls component
const PlayerControls = memo(
  ({
    isPlaying,
    onPlayPause,
    onPrevious,
    onNext,
    volume,
    onVolumeChange,
  }: {
    isPlaying: boolean;
    onPlayPause: () => void;
    onPrevious: () => void;
    onNext: () => void;
    volume: number;
    onVolumeChange: (value: number[]) => void;
  }) => (
    <div className="flex justify-between items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          className="h-8 w-8"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          onClick={onPlayPause}
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
          onClick={onNext}
          className="h-8 w-8"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 w-24">
        <Volume2 className="h-3 w-3 text-muted-foreground" />
        <Slider
          value={[volume]}
          max={100}
          step={5}
          className="flex-1"
          onValueChange={onVolumeChange}
        />
      </div>
    </div>
  )
);

// Memoized track display component
const TrackDisplay = memo(({ trackInfo }: { trackInfo: TrackInfo }) => {
  const progress = (trackInfo.progress / trackInfo.duration) * 100;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex gap-3">
      {trackInfo.albumArt && (
        <div className="flex-shrink-0 w-20 h-20 rounded overflow-hidden">
          <img
            src={trackInfo.albumArt}
            alt={`${trackInfo.name} album art`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-base truncate">{trackInfo.name}</h3>
        <p className="text-muted-foreground text-sm truncate">
          {trackInfo.artists}
        </p>

        <div className="mt-1.5">
          <Slider
            value={[progress]}
            max={100}
            className="cursor-default"
            disabled
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(trackInfo.progress)}</span>
            <span>{formatTime(trackInfo.duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// No playback component
const NoPlayback = memo(() => (
  <Card className="p-4 text-center">
    <p className="text-sm text-muted-foreground mb-4">
      No active playback found. Start playing on Spotify or try a featured
      track.
    </p>
    <Tabs defaultValue="playlists" className="w-full">
      <TabsList className="w-full mb-4">
        <TabsTrigger value="playlists" className="flex-1">
          My Playlists
        </TabsTrigger>
      </TabsList>
      <TabsContent value="playlists">
        <UserPlaylists />
      </TabsContent>
    </Tabs>
  </Card>
));

export function SpotifyPlayer() {
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [volume, setVolume] = useState(50);
  const [activeTab, setActiveTab] = useState("now-playing");

  const fetchPlaybackInfo = async () => {
    const playbackData =
      (await getCurrentPlayback()) as SpotifyPlaybackState | null;

    if (playbackData && playbackData.item) {
      let trackData: TrackInfo;

      if (isTrack(playbackData.item)) {
        // Handle track
        trackData = {
          name: playbackData.item.name,
          artists: playbackData.item.artists.map((a) => a.name).join(", "),
          albumArt: playbackData.item.album.images[0]?.url || "",
          isPlaying: playbackData.is_playing,
          duration: playbackData.item.duration_ms,
          progress: playbackData.progress_ms || 0,
          deviceVolume: playbackData.device?.volume_percent || 50,
        };
      } else {
        // Handle episode
        trackData = {
          name: playbackData.item.name,
          artists: playbackData.item.show?.name || "",
          albumArt: playbackData.item.images?.[0]?.url || "",
          isPlaying: playbackData.is_playing,
          duration: playbackData.item.duration_ms,
          progress: playbackData.progress_ms || 0,
          deviceVolume: playbackData.device?.volume_percent || 50,
        };
      }

      setTrackInfo(trackData);
      setVolume(playbackData.device?.volume_percent || 50);
      setLoading(false);
    } else {
      setTrackInfo(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaybackInfo();
    const intervalId = setInterval(fetchPlaybackInfo, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handlePlayPause = async () => {
    if (!trackInfo) return;

    const success = await togglePlayback(trackInfo.isPlaying);
    if (success) {
      setTrackInfo({
        ...trackInfo,
        isPlaying: !trackInfo.isPlaying,
      });
    }
  };

  const handleNext = async () => {
    const success = await skipToNext();
    if (success) {
      setTimeout(fetchPlaybackInfo, 300);
    }
  };

  const handlePrevious = async () => {
    const success = await skipToPrevious();
    if (success) {
      setTimeout(fetchPlaybackInfo, 300);
    }
  };

  const handleVolumeChange = async (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    await setSpotifyVolume(newVolume);
  };

  if (loading && !trackInfo) {
    return (
      <div className="flex items-center justify-center h-16">
        <div className="animate-pulse h-3 w-24 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!trackInfo) {
    return <NoPlayback />;
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="now-playing" className="flex items-center gap-1">
            <Radio className="h-3.5 w-3.5" /> Now Playing
          </TabsTrigger>
          <TabsTrigger value="playlists" className="flex items-center gap-1">
            <ListMusic className="h-3.5 w-3.5" /> My Playlists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="now-playing" className="space-y-4">
          <TrackDisplay trackInfo={trackInfo} />
          <PlayerControls
            isPlaying={trackInfo.isPlaying}
            onPlayPause={handlePlayPause}
            onPrevious={handlePrevious}
            onNext={handleNext}
            volume={volume}
            onVolumeChange={handleVolumeChange}
          />
        </TabsContent>

        <TabsContent value="playlists">
          <UserPlaylists />
        </TabsContent>
      </Tabs>
    </div>
  );
}
