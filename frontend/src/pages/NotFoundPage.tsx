import { Link } from "react-router-dom";

/** There was no catch-all route, so an unknown URL rendered a blank page. */
const NotFoundPage = () => (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 text-center font-lexend">
        <h1 className="text-5xl text-content">404</h1>
        <p className="text-lg text-content-secondary">
            We couldn&apos;t find that page.
        </p>
        <Link to="/" className="button-primary">
            Return home
        </Link>
    </div>
);

export default NotFoundPage;
