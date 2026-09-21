import Button from "../ui/Button";
import { TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

/** A class component because React has no hook equivalent for error catching. */
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
            <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4 text-center font-display">
                <TriangleAlert size={40} className="text-danger" aria-hidden />
                <h1 className="text-2xl text-content">Something went wrong</h1>
                <p className="max-w-prose text-content-secondary">
                    An unexpected error stopped the page from rendering. Try
                    reloading. If it keeps happening, the details are in the
                    browser console.
                </p>
                <Button onClick={() => window.location.reload()}>
                    Reload page
                </Button>
            </div>
        );
    }
}

export default ErrorBoundary;
