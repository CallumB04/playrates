import { chipClass } from "../../../../components/ui/Chip";
import ActionsSpecimens from "./components/ActionsSpecimens";
import FormSpecimens from "./components/FormSpecimens";
import DataSpecimens from "./components/DataSpecimens";
import SurfaceSpecimens from "./components/SurfaceSpecimens";
import FeedbackSpecimens from "./components/FeedbackSpecimens";

/* Live demos, not screenshots, so this always matches the real components.
   No router in here — it renders inside the app's BrowserRouter. */
const GROUPS = [
    { title: "Actions", Component: ActionsSpecimens },
    { title: "Forms", Component: FormSpecimens },
    { title: "Data", Component: DataSpecimens },
    { title: "Surfaces", Component: SurfaceSpecimens },
    { title: "Feedback", Component: FeedbackSpecimens },
] as const;

const anchorFor = (title: string) => `components-${title.toLowerCase()}`;

const ComponentSection = () => (
    <div className="flex flex-col gap-10">
        {/* Five groups make a long page; this is the way round it. */}
        <nav aria-label="Component groups" className="flex flex-wrap gap-2">
            {GROUPS.map(({ title }) => (
                <a
                    key={title}
                    href={`#${anchorFor(title)}`}
                    className={chipClass(false, undefined, "tag")}
                >
                    {title}
                </a>
            ))}
        </nav>
        {GROUPS.map(({ title, Component }) => (
            <section
                key={title}
                id={anchorFor(title)}
                className="flex scroll-mt-24 flex-col gap-4"
            >
                <h2 className="border-b border-subtle pb-2 text-label text-content-muted">
                    {title}
                </h2>
                <Component />
            </section>
        ))}
    </div>
);

export default ComponentSection;
