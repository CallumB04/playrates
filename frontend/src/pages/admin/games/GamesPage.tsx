import { useState } from "react";
import Button from "../../../components/ui/Button";
import AdminPageHeader from "../components/AdminPageHeader";
import CataloguePopup from "./CataloguePopup";
import GameControls from "./GameControls";
import GameEventFeed from "./GameEventFeed";
import PullPanel from "./PullPanel";
import IgdbUsage from "./IgdbUsage";

const GamesPage = () => {
    const [catalogue, setCatalogue] = useState(false);
    return (
        <>
            <AdminPageHeader
                title="Games"
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => setCatalogue(true)}
                        className="w-full sm:w-auto"
                    >
                        How complete the catalogue is
                    </Button>
                }
            />
            <div className="flex flex-col gap-8">
                <IgdbUsage />
                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <PullPanel />
                    <GameControls />
                </div>
                <GameEventFeed />
            </div>
            {catalogue && (
                <CataloguePopup onClose={() => setCatalogue(false)} />
            )}
        </>
    );
};

export default GamesPage;
