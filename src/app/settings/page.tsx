import { ProfileSettings } from '@/features/user/components/ProfileSettings';

export default function SettingsPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <h1 className="text-3xl font-bold mb-8">設定</h1>
            <ProfileSettings />
        </div>
    );
}
