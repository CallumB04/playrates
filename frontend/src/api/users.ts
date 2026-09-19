import axios from "axios";

const API_IP = import.meta.env.VITE_API_IP; // importing ip from .env if exists
axios.defaults.baseURL = `http://${API_IP ? API_IP : "localhost"}:3000`; // setting base url as env server ip, or localhost if doesnt exist

/* Structure of user data in database */

export interface UserAccount {
    id: number;
    username: string; // account name, no spaces allowed, used in url too
    email: string;
    password: string; // temporary non-encrypted password for testing
    picture: string; // user profile picture. empty string if none
    bio: string; // user biography
    online: boolean; // test data for design purposes
}

// for accounts that have been created in signup form, to add to UserAccount interface with unique ID
export interface UserCreation {
    username: string;
    email: string;
    password: string;
}

// fetches whole users array
export const fetchUsers = async (): Promise<UserAccount[]> => {
    try {
        const response = await axios.get<UserAccount[]>("/users");
        return response.data;
    } catch {
        throw new Error("Error fetching users");
    }
};

// fetches a specific user by the given user ID
export const fetchUserByID = async (id: number): Promise<UserAccount> => {
    try {
        const response = await axios.get<UserAccount>(`/users/id/${id}`);
        return response.data;
    } catch {
        throw new Error("Error fetching user");
    }
};

// fetches a specific user by the given email
export const fetchUserByEmail = async (email: string): Promise<UserAccount> => {
    try {
        const response = await axios.get<UserAccount>(`/users/email/${email}`);
        return response.data;
    } catch {
        throw new Error("Error fetching user");
    }
};

// fetches a specific user by the given username
export const fetchUserByUsername = async (
    username: string
): Promise<UserAccount> => {
    try {
        const response = await axios.get<UserAccount>(
            `/users/username/${username}`
        );

        return response.data;
    } catch {
        throw new Error("Error fetching user");
    }
};

// adds new user to user database
export const addNewUser = async (newUser: UserCreation): Promise<boolean> => {
    try {
        // creating new user account
        // using username, email and password from form input
        const newUserAccount: UserAccount = {
            ...newUser,
            id: Date.now(), // using date for unique id
            picture: "",
            bio: "",
            online: true,
        };

        // send new account data to backend
        const response = await axios.post("/users/new", newUserAccount);

        if (response.status === 201) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};

// update user in database
export const updateUserByID = async (
    id: number,
    newData: Partial<Pick<UserAccount, "username" | "bio" | "picture">>
): Promise<boolean> => {
    try {
        const response = await axios.patch(`/users/update/${id}`, newData);

        if (response.status === 200) return true;
        else return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};
