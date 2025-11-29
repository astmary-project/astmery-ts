export interface UserProfile {
    userId: string;
    displayName: string;
    role?: 'user' | 'admin';
    updatedAt: string;
}
