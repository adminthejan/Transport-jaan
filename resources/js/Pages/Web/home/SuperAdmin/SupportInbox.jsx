import React, { useCallback, useEffect, useState } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import { MessageSquare } from "lucide-react";
import SideMenu from "../../components/SuperAdmin/Dashboard1/SideMenu";
import ChatThread from "../../../../Components/chat/ChatThread";
import ConversationList from "../../../../Components/chat/ConversationList";
import { POLL_LIST_MS, chatRoute } from "../../../../Components/chat/chatUtils";

/**
 * Platform support inbox: every client and vendor thread addressed to the
 * application team. Any SuperAdmin can read and answer any thread.
 */
const SupportInbox = ({ conversationId = null }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [activeId, setActiveId] = useState(conversationId);

    const load = useCallback(() => {
        axios
            .get(chatRoute("chat.conversations"))
            .then(({ data }) => {
                setConversations(data.conversations);
                setLoadError(false);
            })
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") load();
        }, POLL_LIST_MS);
        window.addEventListener("chat:changed", load);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("chat:changed", load);
        };
    }, [load]);

    const active = conversations.find((c) => c.id === activeId) || null;

    return (
        <>
            <Head title="Support Inbox" />
            <div className="flex flex-row bg-[#081028] min-h-screen poppins">
                <div className="sm:w-full md:w-auto lg:w-auto">
                    <SideMenu />
                </div>

                <div className="flex flex-col w-full px-12 py-8">
                    <h1 className="text-white text-[24px] mb-1">Support Inbox</h1>
                    <p className="text-[#AEB9E1] text-[14px] mb-5">
                        Messages from clients and vendors. Replies are sent as “Support” and any admin can answer.
                    </p>

                    {loadError && (
                        <p role="alert" className="mb-3 text-sm text-red-400">
                            Could not refresh conversations. Retrying…
                        </p>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex h-[72vh] min-h-[460px]">
                        <div
                            className={`${
                                active ? "hidden md:block" : "block"
                            } w-full md:w-[340px] md:border-r border-gray-100 overflow-y-auto shrink-0`}
                        >
                            <ConversationList
                                conversations={conversations}
                                activeId={activeId}
                                loading={loading}
                                onSelect={(c) => setActiveId(c.id)}
                                emptyText="No support messages yet. They will appear here when a client or vendor writes in."
                            />
                        </div>

                        <div className={`${active ? "flex" : "hidden md:flex"} flex-1 min-w-0`}>
                            {active ? (
                                <ChatThread
                                    key={active.id}
                                    conversation={active}
                                    showSenderName
                                    onBack={() => setActiveId(null)}
                                    showBack
                                    className="flex-1"
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                                    <MessageSquare className="w-10 h-10" />
                                    <p className="text-sm">Select a conversation</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SupportInbox;
