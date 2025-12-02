import { createClient, LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { SessionLogEntry } from "./features/session/domain/SessionLog";

const client = createClient({
    authEndpoint: "/api/liveblocks-auth",
});

type Presence = {
    cursor: { x: number, y: number } | null;
};

type Storage = {
    logs: LiveList<SessionLogEntry>;
};

type UserMeta = {
    id: string;
    info: {
        name: string;
        avatar?: string;
    };
};

type RoomEvent = {
    // type: "NOTIFICATION",
    // ...
};

type ThreadMetadata = {
    // ...
};

export const {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useStorage,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useMutation,
    useStatus,
    useLostConnectionListener,
    useThreads,
    useUser,
    useCreateThread,
    useEditThreadMetadata,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(client).suspense;
