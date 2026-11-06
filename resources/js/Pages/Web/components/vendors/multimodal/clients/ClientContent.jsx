import React from "react";
import { usePage } from "@inertiajs/react";
import search from "../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";

import ClientTable from "./ClientTable";

import UserDropdown from "../../UserDropdown";

const ClientContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;

    return (
        <div className="w-full h-auto px-5 lg:px-0 lg:pr-5 py-5 lg:py-10">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row gap-5 justify-between lg:items-start items-center">
                <h1 className="figtree text-[24px] sm:text-[35px] font-[700]">
                    Multimodal Clients
                </h1>
                <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("multimodal.settingsPage")} />
                </div>
            </div>
            {/* end of header section */}

            <div
                className="w-auto h-auto bg-[#FFFFFF] rounded-[10px] mt-10 px-4 sm:px-10 py-10"
                style={{
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                }}
            >
                <ClientTable />
            </div>
        </div>
    );
};

export default ClientContent;
