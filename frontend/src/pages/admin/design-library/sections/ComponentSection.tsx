import { useState } from "react";
import Specimen from "../../components/Specimen";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ProfilePicture from "../../../../components/ProfilePicture";
import UserStatus from "../../../../components/UserStatus";
import GamePlatform from "../../../../components/GamePlatform";
import GameCover from "../../../../components/game/GameCover";
import GameTile from "../../../../components/game/GameTile";
import FriendProfile from "../../../../components/FriendProfile";
import Pagination from "../../../../components/ui/Pagination";
import Modal from "../../../../components/ui/Modal";
import ClosePopupIcon from "../../../../components/ClosePopupIcon";
import { usePagination } from "../../../../hooks/usePagination";
import { getColorFromGameStatus } from "../../../../constants/gameStatus";
import { GAME_STATUSES, PLAYED_STATUSES } from "@playrates/shared";

/**
 * Live demos, not screenshots. Every component here is the one the app ships,
 * so this page breaks the moment a component does — which is the point.
 *
 * Components that own routing or data (Navbar, the popups, AccountFormModal)
 * are represented by their building blocks instead; wiring a query client into
 * a gallery would test the harness, not the component.
 *
 * No router wrapper here: this renders inside the app's BrowserRouter, and
 * react-router throws if a second Router is nested inside the first.
 */
