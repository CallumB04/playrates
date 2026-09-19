import { Game } from "../../../api";
import LoadingSpinner from "../../../components/LoadingSpinner.tsx";
import GameElement from "./GameElement.tsx";

interface GameSectionProps {
    games: Game[] | undefined;
    loading: boolean;
    error: Error | null;
}

// common styles for loading and error message
const loadingTextStyles = `text-center text-content text-2xl flex justify-center
                           items-center gap-3 pt-4 pb-20 font-lexend`;

const GameSection: React.FC<GameSectionProps> = ({ games, loading, error }) => {
    // displaying error / loading message when games aren't fetched
    if (error) {
        return <p className={loadingTextStyles}>Error Loading Games...</p>;
    }
    if (loading) {
        return (
            <span className={loadingTextStyles}>
                <LoadingSpinner size="sm" />
                <p>Loading Games...</p>
            </span>
        );
    }

    return (
        <div className="mx-auto mt-7 flex w-full flex-wrap justify-evenly gap-y-5">
            {/* Mapping over and display games in array */}
            {games?.map((game) => <GameElement key={game.id} game={game} />)}
        </div>
    );
};

export default GameSection;
