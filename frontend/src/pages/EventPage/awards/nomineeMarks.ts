import {
    Clapperboard,
    Puzzle,
    Shield,
    Sparkles,
    User,
    Video,
    type LucideIcon,
} from "lucide-react";

/* By the word in the category's address that says what kind of nominee it
   is, so a category renamed or added another year still finds its mark. */
const MARKS: [RegExp, LucideIcon][] = [
    [/adaptation/, Clapperboard],
    [/user-creation|creation/, Puzzle],
    [/team/, Shield],
    [/creator/, Video],
    [/athlete|performance|person/, User],
];

/** What a nominee that isn't a game is drawn with, without a picture. */
export const markFor = (categorySlug: string): LucideIcon =>
    MARKS.find(([pattern]) => pattern.test(categorySlug))?.[1] ?? Sparkles;
