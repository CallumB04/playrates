import { useAccountForm } from "../contexts/AccountFormContext";
import Button from "./ui/Button";
import EmptyPlate from "./ui/EmptyPlate";

/** In place of a page that needs an account, for someone a link brought
 *  there signed out. */
const SignUpPlate = ({ title, body }: { title: string; body: string }) => {
    const { openSignup, openLogin } = useAccountForm();
    return (
        <EmptyPlate
            title={title}
            body={body}
            action={
                <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={openSignup}>Sign up</Button>
                    <Button variant="secondary" onClick={openLogin}>
                        Sign in
                    </Button>
                </div>
            }
        />
    );
};

export default SignUpPlate;
