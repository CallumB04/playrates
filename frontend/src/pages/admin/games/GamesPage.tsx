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
                    <>
                        <IgdbUsage />
                        <Button
                            variant="secondary"
                            onClick={() => setCatalogue(true)}
                            className="w-full sm:w-auto"
                        >
                            How complete the catalogue is
                        </Button>
                    </>
                }
            />
            <div className="flex flex-col gap-10">
                <div className="grid items-start gap-4 lg:grid-cols-2">
                    <GameControls />
                    <PullPanel />
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
