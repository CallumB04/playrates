import axios from "axios";

const API_IP = import.meta.env.VITE_API_IP; // importing ip from .env if exists
axios.defaults.baseURL = `http://${API_IP ? API_IP : "localhost"}:3000`; // setting base url as env server ip, or localhost if doesnt exist

export interface GameLog {
    id: number; // corresponding game id
    status: string; // played, playing, backlog, wishlist
    playedStatus?: string; // finished, mastered, shelved, retired
    rating?: number; // range of 1-10, step of 0.25 (e.g: 6.25, 8.75, 3.5, 5.0)
    hoursPlayed?: number; // to 1 decimal point
    hoursToBeat?: number; // to 1 decimal point
    startDate?: string; // stored in ISO 8601 format for easy Date object conversion
    finishDate?: string; // stored in ISO 8601 format for easy Date object conversion
    platform?: string; // Steam, Xbox Game pass, etc
    achievementsTotal?: number; // achivement count of that game on that platform
    achievementsCompleted?: number; // number of unlocked achievements
}

export const fetchGameLogs = async () => {
    try {
        const response = await axios.get("/gamelogs");
        return response.data;
    } catch {
        throw new Error("Error fetching game logs");
    }
};

export const fetchGameLogsByUserID = async (userID: number) => {
    try {
        const response = await axios.get(`/gamelogs/${userID}`);
        return response.data;
    } catch {
        throw new Error("Error fetching game logs");
    }
};

export const createNewGameLog = async (
    userID: number,
    logData: GameLog
): Promise<boolean> => {
    try {
        const response = await axios.post(`/gamelogs/${userID}/create`, {
            logData: logData,
        });

        if (response.status === 204) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const editGameLog = async (
    userID: number,
    gameID: number,
    newData: GameLog
): Promise<boolean> => {
    try {
        const response = await axios.patch(
            `/gamelogs/${userID}/edit/${gameID}`,
            {
                newData: newData,
            }
        );

        if (response.status === 204) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const deleteGameLog = async (
    userID: number,
    gameID: number
): Promise<boolean> => {
    try {
        const response = await axios.delete(
            `/gamelogs/${userID}/delete/${gameID}`
        );

        if (response.status === 204) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};
