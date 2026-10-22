import React from "react";
import { router, usePage } from "@inertiajs/react";
import { MessageCircle } from "lucide-react";
import { openVendorChat } from "./chatUtils";

/**
 * "Chat with vendor" entry point for item pages.
 * contextType: "vehicle" | "warehouse"; contextId: that item's id.
 * Hidden for vendors / team members (they reply from their inbox instead).
 */
const ChatWithVendorButton = ({ contextType, contextId, vendorId, className = "", label = "Chat with vendor" }) => {
    const { auth } = usePage().props;
    const user = auth?.user;

    if (user && (user.role !== "client" || user.team_membership_role)) return null;
    if (!contextId && !vendorId) return null;

    const onClick = () => {
        if (!user) {
            router.visit("/signin");
            return;
        }
        openVendorChat({ contextType, contextId, vendorId });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={
                className ||
                "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border-2 border-[#0955AC] text-[#0955AC] text-[14px] font-[600] hover:bg-[#0955AC] hover:text-white transition-colors"
            }
        >
            <MessageCircle className="w-4 h-4" />
            {label}
        </button>
    );
};

export default ChatWithVendorButton;
