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
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <RawgQuotaPanel />
                <PullPanel />
            </div>
            <GameControls />
            <GameEventFeed />
        </div>
    </>
);

export default GamesPage;
