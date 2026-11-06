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

    const isVerified = user?.status === 'verified' || user?.status === 'Verified';



    return (
        <div className="w-full h-auto lg:pr-5  lg:pl-5 py-10 pt-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row gap-5 justify-between md:items-start items-center">
                <h1 className="figtree text-[28px] md:text-[35px] font-[700]">Freight Clients</h1>
                {/* <div className="flex flex-row gap-5">
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={search} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={settings} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={bell} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={proPic} />
                    </div>

                    <div className="figtree flex flex-col justify-center items-start">
                        <h1 className="text-[20px] font-[700]">{user?.name || 'Service Provider'}</h1>
                        <h1 className="text-[16px] font-[600] text-[#7B7B7A]">
                            Service Provider
                        </h1>
                    </div>
                </div> */}
                {/* <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("freight.settingsPage")} />
                </div> */}
            </div>
            {/* end of header section */}

            <div
                className="w-auto h-auto bg-[#FFFFFF] rounded-[10px] mt-5 md:mt-10 px-5 md:px-10 py-5 md:py-10"
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
