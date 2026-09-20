import ActionsSpecimens from "./components/ActionsSpecimens";
import FormSpecimens from "./components/FormSpecimens";
import DataSpecimens from "./components/DataSpecimens";
import SurfaceSpecimens from "./components/SurfaceSpecimens";
import FeedbackSpecimens from "./components/FeedbackSpecimens";

/*
 * Live demos rather than screenshots, so this always matches the real
 * components. Anything owning data or routing is shown through its parts.
 *
 * No router in here — this renders inside the app's BrowserRouter.
 */
const GROUPS = [
    { title: "Actions", Component: ActionsSpecimens },
    { title: "Forms", Component: FormSpecimens },
    { title: "Data", Component: DataSpecimens },
    { title: "Surfaces", Component: SurfaceSpecimens },
    { title: "Feedback", Component: FeedbackSpecimens },
] as const;

const ComponentSection = () => (
    <div className="flex flex-col gap-10">
        {GROUPS.map(({ title, Component }) => (
            <section key={title} className="flex flex-col gap-4">
                <h2 className="rule-double pb-2 font-mono text-label uppercase text-content-muted">
                    {title}
                </h2>
                <Component />
            </section>
        ))}
    </div>
);

export default ComponentSection;
