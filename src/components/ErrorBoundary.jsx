import React from "react";
import Icon from "./Appicon";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    error.__ErrorBoundary = true;
    window.__COMPONENT_ERROR__?.(error, errorInfo);
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state?.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="text-center p-6 sm:p-8 max-w-md bg-white rounded-3xl border-2 border-slate-200 shadow-xl">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <Icon name="AlertTriangle" size={28} />
            </div>
            <div className="flex flex-col gap-1.5 text-center mb-6">
              <h1 className="text-xl font-bold text-slate-900">Session Restored</h1>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">
                We encountered an unexpected interface reload. Click below to return to the Live Dashboard.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-left text-[11px] text-red-800 font-mono overflow-auto max-h-32">
                  <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/main-dashboard";
                }}
                className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs sm:text-sm"
              >
                <Icon name="RefreshCw" size={16} color="#fff" />
                Reload Live Map
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/login";
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Icon name="LogIn" size={16} />
                Login Screen
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props?.children;
  }
}

export default ErrorBoundary;