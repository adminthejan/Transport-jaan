// resources/js/Pages/Web/components/vendors/clients/ClientContent.jsx
import React, { useState, useEffect, useRef } from "react";
import { usePage, Link } from "@inertiajs/react";

import bell from "../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../assets/vendors/dashboard/proPic.svg";
import logOutLogo from "../../../assets/vendors/dashboard/logOutLogo.svg"; // ← NEW

import NotificationDropdown from "../NotificationDropdown";
import ClientTable from "./ClientTable";

import UserDropdown from "../../../components/vendors/UserDropdown.jsx";

const ClientContent = () => {
    const { auth, unreadNotifications = 0, clients: clientsData } = usePage().props;
    const user = auth?.user;


    return (
        <div className="flex flex-col gap-10 w-full h-auto px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* ==================== HEADER WITH NOTIFICATION + DROPDOWN ==================== */}
            <div className="flex flex-col sm:flex-row gap-5 justify-between lg:items-start items-center">
                <h1 className="figtree text-[25px] sm:text-[35px] font-[700]">Vehicle Rental Clients</h1>
{/* 
                <div className="flex flex-row gap-3 sm:gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("settingsPage")} />
                </div> */}
            </div>

            {/* ==================== CLIENT TABLE ==================== */}
            <div
                className="w-auto h-auto bg-[#FFFFFF] rounded-[10px] mt-10 px-10 py-10"
                style={{
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                }}
            >
                 <div className="flex flex-row gap-3 sm:gap-5 relative items-center ml-100">
                    </div>
                <ClientTable />
            </div>
        </div>
    );
};

export default ClientContent;
