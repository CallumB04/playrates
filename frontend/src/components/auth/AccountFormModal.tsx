import { useAccountForm } from "../../contexts/AccountFormContext";
import { BRAND_MOTTO } from "../../constants/brand";
import { useGames } from "../../hooks/queries/useGames";
import Modal from "../ui/Modal";
import ArtCycle from "./ArtCycle";
import BrandLockup from "./BrandLockup";
import LoginSteps from "./LoginSteps";

/** The log-in page's art side, in small: the trending games cycling under
 *  the mark and the motto. Its own component, so the games are only asked
 *  for once the popup opens. */
const LoginArt = () => {
    const { data: trending } = useGames({
        trending: true,
        limit: 6,
        count: false,
    });
    const arts = (trending?.data ?? []).flatMap((game) =>
        game.artworkUrl ? [game.artworkUrl] : []
    );

    return (
        <div
            // Dark in both themes, as the page's is. The art fades into the
            // dark itself, at the top and the foot where the words sit:
            // a veil over it would show a rim round the rounded corners.
            className="relative isolate flex flex-col justify-between gap-6 overflow-hidden bg-surface-media px-5 pt-3 pb-6 text-content-on-media md:px-8 md:pt-7 md:pb-8"
        >
            <ArtCycle
                arts={arts}
                className="[mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.35),rgb(0_0_0/0.85)_35%,rgb(0_0_0/0.85)_60%,rgb(0_0_0/0.3))] opacity-75"
            />
            <BrandLockup />
            <p className="max-w-[14ch] font-display text-[24px] leading-[1.06] md:text-[34px]">
                {BRAND_MOTTO}.
            </p>
        </div>
    );
};

/**
 * Logging in without leaving the page: the /login page in small, its art
 * beside the same steps on a wide screen, and above them as a band on a
 * phone. Signing up is a page of its own, /join.
 */
const AccountFormModal = () => {
    const { mode, openSignup, close } = useAccountForm();
    if (!mode) return null;

    return (
        <Modal
            onClose={close}
            labelledBy="account-form-title"
            closeOverArt
            className="w-full max-w-[880px] p-0! sm:p-0!"
        >
            <div className="grid md:min-h-[560px] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
                <LoginArt />
                <div className="flex flex-col justify-center px-5 pt-6 pb-2 sm:px-6 md:px-10 md:py-10">
                    <LoginSteps
                        key={mode}
                        initialStep={mode === "reset" ? "reset" : "login"}
                        headingAs="h2"
                        headingId="account-form-title"
                        createAccount={
                            <button
                                type="button"
                                onClick={openSignup}
                                className="relative cursor-pointer font-medium text-brand-text before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline"
                            >
                                Create an account
                            </button>
                        }
                    />
                </div>
            </div>
        </Modal>
    );
};

export default AccountFormModal;
