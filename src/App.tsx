import { useState, useEffect, memo } from "react";
import "@/App.css";
import { SpotifyLogin } from "@/components/SpotifyLogin";
import { getAccessToken } from "@/utils/spotify";
import { ThemeProvider } from "./components/theme-provider";
import { Layout } from "./components/layout/Layout";
import { UserPlaylists } from "./components/UserPlaylists";
import { NewReleases } from "./components/NewReleases";
import { listen } from "@tauri-apps/api/event";

// Navigation function to update URL without page reload
export function useNavigate() {
  return (path: string) => {
    window.history.pushState({}, "", path);
    // Dispatch an event that we can listen to
    window.dispatchEvent(new Event("popstate"));
  };
}

// Main content component that will re-render independently
const MainContent = memo(({ currentView }: { currentView: string }) => {
  switch (currentView) {
    case "playlists":
      return <UserPlaylists />;
    case "new-releases":
      return <NewReleases />;
    default:
      return <div className="p-4">Content for {currentView} will go here</div>;
  }
});

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
      setCurrentView(view);
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
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <div className="animate-pulse text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SpotifyLogin />;
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Layout onLogout={handleLogout} navigate={navigate}>
        <MainContent currentView={currentView} />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
