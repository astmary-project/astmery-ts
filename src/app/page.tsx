import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase-server';
import { ScrollText, Settings, User } from 'lucide-react';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profile name
  let displayName = user?.email;
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();
    if (data?.display_name) {
      displayName = data.display_name;
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Welcome back, {displayName}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/character">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="w-6 h-6" />
                Characters
              </CardTitle>
              <CardDescription>
                Manage your characters and sheets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Go to Character List</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Settings
              </CardTitle>
              <CardDescription>
                Update your profile and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">Open Settings</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/room">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-6 h-6" />
                Sessions
              </CardTitle>
              <CardDescription>
                Manage TRPG sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Join Session</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
