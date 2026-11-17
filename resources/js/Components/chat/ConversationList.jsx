import React from "react";
import { Headset, MessageSquare } from "lucide-react";
import { formatListTime, initialsOf } from "./chatUtils";

export const Avatar = ({ name, image, size = 40 }) =>
    image ? (
        <img
            src={image}
            alt=""
            style={{ width: size, height: size }}
            className="rounded-full object-cover shrink-0"
        />
    ) : (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-[#0955AC] text-white flex items-center justify-center text-[13px] font-[700] shrink-0"
            aria-hidden="true"
        >
            {initialsOf(name)}
        </div>
    );

/**
 * Pinned entry for the thread with the platform team. Shown above the vendor
 * threads for clients and vendors; `support` is null until they first write.
 */
const SupportRow = ({ support, active, onOpen }) => (
    <li>
        <button
            type="button"
            onClick={onOpen}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors bg-[#F3F7FC] hover:bg-[#E8F0FA] ${
                active ? "bg-[#EEF3FA]" : ""
            }`}
        >
            <div className="w-10 h-10 rounded-full bg-[#0955AC] text-white flex items-center justify-center shrink-0">
                <Headset className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-[700] text-gray-900">Support</p>
                    {support?.last_message_at && (
                        <span className="text-[11px] text-gray-400 shrink-0">{formatListTime(support.last_message_at)}</span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] text-gray-500">
                        {support?.last_message
                            ? `${support.last_message.mine ? "You: " : ""}${support.last_message.body}`
                            : "Chat with our team about bookings, payments or your account"}
                    </p>
                    {support?.unread_count > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#0955AC] text-white text-[11px] font-[700] flex items-center justify-center shrink-0">
                            {support.unread_count > 99 ? "99+" : support.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </button>
    </li>
);

const ConversationList = ({
    conversations,
    activeId,
    onSelect,
    loading,
    emptyText,
    showSupport = false,
    support = null,
    onOpenSupport,
}) => {
    const supportRow = showSupport ? (
        <SupportRow support={support} active={support && activeId === support.id} onOpen={onOpenSupport} />
    ) : null;

    if (loading && conversations.length === 0 && !supportRow) {
        return <div className="p-6 text-center text-sm text-gray-400">Loading…</div>;
    }

    if (conversations.length === 0) {
        return (
            <div>
                {supportRow && <ul className="divide-y divide-gray-100 border-b border-gray-100">{supportRow}</ul>}
                <div className="p-8 flex flex-col items-center text-center text-gray-400 gap-2">
                    <MessageSquare className="w-8 h-8" />
                    <p className="text-sm">{loading ? "Loading…" : emptyText}</p>
                </div>
            </div>
        );
    }

    return (
        <ul className="divide-y divide-gray-100">
            {supportRow}
            {conversations.map((c) => (
                <li key={c.id}>
                    <button
                        type="button"
                        onClick={() => onSelect(c)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F3F7FC] ${
                            activeId === c.id ? "bg-[#EEF3FA]" : ""
                        }`}
                    >
                        <Avatar name={c.other_party.name} image={c.other_party.image} />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p
                                    className={`truncate text-[14px] ${
                                        c.unread_count ? "font-[700] text-gray-900" : "font-[600] text-gray-800"
                                    }`}
                                >
                                    {c.other_party.name}
                                </p>
                                <span className="text-[11px] text-gray-400 shrink-0">
                                    {formatListTime(c.last_message_at)}
                                </span>
                            </div>
                            {c.context_label && (
                                <p className="truncate text-[11px] text-[#0955AC]">{c.context_label}</p>
                            )}
                            <div className="flex items-center justify-between gap-2">
                                <p
                                    className={`truncate text-[12px] ${
                                        c.unread_count ? "text-gray-800 font-[600]" : "text-gray-500"
                                    }`}
                                >
                                    {c.last_message
                                        ? `${c.last_message.mine ? "You: " : ""}${c.last_message.body}`
                                        : "No messages yet"}
                                </p>
                                {c.unread_count > 0 && (
                                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#0955AC] text-white text-[11px] font-[700] flex items-center justify-center shrink-0">
                                        {c.unread_count > 99 ? "99+" : c.unread_count}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                </li>
            ))}
        </ul>
    );
};

export default ConversationList;
