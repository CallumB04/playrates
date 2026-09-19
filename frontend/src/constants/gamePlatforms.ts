/** Platforms a game can be logged against, with their Font Awesome icons. */
export interface GamePlatform {
    name: string;
    display: string;
    icon: string;
}

export const gamePlatforms: GamePlatform[] = [
    { name: "steam", display: "Steam", icon: "fab fa-steam" },
    { name: "pc-game-pass", display: "PC Game Pass", icon: "fab fa-xbox" },
    { name: "xbox", display: "Xbox", icon: "fab fa-xbox" },
    { name: "playstation", display: "Playstation", icon: "fab fa-playstation" },
    {
        name: "nintendo-switch",
        display: "Nintendo Switch",
        icon: "fas fa-gamepad",
    },
    { name: "other-pc", display: "Other PC", icon: "fas fa-desktop" },
    { name: "mobile", display: "Mobile", icon: "fas fa-mobile-screen" },
];
