import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Replaced the constructor with a class field initializer for state.
  // This is the modern and correct way to initialize state in a React class component,
  // resolving the compilation errors about 'state' and 'props' not being found on the type.
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4">
          <div className="bg-bg-secondary p-8 rounded-lg shadow-lg text-center max-w-lg border-t-4 border-error">
            <h1 className="text-3xl font-bold text-error mb-4">Oops! Something Went Wrong</h1>
            <p className="text-text-secondary mb-6">
              An unexpected error occurred. Please try refreshing the page. If the problem persists,
              please check the console for more details.
            </p>
            <details className="bg-bg-tertiary p-4 rounded text-left text-sm text-red-300 mb-6">
              <summary className="cursor-pointer font-bold mb-2">Error Details</summary>
              <pre className="whitespace-pre-wrap break-all mt-2">
                <code>{this.state.error?.toString()}</code>
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
