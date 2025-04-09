import { useState } from "react";
import { Button } from "@/components/ui/button";
import { loginToSpotify } from "@/utils/spotify";

export function SpotifyLogin() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = () => {
    setIsLoggingIn(true);
    loginToSpotify();
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <h2 className="text-xl font-semibold">Statisfy Player</h2>
      <p className="text-sm text-muted-foreground text-center">
        Connect your Spotify account to listen to music
      </p>
      <Button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="bg-green-500 hover:bg-green-600 mt-2"
      >
        {isLoggingIn ? "Connecting..." : "Connect to Spotify"}
      </Button>
    </div>
  );
}
