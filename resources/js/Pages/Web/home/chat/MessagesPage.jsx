import React, { useCallback, useEffect, useState } from "react";
import { chatRoute } from "@/Components/chat/chatUtils";
import { Head } from "@inertiajs/react";
import axios from "axios";
import { MessageSquare } from "lucide-react";
import ClientHeader from "../client/ClientHeader";
import VendorShellLayout from "../../../../Components/vendors/VendorShellLayout";
import ChatThread from "../../../../Components/chat/ChatThread";
import ConversationList from "../../../../Components/chat/ConversationList";
import { POLL_LIST_MS } from "../../../../Components/chat/chatUtils";

const SERVICES = [
    "All Bookings",
    "Vehicle Rental",
    "Ticket Booking",
    "Courier Service",
    "Warehousing",
    "Freight",
];

const rememberedService = () => {
    try {
        const saved = localStorage.getItem("vendorActiveService");
        return SERVICES.includes(saved) ? saved : "Vehicle Rental";
    } catch {
        return "Vehicle Rental";
    }
};

/**
 * Full inbox, shared by both roles:
 *  - client: all of their vendor conversations
 *  - vendor (and vendor team): every client who has written to them
 */
const Inbox = ({ side, conversationId }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(conversationId || null);
    const [loadError, setLoadError] = useState(false);

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
        <div className="p-4 md:p-6">
            <h1 className="text-[22px] font-[700] text-gray-900 mb-1">Messages</h1>
            <p className="text-sm text-gray-500 mb-4">
                {side === "vendor"
                    ? "Conversations with your clients."
                    : "Your conversations with vendors."}
            </p>

            {loadError && (
                <p role="alert" className="mb-3 text-sm text-red-600">
                    Could not refresh conversations. Retrying…
                </p>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex h-[72vh] min-h-[460px]">
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
                        emptyText={
                            side === "vendor"
                                ? "No client messages yet. They will appear here when a client contacts you."
                                : "No conversations yet. Use “Chat with vendor” on a vehicle or warehouse page to start one."
                        }
                    />
                </div>

                <div className={`${active ? "flex" : "hidden md:flex"} flex-1 min-w-0`}>
                    {active ? (
                        <ChatThread
                            key={active.id}
                            conversation={active}
                            showSenderName={side === "vendor"}
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
    );
};

const MessagesPage = ({ side, conversationId }) => {
    if (side === "vendor") {
        return (
            <VendorShellLayout activeService={rememberedService()}>
                <Head title="Messages" />
                <Inbox side={side} conversationId={conversationId} />
            </VendorShellLayout>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F8FB]">
            <Head title="Messages" />
            <ClientHeader />
            <div className="max-w-[1200px] mx-auto">
                <Inbox side={side} conversationId={conversationId} />
            </div>
        </div>
    );
};

export default MessagesPage;
