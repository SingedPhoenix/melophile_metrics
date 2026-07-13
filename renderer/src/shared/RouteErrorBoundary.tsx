import { Component, type ErrorInfo, type ReactNode } from 'react';

type RouteErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type RouteErrorBoundaryState = {
  error: Error | null;
};

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route render failed', error, info.componentStack);
  }

  componentDidUpdate(previousProps: RouteErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section className="route-state-panel route-error-panel" aria-label="Section failed to load">
        <span className="status-label">needs attention</span>
        <strong>section paused</strong>
        <span className="status-detail data-status">
          {this.state.error.message || 'this listening view could not be prepared'}
        </span>
        <button className="secondary-action" type="button" onClick={() => this.setState({ error: null })}>
          try again
        </button>
      </section>
    );
  }
}

export default RouteErrorBoundary;
