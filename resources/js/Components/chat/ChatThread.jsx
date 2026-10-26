import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar } from "./ConversationList";
import { POLL_THREAD_MS, dayLabel, errorMessage, formatTime, chatRoute } from "./chatUtils";

const MAX_LENGTH = 2000;

/**
 * One conversation: history, live polling, and the composer.
 * Used by both the client widget and the full Messages page.
 */
const ChatThread = ({ conversation, onBack, showBack = true, showSenderName = false, className = "" }) => {
    const [messages, setMessages] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const scrollerRef = useRef(null);
    const stickToBottom = useRef(true);
    const pendingScrollRestore = useRef(null);
    const lastIdRef = useRef(0);
    const conversationId = conversation.id;

    const merge = useCallback((incoming) => {
        if (!incoming.length) return;
        setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = incoming.filter((m) => !seen.has(m.id));
            if (!fresh.length) return prev;
            const next = [...prev, ...fresh].sort((a, b) => a.id - b.id);
            lastIdRef.current = next[next.length - 1].id;
            return next;
        });
    }, []);

    const markRead = useCallback(() => {
        axios
            .post(chatRoute("chat.read", { conversation: conversationId }))
            .then(() => window.dispatchEvent(new Event("chat:changed")))
            .catch(() => {});
    }, [conversationId]);

    // Initial load (and reset when switching conversations)
    useEffect(() => {
        let cancelled = false;
        setMessages([]);
        setHasMore(false);
        setError("");
        setLoading(true);
        lastIdRef.current = 0;
        stickToBottom.current = true;

        axios
            .get(chatRoute("chat.messages", { conversation: conversationId }))
            .then(({ data }) => {
                if (cancelled) return;
                setMessages(data.messages);
                setHasMore(Boolean(data.has_more));
                lastIdRef.current = data.messages.length ? data.messages[data.messages.length - 1].id : 0;
                if (data.messages.some((m) => !m.mine && !m.read)) markRead();
            })
            .catch((err) => !cancelled && setError(errorMessage(err, "Could not load messages.")))
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [conversationId, markRead]);

    // Live polling for new messages
    useEffect(() => {
        const tick = () => {
            if (document.visibilityState !== "visible") return;
            axios
                .get(chatRoute("chat.messages", { conversation: conversationId }), {
                    params: { after_id: lastIdRef.current },
                })
                .then(({ data }) => {
                    if (!data.messages.length) return;
                    merge(data.messages);
                    if (data.messages.some((m) => !m.mine)) markRead();
                })
                .catch(() => {});
        };
        const timer = window.setInterval(tick, POLL_THREAD_MS);
        return () => window.clearInterval(timer);
    }, [conversationId, merge, markRead]);

    // Keep the view pinned to the newest message unless the user scrolled up
    useLayoutEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        if (pendingScrollRestore.current !== null) {
            el.scrollTop = el.scrollHeight - pendingScrollRestore.current;
            pendingScrollRestore.current = null;
        } else if (stickToBottom.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, loading]);

    const onScroll = () => {
        const el = scrollerRef.current;
        if (!el) return;
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    const loadOlder = () => {
        if (loadingOlder || !messages.length) return;
        setLoadingOlder(true);
        axios
            .get(chatRoute("chat.messages", { conversation: conversationId }), {
                params: { before_id: messages[0].id },
            })
            .then(({ data }) => {
                // Remember how far from the bottom we were so the view doesn't jump
                pendingScrollRestore.current = scrollerRef.current?.scrollHeight ?? 0;
                setHasMore(Boolean(data.has_more));
                setMessages((prev) => {
                    const seen = new Set(prev.map((m) => m.id));
                    return [...data.messages.filter((m) => !seen.has(m.id)), ...prev];
                });
            })
            .catch((err) => setError(errorMessage(err, "Could not load older messages.")))
            .finally(() => setLoadingOlder(false));
    };

    const send = async () => {
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        setError("");
        try {
            const { data } = await axios.post(chatRoute("chat.send", { conversation: conversationId }), { body });
            stickToBottom.current = true;
            merge([data.message]);
            setText("");
            window.dispatchEvent(new Event("chat:changed"));
        } catch (err) {
            setError(errorMessage(err, "Message not sent. Please try again."));
        } finally {
            setSending(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
        }
    };

    let lastDay = null;

    return (
        <div className={`flex flex-col min-h-0 bg-white ${className}`}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
                {showBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                        aria-label="Back to conversations"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <Avatar name={conversation.other_party.name} image={conversation.other_party.image} size={36} />
                <div className="min-w-0">
                    <p className="text-[14px] font-[700] text-gray-900 truncate">{conversation.other_party.name}</p>
                    {conversation.context_label && (
                        <p className="text-[11px] text-[#0955AC] truncate">Re: {conversation.context_label}</p>
                    )}
                </div>
            </div>

            <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-3 bg-[#F6F8FB] space-y-1.5"
            >
                {hasMore && (
                    <div className="text-center pb-2">
                        <button
                            type="button"
                            onClick={loadOlder}
                            disabled={loadingOlder}
                            className="text-[12px] font-[600] text-[#0955AC] hover:underline disabled:opacity-50"
                        >
                            {loadingOlder ? "Loading…" : "Load earlier messages"}
                        </button>
                    </div>
                )}

                {loading && <p className="text-center text-sm text-gray-400 py-6">Loading…</p>}

                {!loading && messages.length === 0 && !error && (
                    <p className="text-center text-sm text-gray-400 py-10">No messages yet. Say hello!</p>
                )}

                {messages.map((m) => {
                    const day = dayLabel(m.created_at);
                    const showDay = day !== lastDay;
                    lastDay = day;
                    return (
                        <React.Fragment key={m.id}>
                            {showDay && (
                                <div className="text-center py-1">
                                    <span className="text-[11px] text-gray-400 bg-white px-2.5 py-0.5 rounded-full border border-gray-100">
                                        {day}
                                    </span>
                                </div>
                            )}
                            <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] shadow-sm ${
                                        m.mine
                                            ? "bg-[#0955AC] text-white rounded-br-md"
                                            : "bg-white text-gray-800 border border-gray-100 rounded-bl-md"
                                    }`}
                                >
                                    {/* Vendor teammates share one inbox, so show who replied */}
                                    {showSenderName && m.mine && m.sender_name && (
                                        <p className="text-[10px] opacity-70 mb-0.5">{m.sender_name}</p>
                                    )}
                                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                    <p
                                        className={`text-[10px] mt-1 text-right ${
                                            m.mine ? "text-white/70" : "text-gray-400"
                                        }`}
                                    >
                                        {formatTime(m.created_at)}
                                    </p>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {error && (
                <p role="alert" className="px-4 py-2 text-[12px] text-red-600 bg-red-50 border-t border-red-100">
                    {error}
                </p>
            )}

            <div className="p-3 border-t border-gray-100 shrink-0 bg-white">
                <div className="flex items-end gap-2">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                        onKeyDown={onKeyDown}
                        rows={1}
                        placeholder="Type a message…"
                        aria-label="Message"
                        className="flex-1 resize-none max-h-28 rounded-xl border border-gray-200 px-3 py-2 text-[14px] focus:border-[#0955AC] focus:ring-1 focus:ring-[#0955AC] outline-none"
                    />
                    <button
                        type="button"
                        onClick={send}
                        disabled={sending || !text.trim()}
                        aria-label="Send message"
                        className="h-10 w-10 shrink-0 rounded-full bg-[#0955AC] text-white flex items-center justify-center hover:bg-[#074494] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                {text.length > MAX_LENGTH - 200 && (
                    <p className="text-[11px] text-gray-400 mt-1 text-right">
                        {text.length}/{MAX_LENGTH}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ChatThread;
