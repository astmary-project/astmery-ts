import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;

    className?: string;
}

export const ImageUpload = ({
    value,
    onChange,

    className,
}: ImageUploadProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('画像ファイルのみアップロード可能です。');
            return;
        }

        // Validate file size (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('ファイルサイズは5MB以下にしてください。');
            return;
        }

        setError(null);
        setIsUploading(true);

        try {
            // Use R2AssetRepository to handle upload and DB registration
            // We can't easily inject repository here without refactoring props, so we'll instantiate it directly for now.
            // Or better, we can just import it.
            const { R2AssetRepository } = await import('@/features/assets/infrastructure/R2AssetRepository');
            const repository = new R2AssetRepository();

            const result = await repository.upload(file, 'image');

            if (result.isFailure) {
                throw result.error;
            }

            onChange(result.value.url);
        } catch (err) {
            console.error('Upload error:', err);
            setError('画像のアップロードに失敗しました。');
        } finally {
            setIsUploading(false);
            // Reset input so the same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = () => {
        onChange('');
    };

    const triggerUpload = () => {
        if (!isUploading) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className={cn("group relative inline-block w-32 h-32", className)}>
            <div
                className={cn(
                    "relative w-full h-full rounded-full overflow-hidden border-4 border-muted cursor-pointer transition-all hover:border-primary",
                    isUploading && "opacity-50 cursor-wait"
                )}
                onClick={triggerUpload}
            >
                <Avatar className="w-full h-full">
                    <AvatarImage src={value} className="object-cover" />
                    <AvatarFallback className="bg-muted flex flex-col items-center justify-center text-muted-foreground">
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8 opacity-50" />
                        )}
                    </AvatarFallback>
                </Avatar>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white opacity-80" />
                </div>
            </div>

            {/* Delete Button (Top Right) */}
            {value && !isUploading && (
                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-0 right-0 w-6 h-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 translate-x-1/4 -translate-y-1/4"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemove();
                    }}
                    title="画像を削除"
                >
                    <X className="h-3 w-3" />
                </Button>
            )}

            {/* Error Message */}
            {error && (
                <p className="absolute top-full mt-2 left-0 w-full text-sm text-destructive text-center bg-background/80 p-1 rounded">
                    {error}
                </p>
            )}

            <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
            />
        </div>
    );
};