const ComponentSection = () => {
    const [modalOpen, setModalOpen] = useState(false);
    const pagination = usePagination({ total: 120, perPage: 20 });

    const demoUser = {
        id: "00000000-0000-0000-0000-000000000000",
        username: "devuser",
        pictureUrl: null,
        bio: "Local development account.",
        online: true,
    };

    return (
        <div className="flex flex-col gap-6">
            <Specimen
                title="Buttons"
                notes="Composed classes from components.css rather than a Button component — an early candidate to become one in the overhaul."
                meta=".button-primary · .button-secondary · .button-danger · .button-outline + .button-outline-default | .button-outline-danger"
            >
                <button className="button-primary">Primary</button>
                <button className="button-secondary">Secondary</button>
                <button className="button-danger">Danger</button>
                <button className="button-outline button-outline-default">
                    Outline
                </button>
                <button className="button-outline button-outline-danger">
                    Outline danger
                </button>
            </Specimen>

            <Specimen
                title="Text links"
                notes="Hover treatments for inline actions."
                meta=".hover-text-white · .hover-text-purple · .hover-text-danger"
            >
                <span className="hover-text-white">Default link</span>
                <span className="hover-text-purple">Emphasised link</span>
                <span className="hover-text-danger">Destructive link</span>
            </Specimen>

            <Specimen
                title="Form controls"
                notes="Inputs share one surface and radius. The range accent is the brand colour."
                meta=".text-input · .dropdown-input · .date-input · .multiline-input · .search-bar · .range-input"
            >
                <input className="text-input" placeholder="Text input" />
                <select className="dropdown-input">
                    <option>Dropdown</option>
                </select>
                <input className="date-input" type="date" />
                <input className="search-bar" placeholder="Search…" />
                <input className="range-input" type="range" defaultValue={7} />
                <textarea
                    className="multiline-input text-input h-16"
                    placeholder="Multiline"
                />
            </Specimen>

            <Specimen
                title="LoadingSpinner"
                notes="Named sizes rather than numbers, so the classes stay literal and survive purging."
                meta='size="sm" | "md" | "lg"'
            >
                <LoadingSpinner size="sm" />
                <LoadingSpinner size="md" />
                <LoadingSpinner size="lg" />
            </Specimen>

            <Specimen
                title="ProfilePicture"
                notes="Each variant is a named design decision. Falls back to the default avatar when a user has no picture."
                meta='variant="friendRow" | "friendRowLarge" | "review" | "editProfile" | "profileHeader"'
            >
                {(["friendRow", "friendRowLarge", "review"] as const).map(
                    (v) => (
                        <div
                            key={v}
                            className="flex flex-col items-center gap-1"
                        >
                            <ProfilePicture
                                variant={v}
                                username="devuser"
                                file=""
                                link={false}
                            />
                            <span className="font-mono text-xs text-content-muted">
                                {v}
                            </span>
                        </div>
                    )
                )}
            </Specimen>

            <Specimen
                title="UserStatus"
                notes="Online state. Dot colour comes from the success/danger tokens."
                meta='status="online" | "offline"'
            >
                <UserStatus status="online" />
                <UserStatus status="offline" />
            </Specimen>

            <Specimen
                title="GamePlatform"
                notes="Platform badge. The list is reference data from the API, not a frontend constant."
                meta='size="xs" | "base"'
            >
                <GamePlatform platform="steam" size="base" />
                <GamePlatform platform="playstation" size="base" />
                <GamePlatform platform="xbox" size="xs" />
                <GamePlatform platform="nintendo-switch" size="xs" />
            </Specimen>

            <Specimen
                title="Game status badges"
                notes="One token per status, used solid for text and at /20 for the background."
                meta="getColorFromGameStatus(status)"
            >
                {[...GAME_STATUSES, ...PLAYED_STATUSES]
                    .filter((s) => s !== "played")
                    .map((status) => {
                        const colors = getColorFromGameStatus(status);
                        return (
                            <span
                                key={status}
                                className={`rounded-full px-1.5 py-0.5 font-light ${colors?.bg} ${colors?.text}`}
                            >
                                {status}
                            </span>
                        );
                    })}
            </Specimen>

            <Specimen
                title="GameCover"
                notes="Renders a placeholder block instead of an empty img, which would otherwise make the browser re-request the page."
                meta="coverUrl: string | null"
            >
                <GameCover
                    coverUrl={null}
                    title="No cover"
                    className="game-cover h-32"
                />
                <span className="text-sm text-content-secondary">
                    ← placeholder when coverUrl is null
                </span>
            </Specimen>

            <Specimen
                title="GameTile"
                notes="One tile for both the library and profile grids. Hover it on a wide screen to see the menu; actions drive both the hover menu and the mobile icon bar."
                meta='variant="library" | "profile" · actions: TileAction[]'
            >
                <div className="flex gap-4">
                    <GameTile
                        gameId={1}
                        title="Hollow Knight"
                        coverUrl={null}
                        variant="library"
                        showMenu
                        popupIsVisible={false}
                        actions={[
                            {
                                key: "view",
                                label: "View",
                                icon: "fas fa-eye",
                                onSelect: () => {},
                            },
                            {
                                key: "edit",
                                label: "Edit",
                                icon: "fas fa-pen-to-square",
                                onSelect: () => {},
                            },
                        ]}
                    />
                </div>
            </Specimen>

            <Specimen
                title="FriendProfile"
                notes="Friend list row at two densities."
                meta='density="compact" | "comfortable"'
            >
                <div className="w-64">
                    <FriendProfile user={demoUser} density="compact" />
                    <FriendProfile user={demoUser} density="comfortable" />
                </div>
            </Specimen>

            <Specimen
                title="Pagination"
                notes="Buttons carry a real disabled attribute at the ends of the range. Labels collapse to arrows below sm."
                meta="pagination: PaginationState"
            >
                <Pagination pagination={pagination} />
            </Specimen>

            <Specimen
                title="Card"
                notes="The standard content container."
                meta=".card · .card-header-text"
            >
                <div className="card w-64">
                    <h2 className="card-header-text">Card header</h2>
                    <p className="mt-2 text-content-secondary">
                        Body copy sits on surface-raised.
                    </p>
                </div>
            </Specimen>

            <Specimen
                title="Notification"
                notes="Toast styles. Rendered here statically; in the app it comes from NotificationContext and auto-dismisses."
                meta='type="success" | "error" | "pending"'
            >
                {(
                    [
                        [
                            "success",
                            "circle-check",
                            "bg-success-subtle text-success",
                        ],
                        [
                            "error",
                            "circle-xmark",
                            "bg-danger-subtle text-danger",
                        ],
                        ["pending", "clock", "bg-warning-subtle text-warning"],
                    ] as const
                ).map(([label, icon, classes]) => (
                    <span
                        key={label}
                        className={`flex items-center gap-x-2 rounded-md px-4 py-2 text-lg ${classes}`}
                    >
                        <i className={`fa-regular fa-${icon}`}></i>
                        <span>This is a {label} message</span>
                    </span>
                ))}
            </Specimen>

            <Specimen
                title="Modal"
                notes="Portalled, focus-trapped, closes on Escape or backdrop press, and locks body scroll. Every popup in the app is built on it."
                meta="<Modal onClose className labelledBy showCloseButton>"
            >
                <button
                    className="button-primary"
                    onClick={() => setModalOpen(true)}
                >
                    Open modal
                </button>
                <div className="relative size-10">
                    <ClosePopupIcon onClick={() => {}} />
                </div>
                <span className="text-sm text-content-secondary">
                    ← ClosePopupIcon, positioned absolutely by the modal
                </span>
            </Specimen>

            {modalOpen && (
                <Modal
                    onClose={() => setModalOpen(false)}
                    labelledBy="demo-modal-title"
                    className="flex w-[420px] max-w-full flex-col gap-4 text-center"
                >
                    <h2
                        id="demo-modal-title"
                        className="border-b border-b-subtle pb-3 text-xl text-content"
                    >
                        Example modal
                    </h2>
                    <p className="text-content-secondary">
                        Press Escape, click the backdrop, or use the close
                        button. Focus returns to the trigger on close.
                    </p>
                    <div className="flex gap-4">
                        <button
                            className="button-secondary flex-1"
                            onClick={() => setModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="button-primary flex-1"
                            onClick={() => setModalOpen(false)}
                        >
                            Confirm
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ComponentSection;
