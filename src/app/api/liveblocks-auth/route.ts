import { createClient } from "@/lib/supabase-server";
import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get the current user from your database
    let userName = "Anonymous";
    const userAvatar = `https://liveblocks.io/avatars/avatar-${Math.floor(Math.random() * 30)}.png`;

    if (user) {
        // Try to fetch profile
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();

        userName = profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Anonymous";
    }

    const userMeta = user
        ? {
            id: user.id,
            info: {
                name: userName,
                avatar: userAvatar,
            },
        }
        : {
            id: `anon-${Math.floor(Math.random() * 10000)}`,
            info: {
                name: "Anonymous",
                avatar: userAvatar,
            },
        };

    // Identify the user and return the result
    const { status, body } = await liveblocks.prepareSession(
        userMeta.id,
        { userInfo: userMeta.info }
    ).allow(
        `*`, // Allow access to all rooms for now (MVP)
        ["room:write"] // Use string array for permissions instead of FULL_ACCESS constant which might be deprecated or missing in this version
    ).authorize();

    return new NextResponse(body, { status });
}
