import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error; // Store the error object
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined, // Initialize error state
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }; // Store the error
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Oops! Something went wrong.</AlertTitle>
            <AlertDescription>
              <p className="mb-2">We encountered an error while rendering this part of the application.</p>
              {this.state.error && (
                <pre className="mt-2 mb-4 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                  \n\n                  {/* Optionally display stack trace, be careful in production */}
                  {/* {this.state.error.stack} */}
                </pre>
              )}
              <Button onClick={() => window.location.reload()} size="sm">
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
