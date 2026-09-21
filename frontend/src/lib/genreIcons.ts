import {
    Blocks,
    Car,
    Castle,
    Crosshair,
    Dices,
    Flag,
    Ghost,
    Gamepad2,
    Joystick,
    Map,
    Music,
    Puzzle,
    Rocket,
    Shapes,
    Spade,
    Sparkles,
    Swords,
    Trophy,
    Users,
    Wrench,
    type LucideIcon,
} from "lucide-react";

/** A mark per genre, keyed by RAWG's slugs. An unknown one falls back to a
 *  controller rather than leaving a hole in the grid. */
const GENRE_ICONS: Record<string, LucideIcon> = {
    action: Swords,
    adventure: Map,
    arcade: Joystick,
    "board-games": Dices,
    card: Spade,
    casual: Sparkles,
    educational: Blocks,
    family: Users,
    fighting: Crosshair,
    indie: Shapes,
    "massively-multiplayer": Users,
    platformer: Flag,
    puzzle: Puzzle,
    racing: Car,
    "role-playing-games-rpg": Castle,
    rpg: Castle,
    shooter: Crosshair,
    simulation: Wrench,
    sports: Trophy,
    strategy: Castle,
    horror: Ghost,
    music: Music,
    "science-fiction": Rocket,
};

export const genreIcon = (slug: string): LucideIcon =>
    GENRE_ICONS[slug] ?? Gamepad2;
