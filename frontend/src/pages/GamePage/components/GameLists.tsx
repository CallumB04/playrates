import ListCard from "../../../components/lists/ListCard";
import { useGameLists } from "../../../hooks/queries/useLists";

const SHOWN = 6;

/** The public lists a game is in, the most upvoted first. Nothing at all
 *  until it's in one: most games aren't yet. */
const GameLists = ({ gameId }: { gameId: number }) => {
    const { data: lists } = useGameLists(gameId, SHOWN);
    if (!lists || lists.length === 0) return null;

    return (
        <section>
            <div className="mb-3 border-b border-subtle pb-2.5">
                <h2 className="font-display text-section text-content">
                    In lists
                </h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
                {lists.map((list) => (
                    <li key={list.id}>
                        <ListCard list={list} showOwner />
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default GameLists;
