import { UserProfile } from "../UserProfile";

export interface IUserProfileRepository {
    getProfile(userId: string): Promise<UserProfile | null>;
    saveProfile(profile: UserProfile): Promise<void>;
}
