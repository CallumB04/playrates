import { FormEvent, useEffect, useRef, useState } from "react";
import {
    fetchUserByUsername,
    fetchUserByEmail,
    addNewUser,
    UserCreation,
} from "../api";
import LoadingSpinner from "./LoadingSpinner";
import ClosePopupIcon from "./ClosePopupIcon";

interface FormProps {
    formType: "signup" | "login";
    closeAccountForm: () => void;
    openSignupForm: () => void;
    openLoginForm: () => void;
    loadUserByID: (id: number) => Promise<void>;
    runNotification: (
        text: string,
        type: "success" | "error" | "pending"
    ) => void;
}

const AccountForm: React.FC<FormProps> = ({
    formType,
    closeAccountForm,
    openSignupForm,
    openLoginForm,
    loadUserByID,
    runNotification,
}) => {
    // form input elements
    const usernameInput = useRef<HTMLInputElement>(null);
    const emailInput = useRef<HTMLInputElement>(null);
    const passwordInput = useRef<HTMLInputElement>(null);

    // form input error message elements
    const usernameErrorText = useRef<HTMLParagraphElement>(null);
    const emailErrorText = useRef<HTMLParagraphElement>(null);
    const passwordErrorText = useRef<HTMLParagraphElement>(null);

    // form and backdrop elements
    const formElement = useRef<HTMLFormElement>(null);
    const formBackdrop = useRef<HTMLDialogElement>(null);

    // password hidden or show setting
    const [passwordHide, setPasswordHide] = useState<boolean>(true);

    // whether api is loading - display loading spinner
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // username to pass from signup to login
    const [usernameAfterSignup, setUsernameAfterSignup] = useState<string>("");

    // function for hiding error message if not already hidden
    const hideErrorMessage = (msg: React.RefObject<HTMLParagraphElement>) => {
        if (!msg.current?.classList.contains("hidden")) {
            msg.current?.classList.add("hidden");
        }
    };

    const clearErrorsAndInputs = () => {
        // hiding error messages
        hideErrorMessage(usernameErrorText);
        hideErrorMessage(emailErrorText);
        hideErrorMessage(passwordErrorText);

        // removing input values
        usernameInput.current!.value = "";
        if (emailInput.current) {
            emailInput.current.value = "";
        }
        passwordInput.current!.value = "";
    };

    // clearing inputs and error messages on form change
    useEffect(() => {
        clearErrorsAndInputs();

        // if valid signup
        if (usernameAfterSignup) {
            // if user returns to signup again, remove username from input
            if (formType === "login") {
                setUsernameAfterSignup("");
            }

            // setting username and displaying success message
            usernameInput.current!.value = usernameAfterSignup;

            // focusing password input
            passwordInput.current?.focus();
        } else {
            // focusing username input
            usernameInput.current?.focus();
        }
    }, [formType]);

    // checking for ESC key press to close form
    useEffect(() => {
        const keyCheck = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeAccountForm();
            }
        };

        document.addEventListener("keydown", keyCheck);

        // removing key event listener when form is closed
        return () => {
            document.removeEventListener("keydown", keyCheck);
        };
    }, []);

    // function to handle user signup on form submission
    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // preventing page from refreshing
        let errored = false; // set to true if any of inputs causes error, to return after all checks
        setIsLoading(true); // display loading spinner and prevent interaction with backdrop

        // getting data from form inputs
        const data = new FormData(event.currentTarget);
        const username = data.get("username");
        const email = data.get("email");
        const password = data.get("password");
        const remember = data.get("remember");

        // checking if username is already used in signup
        // or if username exists in login
        try {
            await fetchUserByUsername(username!.toString());

            // user already exists - signup
            if (formType === "signup") {
                usernameErrorText.current!.classList.remove("hidden");
                errored = true;
            } else {
                hideErrorMessage(usernameErrorText);
            }
        } catch {
            // username doesnt exist - login
            if (formType === "login") {
                usernameErrorText.current!.classList.remove("hidden");
                errored = true;
            } else {
                hideErrorMessage(usernameErrorText);
            }
        }

        // checking if email is already used in signup
        if (email) {
            try {
                await fetchUserByEmail(email.toString());

                emailErrorText.current!.classList.remove("hidden");
                errored = true;
            } catch {
                hideErrorMessage(emailErrorText);
            }
        }

        // checking if password is long enough for signup
        // or if password is correct for login
        if (formType === "signup") {
            // password length less that 8 characters - signup
            if (password!.toString().length < 8) {
                passwordErrorText.current!.classList.remove("hidden");
                errored = true;
            } else {
                hideErrorMessage(passwordErrorText);
            }
        } else {
            try {
                const fetchedUser = await fetchUserByUsername(
                    username!.toString()
                );
                // incorrect password - login
                if (password!.toString() !== fetchedUser.password) {
                    passwordErrorText.current!.classList.remove("hidden");
                    passwordInput.current!.value = "";
                    errored = true;
                } else {
                    hideErrorMessage(passwordErrorText);
                }
            } catch {
                hideErrorMessage(passwordErrorText);
            }
        }

        // exit function if any of inputs caused error
        if (errored) {
            setIsLoading(false);
            return;
        }

        // creating new account if signup
        if (formType === "signup") {
            // defining user structure
            const newUser: UserCreation = {
                username: usernameInput.current!.value,
                email: emailInput.current!.value.toLowerCase(),
                password: passwordInput.current!.value,
            };

            // calling api function to add new user
            addNewUser(newUser)
                .then(() => {
                    setUsernameAfterSignup(newUser.username);
                    runNotification("Account successfully created", "success");
                    openLoginForm();
                })
                .catch(() => {
                    runNotification(
                        "Account creation failed, please try again",
                        "error"
                    );
                })
                .finally(() => {
                    // remove loading spinner once complete
                    setIsLoading(false);
                });
        }
        // logging into account
        else {
            const user = await fetchUserByUsername(
                usernameInput.current!.value
            );

            if (user) {
                if (remember) {
                    // add to local storage if user selects remember me
                    localStorage.setItem("user_id", String(user.id));
                } else {
                    // add to session storage if not remember me
                    sessionStorage.setItem("user_id", String(user.id));
                }

                loadUserByID(user.id); // load new user into context
                closeAccountForm(); // close the login form
            }
        }
    };

    return (
        <dialog
            className="popup-backdrop"
            ref={formBackdrop}
            onMouseDown={closeAccountForm}
        >
            <form
                onSubmit={handleFormSubmit}
                onMouseDown={(event) => event.stopPropagation()}
                className="popup mx-auto flex w-full max-w-[630px] flex-col justify-center px-2 py-12 font-lexend text-content sm:px-12 sm:py-16 md:px-16"
                ref={formElement}
            >
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl">
                        {formType === "signup"
                            ? "Sign up for PlayRates"
                            : "Log in to PlayRates"}
                    </h2>
                    <p className="mt-2 sm:text-lg">
                        {formType === "signup"
                            ? "Create a free account or"
                            : "Not a member?"}{" "}
                        <span
                            onClick={
                                formType === "signup"
                                    ? openLoginForm
                                    : openSignupForm
                            }
                            className="hover-text-purple"
                        >
                            {formType === "signup" ? "log in" : "Sign up"}
                        </span>
                    </p>
                </div>
                <div className="mx-auto w-11/12 space-y-6 pt-12 sm:mx-0 sm:w-full sm:space-y-8">
                    <div>
                        <input
                            name="username"
                            type="text"
                            placeholder="Username"
                            className="w-full rounded-lg border border-field bg-transparent py-[14px] pl-3 focus:border-brand focus:outline-none sm:rounded-none sm:border-0 sm:border-b sm:border-content sm:py-[6px] sm:pl-[2px]"
                            required
                            ref={usernameInput}
                        />
                        <p
                            className="hidden pt-3 text-danger"
                            ref={usernameErrorText}
                        >
                            {formType === "signup"
                                ? "Sorry that username is taken."
                                : "Username does not exist."}
                        </p>
                    </div>
                    {formType === "signup" ? (
                        <div>
                            <input
                                name="email"
                                type="email"
                                placeholder="Email"
                                className="w-full rounded-lg border border-field bg-transparent py-[14px] pl-3 focus:border-brand focus:outline-none sm:rounded-none sm:border-0 sm:border-b sm:border-content sm:py-[6px] sm:pl-[2px]"
                                required
                                ref={emailInput}
                            />
                            <p
                                className="hidden pt-3 text-danger"
                                ref={emailErrorText}
                            >
                                Sorry that email is already being used.
                            </p>
                        </div>
                    ) : (
                        ""
                    )}
                    <div className="relative">
                        <input
                            name="password"
                            type={passwordHide ? "password" : "text"}
                            placeholder="Password"
                            className="w-full rounded-lg border border-field bg-transparent py-[14px] pl-3 pr-11 focus:border-brand focus:outline-none sm:rounded-none sm:border-0 sm:border-b sm:border-content sm:py-[6px] sm:pl-[2px] sm:pr-10"
                            required
                            ref={passwordInput}
                        />
                        <p
                            className="hidden pt-3 text-danger"
                            ref={passwordErrorText}
                        >
                            {formType === "signup"
                                ? "Password needs to be atleast 8 characters long."
                                : "Password is incorrect."}
                        </p>
                        <i
                            className={`fa-regular ${passwordHide ? "fa-eye" : "fa-eye-slash"} absolute ${passwordHide ? "right-3" : "right-[11px]"} hover-text-white top-[14px] mr-1 text-xl sm:top-1 sm:mr-0 sm:text-base`}
                            onClick={() => setPasswordHide(!passwordHide)}
                            title={passwordHide ? "Show" : "Hide"}
                        ></i>
                    </div>
                </div>
                <div className="mx-auto w-11/12 space-y-3 pt-6 sm:mx-0 sm:w-full sm:pt-8 md:pt-10">
                    <button
                        type="submit"
                        className="button-primary w-full sm:rounded"
                    >
                        {formType === "signup" ? "Sign up" : "Log in"}
                    </button>
                    {formType === "login" ? (
                        <div className="flex w-full items-center justify-between">
                            <div className="flex flex-row items-center gap-x-[6px]">
                                <input name="remember" type="checkbox" />
                                <p>Remember me</p>
                            </div>

                            <p className="hover-text-purple">
                                Forgot password?
                            </p>
                        </div>
                    ) : (
                        <></>
                    )}
                </div>
                <ClosePopupIcon onClick={closeAccountForm} />
                {isLoading ? (
                    <dialog className="flex size-full items-center justify-center rounded-lg bg-overlay-loading">
                        <LoadingSpinner size="lg" />
                    </dialog>
                ) : (
                    <></>
                )}
            </form>
        </dialog>
    );
};

export default AccountForm;
