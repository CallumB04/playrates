import { useEffect, useState } from "react";
import { Game } from "../../../api";
import { Link } from "react-router-dom";

interface GameElementProps {
    game: Game;
    userLoggedIn: boolean;
    userHasLog: boolean;
    handleView: () => void;
    handleEdit: () => void;
    handleCreate: () => void;
    popupIsVisible: boolean;
}

const GameElement: React.FC<GameElementProps> = ({
    game,
    userLoggedIn,
    userHasLog,
    handleView,
    handleEdit,
    handleCreate,
    popupIsVisible,
}) => {
    const [hoveringIcon, setHoveringIcon] = useState<boolean>(false);
    const [hoveringMenu, setHoveringMenu] = useState<boolean>(false);

    useEffect(() => {
        if (popupIsVisible) {
            setHoveringIcon(false);
            setHoveringMenu(false);
        }
    }, [popupIsVisible]);

    if (game) {
        return (
            <div className="flex justify-center lg:w-full">
                <Link
                    to={`/game/${game.id}`}
                    className="game-cover group relative h-[180px] w-[135px] p-1 lg:h-[140px] lg:w-[105px]"
                >
                    <img
                        className="h-full w-full rounded-md object-cover"
                        src={`/PlayRates/assets/game-covers/${game.id}.png`}
                    />
                    <div className="absolute left-0 top-0 h-full w-full p-1">
                        {/* Hover menu (lg screens and above) */}
                        <div className="hidden h-full w-full items-center justify-center rounded-md transition-colors duration-200 group-hover:bg-[#0e0e0ebb] lg:flex">
                            <p className="relative line-clamp-3 break-words px-1 text-center font-lexend text-lg text-text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:text-base lg:text-sm 2xl:text-base">
                                {game.title}
                            </p>
                            {/* Ellipsis icon, hover to reveal menu */}
                            {userLoggedIn ? (
                                <i
                                    className="fas fa-ellipsis absolute right-0 top-0 pl-2 pr-3 pt-1 text-lg text-text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                    onMouseOver={() => setHoveringIcon(true)}
                                    onMouseOut={() => setHoveringIcon(false)}
                                ></i>
                            ) : (
                                <></>
                            )}
                            {(hoveringIcon || hoveringMenu) &&
                            !popupIsVisible &&
                            userLoggedIn ? (
                                <div
                                    className={`hover-menu fade-in-left absolute right-8 top-2 ${userHasLog ? "h-1/2 min-h-16" : "h-1/4 min-h-8"} w-full min-w-24 text-center text-sm`}
                                    onMouseOver={() => setHoveringMenu(true)}
                                    onMouseOut={() => setHoveringMenu(false)}
                                >
                                    {userHasLog ? (
                                        <span
                                            className="flex h-1/2 w-full items-center justify-center gap-2 rounded-t transition-colors duration-200 hover:text-highlight-primary"
                                            onClick={(e) => {
                                                e.preventDefault(); // prevent Link from triggering
                                                handleView();
                                            }}
                                        >
                                            <p>View</p>
                                            <i className="fas fa-eye"></i>
                                        </span>
                                    ) : (
                                        <></>
                                    )}

                                    <span
                                        className={`flex ${userHasLog ? "h-1/2 border-t-[1px] border-t-[#cacaca44]" : "h-full"} w-full items-center justify-center gap-2 rounded-b transition-colors duration-200 hover:text-highlight-primary`}
                                        onClick={(e) => {
                                            e.preventDefault(); // prevent Link from triggering
                                            if (userHasLog) {
                                                handleEdit();
                                            } else {
                                                handleCreate();
                                            }
                                        }}
                                    >
                                        <p>{userHasLog ? "Edit" : "Add"}</p>
                                        <i
                                            className={`fas ${userHasLog ? "fa-pen-to-square" : "fa-add"}`}
                                        ></i>
                                    </span>
                                </div>
                            ) : (
                                <></>
                            )}
                        </div>

                        {/* icon menu bar for smaller devices */}
                        {userLoggedIn ? (
                            <div className="relative flex h-full w-full items-end justify-center p-1.5 lg:hidden">
                                <span
                                    className={`flex h-1/5 ${userHasLog ? "w-2/3" : "w-1/3"} rounded bg-[#2e2e2edd]`}
                                >
                                    {userHasLog ? (
                                        <span
                                            className="flex h-full w-1/2 items-center justify-center text-text-secondary hover:text-highlight-primary"
                                            onClick={(e) => {
                                                e.preventDefault(); // prevent Link from triggering
                                                handleView();
                                            }}
                                        >
                                            <i
                                                className="fas fa-eye"
                                                title="View"
                                            ></i>
                                        </span>
                                    ) : (
                                        <></>
                                    )}

                                    <span
                                        className={`flex h-full ${userHasLog ? "w-1/2" : "w-full"} items-center justify-center text-text-secondary hover:text-highlight-primary`}
                                        onClick={(e) => {
                                            e.preventDefault(); // prevent Link from triggering

                                            if (userHasLog) {
                                                handleEdit();
                                            } else {
                                                handleCreate();
                                            }
                                        }}
                                    >
                                        <i
                                            className={`fas ${userHasLog ? "fa-pen-to-square" : "fa-add"}`}
                                            title={userHasLog ? "Edit" : "Add"}
                                        ></i>
                                    </span>
                                </span>
                            </div>
                        ) : (
                            <></>
                        )}
                    </div>
                </Link>
            </div>
        );
    }
};

export default GameElement;
