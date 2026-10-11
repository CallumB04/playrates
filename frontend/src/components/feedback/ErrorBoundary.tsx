import Button from "../ui/Button";
import { TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { siteHasNewerBuild } from "../../lib/buildVersion";

/* Once a minute at most: if the new build breaks too, the page has to stop
   reloading and show the error. */
const RELOADED_AT = "playrates:reloaded-for-new-build";
const RELOAD_COOLDOWN_MS = 60_000;

const reloadedRecently = (): boolean => {
    try {
        const at = Number(sessionStorage.getItem(RELOADED_AT));
        return Date.now() - at < RELOAD_COOLDOWN_MS;
    } catch {
        return true;
    }
};

const markReloaded = (): void => {
    try {
        sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    } catch {
        // Without storage the cooldown cannot hold, so reloadedRecently says yes.
    }
};

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
    /** The crash came from running an old build; the new one is loading. */
    updating: boolean;
}

/** A class component because React has no hook equivalent for error catching. */
class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null, updating: false };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error("Unhandled render error", error, info.componentStack);
        /* Most often an open tab still running code from before a deploy,
           reading a response the API has since changed. The new build is the
           fix, so load it rather than leave them on an error. */
        void siteHasNewerBuild().then((newer) => {
            if (!newer || reloadedRecently()) return;
            markReloaded();
            this.setState({ updating: true });
            window.location.reload();
        });
    }

    render() {
        const { error, updating } = this.state;
        if (!error) return this.props.children;

        if (updating) {
            return (
                <div className="flex min-h-[60vh] w-full items-center justify-center px-4 text-center text-content-secondary">
                    PlayRates has been updated. Loading the new version…
                </div>
            );
        }

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
