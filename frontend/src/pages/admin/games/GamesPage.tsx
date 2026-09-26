import { useState } from "react";
import Button from "../../../components/ui/Button";
import AdminPageHeader from "../components/AdminPageHeader";
import MetricDetailModal from "../overview/MetricDetailModal";
import GameControls from "./GameControls";
import GameEventFeed from "./GameEventFeed";
import PullPanel from "./PullPanel";
import RawgAllowance from "./RawgAllowance";

const GamesPage = () => {
    const [catalogue, setCatalogue] = useState(false);
    return (
        <>
            <AdminPageHeader
                title="Games"
                actions={
                    <Button variant="secondary" onClick={() => setCatalogue(true)} className="w-full sm:w-auto">
                        How complete the catalogue is
                    </Button>
                }
            />
            <div className="flex flex-col gap-8">
                <RawgAllowance />
                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <PullPanel />
                    <GameControls />
                </div>
                <GameEventFeed />
            </div>
            {catalogue && (
                <MetricDetailModal metric="games" range="30d" overview={undefined} onClose={() => setCatalogue(false)} />
            )}
        </>
    );
};

export default GamesPage;
