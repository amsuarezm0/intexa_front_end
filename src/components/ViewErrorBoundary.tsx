import { Component,type ReactNode } from 'react';
import { ErrorState } from './ErrorState';

interface Props {
  children: ReactNode;
  /** Change this to clear the error — views pass the current path, so
   *  navigating elsewhere recovers without a reload. */
  resetKey: string;
}

interface State {
  error: Error | null;
  resetKey: string;
}

/** True for the "couldn't fetch a lazy chunk" failure, which is what a user
 *  hits when a deploy replaces the files their tab was still pointing at. */
function isChunkLoadError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
    .test(`${error.message}`);
}

/**
 * Catches render failures in the routed view — including a view's chunk failing
 * to arrive — so a stale tab shows a way forward instead of a blank page. The
 * chrome around it stays mounted, so the user can also just navigate elsewhere.
 */
export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // A missing chunk is only fixable by picking up the new build.
    return isChunkLoadError(error) ? (
      <ErrorState
        message="La aplicación se actualizó mientras esta pestaña estaba abierta. Recarga para continuar."
        onRetry={() => window.location.reload()}
      />
    ) : (
      <ErrorState message={error.message || 'Ocurrió un error inesperado en esta sección.'} />
    );
  }
}
