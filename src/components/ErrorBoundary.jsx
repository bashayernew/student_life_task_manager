import React from "react";
import Icon from "./AppIcon";
import Button from "./ui/Button";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    error.__ErrorBoundary = true;
    window.__COMPONENT_ERROR__?.(error, errorInfo);
  }

  render() {
    if (this.state?.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md ktech-card">
            <div className="flex justify-center items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Icon name="AlertTriangle" size={24} className="text-warning" />
              </div>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <h1 className="text-2xl font-medium text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground text-base mx-auto">
                We encountered an unexpected error while processing your request.
              </p>
            </div>
            <div className="flex justify-center items-center mt-6">
              <Button
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                <Icon name="ArrowLeft" size={18} />
                Back
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props?.children;
  }
}

export default ErrorBoundary;
