import { Component } from 'react';
import './ErrorBoundary.css';

const CHUNK_ERROR_KEY = 'chunk_reload_attempted';

function isChunkError(error) {
  const msg = error?.message ?? '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    error?.name === 'ChunkLoadError'
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Auto-reload once when a lazy chunk fails to load (stale deployment)
    if (isChunkError(error)) {
      const alreadyTried = sessionStorage.getItem(CHUNK_ERROR_KEY);
      if (!alreadyTried) {
        sessionStorage.setItem(CHUNK_ERROR_KEY, '1');
        window.location.reload();
        return { hasError: false, error: null };
      }
    }
    return { hasError: true, error };
  }

  componentDidUpdate() {
    // Clear the reload flag once the app renders successfully
    if (!this.state.hasError) {
      sessionStorage.removeItem(CHUNK_ERROR_KEY);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2 className="error-boundary__title">Une erreur est survenue</h2>
          <p className="error-boundary__detail">{this.state.error?.message}</p>
          <button
            className="error-boundary__btn"
            onClick={() => {
              sessionStorage.removeItem(CHUNK_ERROR_KEY);
              this.setState({ hasError: false, error: null });
            }}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
