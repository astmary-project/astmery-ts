import { createClient } from "@/lib/supabase-server";
import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get the current user from your database
    const userMeta = user
        ? {
            id: user.id,
            info: {
                name: user.email || "Anonymous",
                avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(Math.random() * 30)}.png`,
            },
        }
        : {
            id: `anon-${Math.floor(Math.random() * 10000)}`,
            info: {
                name: "Anonymous",
                avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(Math.random() * 30)}.png`,
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
