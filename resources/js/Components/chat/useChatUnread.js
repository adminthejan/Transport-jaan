import { useEffect, useState } from "react";
import axios from "axios";
import { POLL_UNREAD_MS } from "./chatUtils";

/** Polls the unread-message count while the tab is visible. */
export default function useChatUnread(enabled = true) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled) return undefined;
        let cancelled = false;

        const load = () => {
            if (document.visibilityState !== "visible") return;
            axios
                .get(route("chat.unread"))
                .then(({ data }) => !cancelled && setCount(Number(data?.count) || 0))
                .catch(() => {});
        };

        load();
        const timer = window.setInterval(load, POLL_UNREAD_MS);
        document.addEventListener("visibilitychange", load);
        window.addEventListener("chat:changed", load);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", load);
            window.removeEventListener("chat:changed", load);
        };
    }, [enabled]);

    return count;
}
