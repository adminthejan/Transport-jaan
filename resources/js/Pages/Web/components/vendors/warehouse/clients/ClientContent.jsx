import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { API_BASE_URL } from "../../../../../../config/api";

import search from "../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";

import ClientTable from "./ClientTable";

import UserDropdown from "../../UserDropdown";
import NotificationDropdown from "../NotificationDropdown";

const ClientContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;
    const [warehouseNotifications, setWarehouseNotifications] = useState([]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!auth?.user) return;

            try {
                const response = await fetch(`${API_BASE_URL}vendors/warehouse/notifications/data`);
                if (response.ok) {
                    const data = await response.json();
                    setWarehouseNotifications(data.notifications || []);
                    setNotificationUnreadCount(data.unread_count || 0);
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        };

        if (auth?.user) {
            fetchNotifications();
            // Refresh notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [auth?.user]);

    return (
        <div className="w-full h-auto  lg:pl-5 lg:pr-5  pt-6 pb-12">
            {/* Header section */}
            <div className="flex md:flex-row flex-col gap-5 justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="figtree text-[24px] md:text-[30px] font-[700] text-center md:text-left md:mt-0">
                        Warehouse Clients
                    </h1>
                </div>
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
                {/* <div className="hidden lg:flex items-center gap-3">
                    <NotificationDropdown
                        notifications={warehouseNotifications}
                        unreadCount={notificationUnreadCount}
                    />
                    <UserDropdown settingsRoute={route("warehouse.settingsPage")} />
                </div> */}
            </div>
            {/* end of header section */}

            <div className="flex flex-col gap-5 py-10">
                <div
                    className="w-auto h-auto bg-[#FFFFFF] rounded-[10px] px-4 py-4"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
                >
                    <ClientTable />
                </div>
            </div>
        </div>
    );
};

export default ClientContent;
