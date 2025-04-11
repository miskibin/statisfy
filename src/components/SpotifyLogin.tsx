import { useState } from "react";
import { Button } from "@/components/ui/button";
import { loginToSpotify } from "@/utils/spotify";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Music, Loader2 } from "lucide-react";

export function SpotifyLogin() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = () => {
    setIsLoggingIn(true);
    loginToSpotify();
  };

  return (
    <div className="flex items-center justify-center h-[70vh]">
      <Card className="w-full max-w-md shadow-lg border-border/40">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Music className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            SpotiLite Player
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Connect your Spotify account to access your music library and
            control playback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-muted-foreground mb-4">
              You'll be redirected to Spotify to authorize this application
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-3/4 bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
            size="lg"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect to Spotify"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
