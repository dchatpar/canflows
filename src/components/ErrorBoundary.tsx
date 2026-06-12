import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-background p-8">
            <div className="max-w-md text-center">
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="mb-6 text-muted-foreground">
                An unexpected error occurred. Try refreshing the page.
              </p>
              <pre className="mb-6 max-h-32 overflow-auto rounded bg-muted p-3 text-left text-xs text-muted-foreground">
                {this.state.error?.message}
              </pre>
              <button
                onClick={() => window.location.reload()}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Reload page
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
