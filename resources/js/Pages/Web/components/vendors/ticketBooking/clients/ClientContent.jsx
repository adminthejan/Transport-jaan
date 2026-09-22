import React, { useState, useRef, useEffect } from "react";
import { usePage, Link } from "@inertiajs/react";

import search from "../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";
import logOutLogo from "../../../../assets/vendors/dashboard/logOutLogo.svg"; // Added

import ClientTable from "./ClientTable";

import UserDropdown from "../../UserDropdown";

const ClientContent = () => {
    const { auth, server_error } = usePage().props;
    const user = auth?.user;
    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

    return (
        <div className="w-full h-auto px-5 py-10 mt-5 xl:mt-0 pt-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row gap-5 justify-between items-center">
                <h1 className="figtree text-[35px] font-[700]">
                    Ticket Booking Clients
                </h1>
                <div className="flex flex-row gap-5 relative items-center">
                    {/* <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
            <img src={search} alt="Search" />
          </div>
          <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
            <img src={settings} alt="Settings" />
          </div>
          <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
            <img src={bell} alt="Notifications" />
          </div> */}

                    {/* <div className="flex flex-row gap-5 relative items-center">
                        <UserDropdown settingsRoute={route("ticketBooking.settingsPage")} />
                    </div> */}
                </div>
            </div>
            {/* end of header section */}

            {server_error && (
                <div className="mt-6 w-full rounded-[10px] border border-[#FF0000] bg-[#FF00000D] px-5 py-4 text-[14px] font-[600] text-[#FF0000]">
                    {server_error}
                </div>
            )}

            <div
                className="w-auto h-auto bg-[#FFFFFF] rounded-[10px] mt-10 px-5 lg:px-10 py-10"
                style={{
                    boxShadow: "4px 4px 4px #0000001A",
                }}
            >
                <ClientTable />
            </div>
        </div>
    );
};

export default ClientContent;
