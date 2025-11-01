import React from "react";

interface ErrorBoundaryState { hasError: boolean; error?: Error; componentStack?: string; }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full space-y-4 text-center">
            <h1 className="text-2xl font-semibold text-primary">Ошибка загрузки страницы</h1>
            <p className="text-muted-foreground">Что-то пошло не так при отображении этой страницы. Попробуйте перезагрузить или вернуться на главную.</p>
            {this.state.error && (
              <pre className="text-left text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                {this.state.error.message}
                {this.state.componentStack ? `\n${this.state.componentStack}` : ''}
              </pre>
            )}
            <a href="/" className="underline text-primary">На главную</a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
