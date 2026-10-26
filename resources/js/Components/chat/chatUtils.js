export const POLL_THREAD_MS = 4000;
export const POLL_LIST_MS = 10000;
export const POLL_UNREAD_MS = 15000;

export const initialsOf = (name = "") =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "?";

export const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatListTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return formatTime(iso);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const dayLabel = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

export const errorMessage = (err, fallback = "Something went wrong. Please try again.") =>
    err?.response?.data?.message ||
    Object.values(err?.response?.data?.errors || {})?.[0]?.[0] ||
    fallback;

/** Ask the client chat widget to open a thread with a vendor. */
export const openVendorChat = ({ contextType, contextId, vendorId } = {}) => {
    window.dispatchEvent(
        new CustomEvent("chat:open", { detail: { contextType, contextId, vendorId } })
    );
};

// Fixed addresses of the chat routes (routes/web.php). If the page's Ziggy route list
// does not know a chat route (stale route cache, or frontend deployed before the
// backend), route() throws - and a throw during render or inside an effect blanks the
// whole app for every logged-in user. Falling back to the real URL keeps the page up.
const CHAT_PATHS = {
    "chat.page": "/chat",
    "chat.conversations": "/chat/conversations",
    "chat.conversations.start": "/chat/conversations",
    "chat.unread": "/chat/unread-count",
    "chat.messages": "/chat/conversations/{conversation}/messages",
    "chat.send": "/chat/conversations/{conversation}/messages",
    "chat.read": "/chat/conversations/{conversation}/read",
};

export const chatRoute = (name, params = {}) => {
    try {
        return route(name, params);
    } catch (e) {
        const template = CHAT_PATHS[name];
        if (!template) throw e;
        const path = template.replace("{conversation}", encodeURIComponent(params?.conversation ?? ""));
        return `${window.location.origin}${path}`;
    }
};
