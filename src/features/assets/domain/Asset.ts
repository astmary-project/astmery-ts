export type AssetType = 'image' | 'audio';

export interface Asset {
    id: string;
    userId: string;
    type: AssetType;
    url: string;
    name: string;
    size: number;
    mimeType: string;
    createdAt: number;
}
