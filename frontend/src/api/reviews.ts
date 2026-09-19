import axios from "axios";

const API_IP = import.meta.env.VITE_API_IP; // importing ip from .env if exists
axios.defaults.baseURL = `http://${API_IP ? API_IP : "localhost"}:3000`; // setting base url as env server ip, or localhost if doesnt exist

export interface Review {
    gameID: number;
    text: string;
    creationDate: string; // stored in ISO 8601 format for easy Date object conversion
    public: boolean; // if other users can see this review

    // optional reviewer data for when fetching reviews for specific game
    reviewerName?: string;
    reviewerProfilePicture?: string;
    reviewerGameLogRating?: number;
    reviewerGameLogPlatform?: string;
}

export const fetchReviews = async () => {
    try {
        const response = await axios.get("/reviews");
        return response.data;
    } catch {
        throw new Error("Error fetching reviews");
    }
};

export const fetchReviewsByUserID = async (userID: number) => {
    try {
        const response = await axios.get(`/reviews/user/${userID}`);
        return response.data;
    } catch {
        throw new Error("Error fetching reviews");
    }
};

export const fetchReviewsByGameID = async (gameID: number) => {
    try {
        const response = await axios.get(`/reviews/game/${gameID}`);
        return response.data;
    } catch {
        throw new Error("Error fetching reviews");
    }
};
