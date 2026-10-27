import { useState } from "react";
import { ImageIcon } from "lucide-react";
import type { MyProfile } from "@playrates/shared";
import Button from "../../components/ui/Button";
import { useClearBackground } from "../../hooks/queries/useProfiles";
import { useNotify } from "../../contexts/NotificationContext";
import BackgroundPicker from "../ProfilePage/components/BackgroundPicker";
import {
    backdropAspect,
    REFERENCE_WIDTH,
} from "../ProfilePage/lib/cropPosition";

/** The profile's background as a computer shows it, cropped where its
 *  owner put it, with the same picker the profile opens. */
const BackgroundSetting = ({ profile }: { profile: MyProfile }) => {
    const [picking, setPicking] = useState(false);
    const clear = useClearBackground();
    const notify = useNotify();
    const background = profile.background;

    const remove = () =>
        clear.mutate(undefined, {
            onSuccess: () => notify("Background removed", "success"),
            onError: () => notify("Couldn't remove your background", "error"),
        });

    return (
        <div className="flex max-w-xl flex-col gap-3">
            <div
                style={{ aspectRatio: backdropAspect(REFERENCE_WIDTH) }}
                className="overflow-hidden rounded-md border border-subtle bg-surface-sunken"
            >
                {background ? (
                    <img
                        src={background.url}
                        alt="Your profile background"
                        className="size-full object-cover"
                        style={{
                            objectPosition: `center ${background.position}%`,
                        }}
                    />
                ) : (
                    <p className="grid size-full place-items-center text-label-sm text-content-muted">
                        No background
                    </p>
                )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                    variant="secondary"
                    onClick={() => setPicking(true)}
                    className="w-full sm:w-auto"
                >
                    <ImageIcon size={15} aria-hidden />
                    {background ? "Change background" : "Choose a background"}
                </Button>
                {background && (
                    <Button
                        variant="ghost"
                        onClick={remove}
                        disabled={clear.isPending}
                        className="w-full sm:w-auto"
                    >
                        Remove
                    </Button>
                )}
            </div>
            {picking && (
                <BackgroundPicker
                    profile={profile}
                    onClose={() => setPicking(false)}
                />
            )}
        </div>
    );
};

export default BackgroundSetting;
