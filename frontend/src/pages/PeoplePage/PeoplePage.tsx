import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FriendUser, Profile } from "@playrates/shared";
import { queryKeys, searchProfiles } from "../../api";
import FriendProfile from "../../components/FriendProfile";
import Button from "../../components/ui/Button";
import { cardClass } from "../../components/ui/cardClass";
import { EmptyNote } from "../../components/ui/EmptyPlate";
import { Input } from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import { TextSkeleton } from "../../components/ui/Skeleton";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTasteMatches } from "../../hooks/queries/useFriends";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageMeta } from "../../hooks/usePageMeta";

const asFriendUser = (profile: Profile): FriendUser => ({
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    accent: profile.accent,
    bio: profile.bio,
    online: profile.online,
});

const Results = ({ term }: { term: string }) => {
    const { data, isPending } = useQuery({
        queryKey: queryKeys.profiles.search(term),
        queryFn: () => searchProfiles(term),
    });
    if (isPending) return <TextSkeleton lines={3} />;
    if (!data || data.data.length === 0) {
        return <EmptyNote>Nobody by that name yet.</EmptyNote>;
    }
    return (
        <ul
            className={cardClass("grid gap-0.5 p-1.5 sm:grid-cols-2", {
                padding: "none",
            })}
        >
            {data.data.map((profile) => (
                <li key={profile.id}>
                    <FriendProfile
                        user={asFriendUser(profile)}
                        density="comfortable"
                    />
                </li>
            ))}
        </ul>
    );
};

const Matches = () => {
    const { data, isPending } = useTasteMatches();
    if (isPending) return <TextSkeleton lines={4} />;
    if (!data || data.length === 0) {
        return (
            <EmptyNote>
                Nobody yet. Rate a few more games and the people who rate them
                like you will show up here.
            </EmptyNote>
        );
    }
    return (
        <ul
            className={cardClass("grid gap-0.5 p-1.5 sm:grid-cols-2", {
                padding: "none",
            })}
        >
            {data.map(({ user, shared, agreement }) => (
                <li key={user.id}>
                    <FriendProfile
                        user={user}
                        density="comfortable"
                        trailing={`${agreement}% alike · ${shared} games`}
                    />
                </li>
            ))}
        </ul>
    );
};

/** Finding people: by name, and by the games you rate alike. */
const PeoplePage = () => {
    usePageMeta({
        title: "People",
        description: "Find people on PlayRates who play and rate like you.",
    });
    const { user } = useAuth();
    const { openSignup } = useAccountForm();
    const [term, setTerm] = useState("");
    const search = useDebouncedValue(term.trim(), 250);

    return (
        <>
            <PageHeader
                title="People"
                note="Find people who play and rate like you."
            />
            <div className="flex flex-col gap-8">
                <label className="flex flex-col gap-2">
                    <span className="text-label text-content-secondary">
                        Search by username
                    </span>
                    <Input
                        type="search"
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="Username"
                        autoComplete="off"
                        maxLength={200}
                    />
                </label>

                {search.length >= 2 ? (
                    <Results term={search} />
                ) : (
                    <section className="flex flex-col gap-3">
                        <div className="border-b border-subtle pb-2.5">
                            <h2 className="font-display text-section text-content">
                                Rate like you
                            </h2>
                            <p className="mt-1 text-label text-content-muted">
                                From the games you have both rated, three at
                                least.
                            </p>
                        </div>
                        {user ? (
                            <Matches />
                        ) : (
                            <div className="flex flex-col items-start gap-3">
                                <p className="text-body-sm text-content-secondary">
                                    Sign up and rate a few games to see who
                                    rates them like you.
                                </p>
                                <Button
                                    onClick={() => openSignup()}
                                    className="w-full sm:w-auto"
                                >
                                    Join PlayRates
                                </Button>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </>
    );
};

export default PeoplePage;
