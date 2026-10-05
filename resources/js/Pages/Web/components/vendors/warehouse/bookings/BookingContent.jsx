import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import WarehouseBookingService from "../../../../../../services/WarehouseBookingService";


import search from "../../../../assets/vendors/dashboard/searchIcon.svg";
import filterIcon from "../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import upArrow from "../../../../assets/vendors/dashboard/icons/upArrow.svg";

import icon1 from "../../../../assets/vendors/booking/icons/icon1.svg";
import icon2 from "../../../../assets/vendors/booking/icons/icon2.svg";
import icon3 from "../../../../assets/vendors/booking/icons/icon3.svg";
import icon4 from "../../../../assets/vendors/booking/icons/icon4.svg";

import UserDropdown from "../../UserDropdown";
import NotificationDropdown from "../NotificationDropdown";

const BookingContent = () => {
  const { auth } = usePage().props;
  const user = auth?.user;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const paymentStatusColors = {
    Paid: { color: "#3B8F31", bg: "#ACE199" },
    Pending: { color: "#FF60608C", bg: "#FF60608C" },
  };

  const statusColors = {
    Ongoing: { bg: "#FFCD29", text: "#000000" },
    Returned: { bg: "#3B8F31", text: "#FFCD29" },
  };

  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    upcoming_bookings: 0,
    pending_bookings: 0,
    cancelled_bookings: 0,
    completed_bookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    warehouseType: "",
    status: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseNotifications, setWarehouseNotifications] = useState([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const isVerified = user?.status === 'verified' || user?.status === 'Verified';

  // Fetch bookings and stats
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bookingsRes, statsRes] = await Promise.all([
          WarehouseBookingService.getBookings({ page: 1, per_page: 10 }),
          WarehouseBookingService.getBookingStats(),
        ]);

        if (!isMounted) return;

        if (bookingsRes?.success) {
          const formatted = (bookingsRes.data || []).map((b) =>
            WarehouseBookingService.formatBookingForDisplay(b)
          );
          setBookings(formatted);
        } else {
          setBookings([]);
          setError(bookingsRes?.message || "Failed to load bookings");
        }

        if (statsRes?.success) {
          setStats({
            upcoming_bookings: statsRes.data?.upcoming_bookings ?? 0,
            pending_bookings: statsRes.data?.pending_bookings ?? 0,
            cancelled_bookings: statsRes.data?.cancelled_bookings ?? 0,
            completed_bookings: statsRes.data?.completed_bookings ?? 0,
          });
        } else {
          setStats({
            upcoming_bookings: 0,
            pending_bookings: 0,
            cancelled_bookings: 0,
            completed_bookings: 0,
          });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError("Failed to load booking data");
        setBookings([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => (prev.search === searchTerm ? prev : { ...prev, search: searchTerm }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth?.user) return;

      try {
        const response = await fetch('/vendors/warehouse/notifications/data');
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

  const handleWarehouseTypeChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => (prev.warehouseType === value ? prev : { ...prev, warehouseType: value }));
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => (prev.status === value ? prev : { ...prev, status: value }));
  };

  const warehouseTypeOptions = [
    { value: "", label: "All warehouse types" },
    { value: "general_warehouse", label: "General Warehouse" },
    { value: "bonded_warehouse", label: "Bonded Warehouse" },
    { value: "cold_storage", label: "Cold Storage" },
    { value: "distribution_center", label: "Distribution Center" },
    { value: "fulfillment_center", label: "Fulfillment Center" },
    { value: "smart_warehouse", label: "Smart Warehouse" },
];

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
      {/* Header section */}
      <div className="flex md:flex-row flex-col gap-5 justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="figtree text-[24px] md:text-[30px] font-[700] text-center md:text-left md:mt-0">
            Warehouse Bookings
          </h1>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <NotificationDropdown
            notifications={warehouseNotifications}
            unreadCount={notificationUnreadCount}
          />
          <UserDropdown settingsRoute={route("warehouse.settingsPage")} />
        </div>
      </div>
      {/* end of header section */}

      <div className="flex flex-col gap-5 py-10">
        <div className="flex flex-col gap-5">
          <div className="flex xl:flex-row flex-col gap-5 xl:w-full">
            {[{ icon: icon1, label: "Upcoming", value: stats.upcoming_bookings },
            { icon: icon2, label: "Pending", value: stats.pending_bookings }].map((card, idx) => (
              <div
                key={idx}
                className="xl:w-[600px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                style={{ boxShadow: "4px 4px 4px #0000001A" }}
              >
                <div className="flex flex-row gap-5 justify-center items-center">
                  <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                    <img src={card.icon} alt={card.label} />
                  </div>
                  <div>
                    <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">{card.label} Bookings</h1>
                    <h1 className="text-[22px] md:text-[26px] font-[700]">{card.value}</h1>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                  <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                    <img src={upArrow} alt="Increase" className="w-[19px] h-[19px]" />
                    <h1>+2.86%</h1>
                  </div>
                  <h1 className="text-[#7B7B7A]">from last week</h1>
                </div>
              </div>
            ))}
          </div>

          <div className="flex xl:flex-row flex-col gap-5 w-full">
            {[{ icon: icon3, label: "Cancelled", value: stats.cancelled_bookings },
            { icon: icon4, label: "Completed", value: stats.completed_bookings }].map((card, idx) => (
              <div
                key={idx}
                className="xl:w-[600px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                style={{ boxShadow: "4px 4px 4px #0000001A" }}
              >
                <div className="flex flex-row gap-5 justify-center items-center">
                  <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                    <img src={card.icon} alt={card.label} />
                  </div>
                  <div>
                    <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">{card.label} Bookings</h1>
                    <h1 className="text-[22px] md:text-[26px] font-[700]">{card.value}</h1>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                  <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                    <img src={upArrow} alt="Increase" className="w-[19px] h-[19px]" />
                    <h1>+2.86%</h1>
                  </div>
                  <h1 className="text-[#7B7B7A]">from last week</h1>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart and Table */}
        <div className="flex flex-col xl:flex-row gap-5">
          <div
            className="flex-1 bg-white rounded-[10px] min-h-[400px] flex items-center justify-center"
            style={{ boxShadow: "4px 4px 4px #0000001A" }}
          >
            <div className="text-center text-gray-600">Chart coming soon...</div>
          </div>

          <div
            className="flex-1 bg-white rounded-[10px] py-5 px-5"
            style={{ boxShadow: "4px 4px 4px #0000001A" }}
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-5">
              <div className="flex items-center gap-2 w-full md:w-[70%] bg-[#F3F3F3] rounded-[6px] px-3 py-2">
                <img src={miniSearchIcon} alt="Search" />
                <input
                  type="text"
                  placeholder="Search client, warehouse, purpose..."
                  className="w-full bg-transparent outline-none text-[14px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 w-full md:flex-row md:gap-2 md:w-auto">
                <select
                  value={filters.warehouseType}
                  onChange={handleWarehouseTypeChange}
                  className="bg-[#F3F3F3] text-[14px] rounded-[6px] px-3 py-2  pr-8 w-full md:w-auto"
                >
                  {warehouseTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={handleStatusChange}
                  className="bg-[#F3F3F3] text-[14px] rounded-[6px] px-3 py-2 w-full md:w-auto"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-600">Loading bookings...</div>
            ) : (
              <>
                {error && <div className="text-red-600 text-center mb-3">{error}</div>}
                <div className="text-center py-10 text-gray-600">Bookings table coming soon...</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingContent;
