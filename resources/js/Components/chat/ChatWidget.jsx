import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePage } from "@inertiajs/react";
import axios from "axios";
import { ExternalLink, MessageCircle, X } from "lucide-react";
import ChatThread from "./ChatThread";
import ConversationList from "./ConversationList";
import useChatUnread from "./useChatUnread";
import { POLL_LIST_MS, errorMessage } from "./chatUtils";

/**
 * Floating chat box for clients. Mounted once by ClientHeader, so it follows
 * the client across every booking page. Pages (vehicle / warehouse details)
 * open a specific vendor thread through openVendorChat() -> "chat:open".
 */
const ChatWidget = () => {
    const { auth } = usePage().props;
    // Vendor team members also carry role "client", but chat from the vendor inbox.
    const isClient = auth?.user?.role === "client" && !auth?.user?.team_membership_role;
    const onMessagesPage = typeof window !== "undefined" && window.location.pathname === "/chat";
    const enabled = isClient && !onMessagesPage;

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [notice, setNotice] = useState("");
    const unread = useChatUnread(enabled);

    const loadList = useCallback(() => {
        axios
            .get(route("chat.conversations"))
            .then(({ data }) => setConversations(data.conversations))
            .catch(() => {})
            .finally(() => setLoadingList(false));
    }, []);

    // Refresh the list while the panel is open on the list view
    useEffect(() => {
        if (!enabled || !open || active) return undefined;
        setLoadingList(true);
        loadList();
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") loadList();
        }, POLL_LIST_MS);
        return () => window.clearInterval(timer);
    }, [enabled, open, active, loadList]);

    // Page-level "Chat with vendor" buttons
    useEffect(() => {
        if (!enabled) return undefined;
        const onOpen = async (e) => {
            const { contextType, contextId, vendorId } = e.detail || {};
            setOpen(true);
            setNotice("");
            try {
                const { data } = await axios.post(route("chat.conversations.start"), {
                    context_type: contextType || null,
                    context_id: contextId || null,
                    vendor_id: vendorId || null,
                });
                setActive(data.conversation);
            } catch (err) {
                setActive(null);
                setNotice(errorMessage(err, "Could not start the chat."));
            }
        };
        window.addEventListener("chat:open", onOpen);
        return () => window.removeEventListener("chat:open", onOpen);
    }, [enabled]);

    if (!enabled || typeof document === "undefined") return null;

    const close = () => {
        setOpen(false);
        setActive(null);
        setNotice("");
    };

    return createPortal(
        <div className="fixed bottom-5 right-5 z-[55] flex flex-col items-end gap-3 poppins">
            {open && (
                <div
                    role="dialog"
                    aria-label="Chat with vendors"
                    className="w-[calc(100vw-2.5rem)] sm:w-[380px] h-[min(560px,calc(100vh-7rem))] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
                >
                    {active ? (
                        <ChatThread
                            conversation={active}
                            onBack={() => {
                                setActive(null);
                                window.dispatchEvent(new Event("chat:changed"));
                            }}
                            className="flex-1"
                        />
                    ) : (
                        <>
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-[#0955AC] to-[#073E82] text-white shrink-0">
                                <p className="text-[15px] font-[700]">Messages</p>
                                <div className="flex items-center gap-1">
                                    <a
                                        href={route("chat.page")}
                                        className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                                        title="Open full inbox"
                                        aria-label="Open full inbox"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                            {notice && (
                                <p role="alert" className="px-4 py-2 text-[12px] text-red-600 bg-red-50">
                                    {notice}
                                </p>
                            )}
                            <div className="flex-1 overflow-y-auto">
                                <ConversationList
                                    conversations={conversations}
                                    activeId={null}
                                    loading={loadingList}
                                    onSelect={setActive}
                                    emptyText="No conversations yet. Use “Chat with vendor” on a vehicle or warehouse to start one."
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={() => (open ? close() : setOpen(true))}
                aria-label={open ? "Close chat" : "Open chat"}
                aria-expanded={open}
                className="relative h-14 w-14 rounded-full bg-[#0955AC] text-white shadow-xl hover:bg-[#074494] transition flex items-center justify-center"
            >
                {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                {!open && unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-[11px] font-[700] flex items-center justify-center border-2 border-white">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>
        </div>,
        document.body
    );
};

export default ChatWidget;
