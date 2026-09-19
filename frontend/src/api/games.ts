import axios from "axios";

const API_IP = import.meta.env.VITE_API_IP; // importing ip from .env if exists
axios.defaults.baseURL = `http://${API_IP ? API_IP : "localhost"}:3000`; // setting base url as env server ip, or localhost if doesnt exist

/* Structure of game data in database */

export interface Game {
    id: number;
    title: string;
    description: string;
    trending: boolean; // temporary feature, in future will be based on weekly listings
    releaseDate: string; // stored in ISO 8601 format for easy Date object conversion
    platforms: string[]; // steam, xbox, etc
    eighteenPlus: boolean; // 18+ age restriction
}

// fetches whole games array
export const fetchGames = async (): Promise<Game[]> => {
    try {
        const response = await axios.get<Game[]>("/games");
        return response.data;
    } catch {
        throw new Error("Error fetching games");
    }
};

// fetches a specific game by the given game ID
export const fetchGameById = async (id: number): Promise<Game | undefined> => {
    try {
        const response = await axios.get<Game>(`/games/${id}`);

        return response.data;
    } catch {
        throw new Error("Error fetching games");
    }
};
