// Types for Spotify API and SDK
// Extend window interface for Spotify SDK
declare global {
  interface Window {
    Spotify: {
      Player: any;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

// Spotify API types
export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyTrackItem {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
  };
}

export interface SpotifyPlaylistTrack {
  added_at: string;
  track: SpotifyTrackItem;
}

export interface SpotifyAlbumTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  track_number: number;
}

export interface SpotifyEpisodeItem {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  images: SpotifyImage[];
  show: {
    id: string;
    name: string;
  };
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice;
  repeat_state: string;
  shuffle_state: boolean;
  is_playing: boolean;
  item: SpotifyTrackItem | SpotifyEpisodeItem;
  progress_ms: number;
  timestamp: number;
  context: {
    uri: string;
    type: string;
  } | null;
}

export interface SpotifySavedTrack {
  added_at: string;
  track: SpotifyTrackItem;
}

export interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description: string;
  images: { url: string; height: number; width: number }[];
  uri: string;
  tracks: {
    total: number;
  };
}

export interface SpotifyPlaylistDetails {
  owner: any;
  followers: any;
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  uri: string;
  tracks: SpotifyPagingObject<SpotifyPlaylistTrack>;
}

export interface SpotifyPagingObject<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylistItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; height: number; width: number }[];
  release_date: string;
  uri: string;
}

export interface SpotifyAlbumDetails extends SpotifyAlbum {
  total_tracks: number;
  tracks: {
    items: SpotifyAlbumTrack[];
    total: number;
  };
  label: string;
  release_date_precision: string;
  copyrights?: Array<{ text: string; type: string }>;
  genres?: string[];
  popularity?: number;
}

export interface SpotifyNewReleasesResponse {
  albums: SpotifyPagingObject<SpotifyAlbum>;
}

// Web Playback SDK types
export interface WebPlaybackError {
  message: string;
}

export interface WebPlaybackReady {
  device_id: string;
}

export interface WebPlaybackPlayer {
  device_id: string;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<WebPlaybackState | null>;
  setName: (name: string) => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (position_ms: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  addListener: (event: string, callback: (state: any) => void) => void;
  removeListener: (event: string, callback?: (state: any) => void) => void;
}

export interface WebPlaybackTrack {
  uri: string;
  id: string;
  type: string;
  media_type: string;
  name: string;
  is_playable: boolean;
  album: {
    uri: string;
    name: string;
    images: { url: string }[];
  };
  artists: { uri: string; name: string }[];
}

export interface WebPlaybackState {
  context: {
    uri: string;
    metadata: any;
  };
  disallows: {
    pausing: boolean;
    peeking_next: boolean;
    peeking_prev: boolean;
    resuming: boolean;
    seeking: boolean;
    skipping_next: boolean;
    skipping_prev: boolean;
  };
  track_window: {
    current_track: WebPlaybackTrack;
    previous_tracks: WebPlaybackTrack[];
    next_tracks: WebPlaybackTrack[];
  };
  paused: boolean;
  position: number;
  duration: number;
  repeat_mode: number;
  shuffle: boolean;
  timestamp: number;
}

// Cache interface
export interface CacheItem {
  data: any;
  expiry: number;
}
