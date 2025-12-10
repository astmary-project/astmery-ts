export interface Room {
    id: string;
    name: string;
    status: 'active' | 'waiting' | 'closed';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
