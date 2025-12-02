import { Liveblocks } from "@liveblocks/node";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

if (!API_KEY) {
    console.warn("LIVEBLOCKS_SECRET_KEY is not set");
}

export const liveblocks = new Liveblocks({
    secret: API_KEY || "",
});
