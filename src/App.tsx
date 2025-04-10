import { useState, useEffect, memo } from "react";
import "@/App.css";
import { SpotifyLogin } from "@/components/SpotifyLogin";
import { getAccessToken, clearPlaybackContext } from "@/utils/spotify";
import { ThemeProvider } from "./components/theme-provider";
import { Layout } from "./components/layout/Layout";
import { UserPlaylists } from "./components/UserPlaylists";
import { NewReleases } from "./components/NewReleases";
import { Artists } from "./components/Artists"; // Import Artists component
import { ArtistDetail } from "./components/ArtistDetail"; // Import ArtistDetail component
import { AlbumDetail } from "./components/AlbumDetail"; // Import AlbumDetail component
import { Queue } from "./components/Queue"; // Import Queue component
import { listen } from "@tauri-apps/api/event";
import { Header } from "./components/layout/Header";

// Navigation function to update URL without page reload
export function useNavigate() {
  return (path: string) => {
    window.history.pushState({}, "", path);
    // Dispatch an event that we can listen to
    window.dispatchEvent(new Event("popstate"));
  };
}

// Main content component that will re-render independently
const MainContent = memo(
  ({
    currentView,
    params,
  }: {
    currentView: string;
    params: Record<string, string>;
  }) => {
    if (currentView.startsWith("artists/")) {
      const artistId = params.id || currentView.split("/")[1];
      return <ArtistDetail artistId={artistId} />;
    }

    if (currentView.startsWith("albums/")) {
      const albumId = params.id || currentView.split("/")[1];
      return (
        <AlbumDetail albumId={albumId} onBack={() => window.history.back()} />
      );
    }

    switch (currentView) {
      case "playlists":
        return <UserPlaylists />;
      case "new-releases":
        return <NewReleases />;
      case "artists":
        return <Artists />;
      case "queue": // Add case for queue route
        return <Queue />;
      default:
        return (
          <div className="p-4">Content for {currentView} will go here</div>
        );
    }
  }
);

// Add this useEffect in your main component to load the font
function useLoadFont() {
  useEffect(() => {
    // Add Google Fonts link dynamically
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState("");
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Load Nunito font
  useLoadFont();

  // Listen for deep link events
  useEffect(() => {
    const unlisten = listen("deep-link", (event) => {
      console.log("Deep link event received:", event);
      const url = event.payload as string;

      if (url.includes("statisfy://callback")) {
        // Extract the code from the URL
        const codeMatch = url.match(/code=([^&]*)/);
        if (codeMatch && codeMatch[1]) {
          const code = codeMatch[1];
          handleAuthCode(code);
        }
      }
    });

    return () => {
      unlisten.then((unlistenFn) => unlistenFn());
    };
  }, []);

  // Sync currentView with URL path
  useEffect(() => {
    const syncViewWithPath = () => {
      const path = window.location.pathname;
      const view = path.substring(1) || "playlists"; // Default to playlists if on root path

      // Extract route parameters
      const params: Record<string, string> = {};

      // Check if the path contains artist ID
      if (path.startsWith("/artists/")) {
        const artistId = path.split("/")[2];
        if (artistId) {
          params.id = artistId;
        }
      }

      // Check if the path contains album ID
      if (path.startsWith("/albums/")) {
        const albumId = path.split("/")[2];
        if (albumId) {
          params.id = albumId;
        }
      }

      setCurrentView(view);
      setRouteParams(params);
    };

    // Initial sync
    syncViewWithPath();

    // Listen for navigation changes
    window.addEventListener("popstate", syncViewWithPath);
    return () => window.removeEventListener("popstate", syncViewWithPath);
  }, []);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem("spotify_access_token");
    const expiry = localStorage.getItem("spotify_token_expiry");

    if (token && expiry && parseInt(expiry) > Date.now()) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // Parse the URL to check for auth code
    const parseAuthCode = () => {
      // Check for standard URL params (for dev mode)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      // Check for custom scheme (for production)
      if (!code && window.location.href.includes("statisfy://callback")) {
        // Extract code from the custom scheme URL
        const urlParts = window.location.href.split("?");
        if (urlParts.length > 1) {
          const customParams = new URLSearchParams(urlParts[1]);
          return customParams.get("code");
        }
      }

      return code;
    };

    const code = parseAuthCode();

    if (code) {
      handleAuthCode(code);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Extract auth code handling to a separate function
  const handleAuthCode = async (code: string) => {
    const token = await getAccessToken(code);
    if (token) {
      setIsAuthenticated(true);
      // Clean the URL to remove the code
      window.history.replaceState({}, document.title, "/");
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_refresh_token");
    localStorage.removeItem("spotify_token_expiry");
    clearPlaybackContext();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <div className="flex flex-col h-screen w-full font-sans">
          <Header onLogout={undefined} />
          <div className="flex items-center justify-center flex-1">
            <div className="animate-pulse text-sm">Loading...</div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <div className="flex flex-col h-screen w-full font-sans">
          <Header onLogout={undefined} />
          <div className="flex-1">
            <SpotifyLogin />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Layout onLogout={handleLogout} navigate={navigate}>
        <MainContent currentView={currentView} params={routeParams} />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
