import AdminPageHeader from "../components/AdminPageHeader";
import GameControls from "./GameControls";
import GameEventFeed from "./GameEventFeed";
import PullPanel from "./PullPanel";
import RawgQuotaPanel from "./RawgQuotaPanel";

const GamesPage = () => (
    <>
        <AdminPageHeader
            title="Games"
            description="The catalogue, the RAWG allowance it runs on, and everything that changes it."
        />
        <div className="flex flex-col gap-10">
            <RawgQuotaPanel />
            <div className="grid items-start gap-6 lg:grid-cols-2">
                <PullPanel />
                <GameControls />
            </div>
            <GameEventFeed />
        </div>
    </>
);

export default GamesPage;
