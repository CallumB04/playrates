import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

/**
 * There was no boundary anywhere, so any render error white-screened the
 * whole app with nothing in the UI to explain it.
 *
 * Still a class component: React has no hook equivalent for this.
 */
class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error("Unhandled render error", error, info.componentStack);
    }

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        return (
            <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4 text-center font-lexend">
                <i
                    className="fas fa-triangle-exclamation text-4xl text-danger"
                    aria-hidden="true"
                ></i>
                <h1 className="text-2xl text-content">Something went wrong</h1>
                <p className="max-w-prose text-content-secondary">
                    An unexpected error stopped the page from rendering. Try
                    reloading — if it keeps happening, the details are in the
                    browser console.
                </p>
                <button
                    className="button-primary"
                    onClick={() => window.location.reload()}
                >
                    Reload page
                </button>
            </div>
        );
    }
}

export default ErrorBoundary;
