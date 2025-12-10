'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { SupabaseUserProfileRepository } from '../infrastructure/SupabaseUserProfileRepository';

const repository = new SupabaseUserProfileRepository();

export function ProfileSettings() {
    const [userId, setUserId] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const profile = await repository.getProfile(user.id);
                if (profile) {
                    setDisplayName(profile.displayName);
                }
            }
            setIsLoading(false);
        };
        load();
    }, []);

    const handleSave = async () => {
        if (!userId) return;
        setIsSaving(true);
        setMessage(null);

        try {
            await repository.saveProfile({
                userId,
                displayName,
                updatedAt: new Date().toISOString(),
            });
            setMessage({ type: 'success', text: 'プロフィールを更新しました' });
            // Reload window to update sidebar
            window.location.reload();
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: '更新に失敗しました' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div>読み込み中...</div>;
    if (!userId) return <div>ログインしてください</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>プロフィール設定</CardTitle>
                <CardDescription>
                    アプリケーション内で表示される名前を設定します。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="displayName">表示名</Label>
                    <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="表示名を入力"
                    />
                    <p className="text-sm text-muted-foreground">
                        設定しない場合は、Googleアカウントの名前またはメールアドレスが表示されます。
                    </p>
                </div>

                {message && (
                    <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {message.text}
                    </div>
                )}

                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                </Button>
            </CardContent>
        </Card>
    );
}
