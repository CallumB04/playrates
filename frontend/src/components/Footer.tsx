const socialsStyles = `hover:text-brand hover:cursor-pointer transition-colors duration-[200ms]`;

const Footer = () => {
    return (
        <footer className="relative h-72 w-full bg-surface-chrome font-lexend text-content-secondary md:h-36">
            {/* Socials */}
            <div className="mx-auto flex w-full items-center justify-center gap-8 pt-12 text-[33px] md:pt-8 md:text-3xl lg:gap-12">
                <i className={`fab fa-twitter ${socialsStyles}`}></i>
                <i className={`fab fa-instagram ${socialsStyles}`}></i>
                <i className={`fab fa-facebook ${socialsStyles}`}></i>
                <i className={`fab fa-discord ${socialsStyles}`}></i>
            </div>
            {/* Footer text wrapper */}
            <div className="absolute bottom-8 flex w-full flex-wrap justify-between gap-y-[22px] px-6 text-center text-[17px] font-light md:bottom-4">
                <p className="w-full md:w-1/3 md:text-left">
                    Created by{" "}
                    <span className="font-normal">Callum Burgoyne</span>
                </p>
                <p
                    className="mx-auto w-max rounded-md bg-brand p-3 px-4 font-semibold transition-colors duration-[200ms] hover:cursor-pointer hover:bg-brand-hover md:bg-transparent md:p-1 md:hover:bg-transparent md:hover:text-brand"
                    onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                >
                    Back to Top
                </p>
                <p className="w-full md:w-1/3 md:text-right">
                    © 2024 PlayRates
                </p>
            </div>
        </footer>
    );
};

export default Footer;
