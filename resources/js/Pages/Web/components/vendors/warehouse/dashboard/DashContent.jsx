import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePage } from "@inertiajs/react";
import {
    Search,
    Settings,
    Bell,
    DollarSign,
    CalendarDays,
    Filter,
    ChevronDown,
    ChevronUp,
    ArrowUp,
    Clock,
    Building2,
    Package,
    Boxes,
    Users,
    RefreshCw,
    AlertCircle,
    Download,
    ChevronDown as DropdownIcon,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import axios from "axios";
import { API_BASE_URL } from "../../../../../../config/api";
import { PieChart, Pie, Cell } from "recharts";


import UserDropdown from "../../UserDropdown";
import NotificationDropdown from "../NotificationDropdown";

const DashContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isVerified = user?.status === 'verified' || user?.status === 'Verified';
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // State management
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Dashboard data state
    const [dashboardStats, setDashboardStats] = useState({
        totalRevenue: "LKR 0",
        activeBookings: 0,
        occupiedUnits: "0 Units",
        totalUnits: "0 Units",
        revenueChange: "+0%",
        bookingsChange: "+0%",
        occupiedChange: "+0%",
        unitsChange: "+0%",
    });

    const [warehouseNotifications, setWarehouseNotifications] = useState([]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

    const [chartData, setChartData] = useState({
        bookingOverview: [],
        earningSummary: [],
        warehouseStatus: [],
    });

    const [bookings, setBookings] = useState([]);
    const [allBookings, setAllBookings] = useState([]); // Store all bookings for filtering
    const [unitTypes, setUnitTypes] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState("Last 8 months");
    const [statusFilter, setStatusFilter] = useState("This Week");
    const [activeFilter, setActiveFilter] = useState("all");

    // Warehouse bookings filter state
    const [showWarehouseFilters, setShowWarehouseFilters] = useState(false);
    const [showWarehouseExportMenu, setShowWarehouseExportMenu] = useState(false);
    const [warehouseSearchQuery, setWarehouseSearchQuery] = useState("");
    const [warehouseStatusFilter, setWarehouseStatusFilter] = useState("All");
    const [warehousePaymentFilter, setWarehousePaymentFilter] = useState("All");
    const [warehouseDateFromFilter, setWarehouseDateFromFilter] = useState("");
    const [warehouseDateToFilter, setWarehouseDateToFilter] = useState("");
    const warehouseExportMenuRef = useRef(null);

    // Warehouse pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Real-time update state
    const autoRefresh = true;
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [liveMode, setLiveMode] = useState(false);
    const updateInterval = 30000; // 30 seconds
    const [notifications, setNotifications] = useState([]);
    const [realtimeStats, setRealtimeStats] = useState(null);

    // Unit availability form state
    const [availabilityForm, setAvailabilityForm] = useState({
        unitType: "",
        date: "",
        time: "",
    });

    const calculateChange = useCallback((oldValue, newValue) => {
        if (!oldValue || oldValue === 0) return "+0%";
        const change = ((newValue - oldValue) / oldValue) * 100;
        const sign = change >= 0 ? "+" : "";
        return `${sign}${change.toFixed(1)}%`;
    }, []);

    const showNotification = useCallback((message, type = "info") => {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date(),
        };
        setNotifications((prev) => [...prev.slice(-4), notification]);

        setTimeout(() => {
            setNotifications((prev) =>
                prev.filter((n) => n.id !== notification.id)
            );
        }, 5000);
    }, []);

    const playNotificationSound = useCallback(() => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const context = new AudioCtx();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.frequency.setValueAtTime(800, context.currentTime);
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                context.currentTime + 0.3
            );

            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.3);
        } catch (error) {
            console.log("Audio not supported");
        }
    }, []);

    // Warehouse pagination functions
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getPageNumbers = () => {
        if (totalPages <= 4) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (currentPage <= 2) {
            return [1, 2, 3, 4];
        }

        if (currentPage >= totalPages - 1) {
            return [totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
    };

    // Calculate pagination values
    const totalPages = Math.max(1, Math.ceil(bookings.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    // Reset to first page when bookings change
    useEffect(() => {
        setCurrentPage(1);
    }, [bookings]);

    // Reset to first page when items per page changes
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    // Adjust current page if it exceeds total pages
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const applyCurrentFilters = useCallback(
        (bookingsData) => {
            let filtered = bookingsData;

            if (activeFilter !== "all") {
                switch (activeFilter) {
                    case "active":
                        filtered = filtered.filter((b) =>
                            ["confirmed", "active"].includes(b.status)
                        );
                        break;
                    case "pending":
                        filtered = filtered.filter(
                            (b) => b.status === "pending"
                        );
                        break;
                    case "completed":
                        filtered = filtered.filter(
                            (b) => b.status === "completed"
                        );
                        break;
                    case "cancelled":
                        filtered = filtered.filter(
                            (b) => b.status === "cancelled"
                        );
                        break;
                    default:
                        break;
                }
            }

            if (searchQuery.trim()) {
                const searchTerm = searchQuery.toLowerCase();
                filtered = filtered.filter(
                    (booking) =>
                        booking.contact_person
                            ?.toLowerCase()
                            .includes(searchTerm) ||
                        booking.company_name
                            ?.toLowerCase()
                            .includes(searchTerm) ||
                        booking.email?.toLowerCase().includes(searchTerm) ||
                        booking.phone?.includes(searchTerm) ||
                        booking.booking_reference
                            ?.toLowerCase()
                            .includes(searchTerm) ||
                        booking.status?.toLowerCase().includes(searchTerm)
                );
            }

            // Apply warehouse-specific filters
            if (warehouseSearchQuery.trim()) {
                const searchTerm = warehouseSearchQuery.toLowerCase();
                filtered = filtered.filter(
                    (booking) =>
                        booking.booking_reference?.toLowerCase().includes(searchTerm) ||
                        booking.contact_person?.toLowerCase().includes(searchTerm) ||
                        booking.company_name?.toLowerCase().includes(searchTerm)
                );
            }

            if (warehouseStatusFilter !== "All") {
                filtered = filtered.filter(
                    (booking) => booking.status?.toLowerCase() === warehouseStatusFilter.toLowerCase()
                );
            }

            if (warehousePaymentFilter !== "All") {
                filtered = filtered.filter(
                    (booking) => booking.payment_status?.toLowerCase() === warehousePaymentFilter.toLowerCase()
                );
            }

            if (warehouseDateFromFilter) {
                const fromDate = new Date(warehouseDateFromFilter);
                filtered = filtered.filter(
                    (booking) => new Date(booking.start_date) >= fromDate
                );
            }

            if (warehouseDateToFilter) {
                const toDate = new Date(warehouseDateToFilter);
                filtered = filtered.filter(
                    (booking) => new Date(booking.start_date) <= toDate
                );
            }

            setBookings(filtered);
        },
        [activeFilter, searchQuery, warehouseSearchQuery, warehouseStatusFilter, warehousePaymentFilter, warehouseDateFromFilter, warehouseDateToFilter]
    );

    // Fetch dashboard statistics with real-time updates
    const fetchDashboardStats = useCallback(
        async (silent = false) => {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}vendors/warehouse/api/bookings/stats`,
                    {
                        params: { timestamp: Date.now() },
                    }
                );
                if (response.data.success) {
                    const stats = response.data.data;
                    const newStats = {
                        totalRevenue: `LKR ${(
                            stats.completed_bookings * 1200
                        ).toLocaleString()}`,
                        activeBookings:
                            stats.pending_bookings + stats.upcoming_bookings,
                        occupiedUnits: `${stats.upcoming_bookings} Units`,
                        totalUnits: `${stats.total_units ?? 0} Units`,
                        revenueChange: calculateChange(
                            dashboardStats.activeBookings,
                            stats.pending_bookings + stats.upcoming_bookings
                        ),
                        bookingsChange: "+8.3%",
                        occupiedChange: "+5.2%",
                        unitsChange: "+2.1%",
                    };

                    if (
                        silent &&
                        JSON.stringify(newStats) !==
                        JSON.stringify(dashboardStats)
                    ) {
                        showNotification("Dashboard stats updated", "success");
                    }

                    setDashboardStats(newStats);
                    setRealtimeStats(stats);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
                if (!silent) {
                    showNotification("Failed to load dashboard statistics", "error");
                }
            }
        },
        [calculateChange, showNotification, dashboardStats]
    );

    // Fetch chart data with real-time updates
    const fetchChartData = useCallback(
        async (silent = false) => {
            try {
                if (!silent) setIsSearching(true);
                const response = await axios.get(
                    `${API_BASE_URL}vendors/warehouse/api/bookings/chart-data`,
                    {
                        params: {
                            period: selectedPeriod,
                            timestamp: Date.now(),
                        },
                    }
                );
                if (response.data.success) {
                    // Transform the API data to match chart component format
                    const transformedData = response.data.data.map((item) => ({
                        name: item.name,
                        bookings: (item.done || 0) + (item.cancelled || 0),
                        confirmed: item.done || 0,
                        pending: 0, // API doesn't provide pending separately
                        cancelled: item.cancelled || 0,
                    }));

                    // Calculate earnings based on bookings (assuming $1500 per confirmed booking)
                    const earnings = response.data.data.map((item) => ({
                        month: item.name,
                        earnings: (item.done || 0) * 1500,
                    }));

                    setChartData((prev) => ({
                        ...prev,
                        bookingOverview: transformedData,
                        earningSummary: earnings,
                    }));
                    if (silent) setLastUpdated(new Date());
                }
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
                if (!silent) {
                    showNotification("Failed to load chart data", "error");
                }
            } finally {
                if (!silent) setIsSearching(false);
            }
        },
        [selectedPeriod]
    );

    // Fetch bookings data with real-time updates
    const fetchBookings = useCallback(
        async (silent = false) => {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}vendors/warehouse/api/bookings`,
                    {
                        params: {
                            per_page: 50,
                            timestamp: Date.now(),
                        },
                    }
                );
                if (response.data.success) {
                    const newBookings = response.data.data;

                    if (silent && allBookings.length > 0) {
                        const newBookingIds = newBookings.map((b) => b.id);
                        const existingIds = allBookings.map((b) => b.id);
                        const hasNewBookings = newBookingIds.some(
                            (id) => !existingIds.includes(id)
                        );

                        if (hasNewBookings) {
                            showNotification(
                                "New booking received!",
                                "success"
                            );
                            playNotificationSound();
                        }
                    }

                    setAllBookings(newBookings);
                    applyCurrentFilters(newBookings);
                }
            } catch (error) {
                console.error("Failed to fetch bookings:", error);
                if (!silent) {
                    showNotification("Failed to load bookings", "error");
                }
            }
        },
        [applyCurrentFilters, showNotification, playNotificationSound]
    );

    // Fetch warehouse units data
    const fetchUnits = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}vendors/warehouse/api/units`);
            if (response.data.data) {
                const units = response.data.data;
                const typeStats = units.reduce((acc, unit) => {
                    const type = unit.type?.replace("_", " ") || "Unknown";
                    if (!acc[type]) acc[type] = { total: 0, occupied: 0 };
                    acc[type].total++;
                    if (!unit.is_available) acc[type].occupied++;
                    return acc;
                }, {});

                const processedTypes = Object.entries(typeStats).map(
                    ([name, stats]) => ({
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        percent:
                            Math.round((stats.occupied / stats.total) * 100) ||
                            0,
                    })
                );

                setUnitTypes(processedTypes);

                const totalUnits = units.length;
                const activeUnits = units.filter(
                    (u) => u.is_active && u.is_available
                ).length;
                const pendingUnits = units.filter(
                    (u) => u.approval_status === "pending"
                ).length;
                const inactiveUnits = units.filter((u) => !u.is_active).length;

                setChartData((prev) => ({
                    ...prev,
                    warehouseStatus: [
                        {
                            name: "Active",
                            value:
                                Math.round((activeUnits / totalUnits) * 100) ||
                                40,
                            color: "#3DD0FF",
                        },
                        {
                            name: "Pending",
                            value:
                                Math.round((pendingUnits / totalUnits) * 100) ||
                                30,
                            color: "#0955AC",
                        },
                        {
                            name: "Inactive",
                            value:
                                Math.round(
                                    (inactiveUnits / totalUnits) * 100
                                ) || 30,
                            color: "#C4C4C4",
                        },
                    ],
                }));
            }
        } catch (error) {
            console.error("Failed to fetch units:", error);
            showNotification("Failed to load warehouse units", "error");
        }
    }, []);

    // Real-time search filtering function
    const performRealTimeSearch = useCallback(
        (query) => {
            setIsSearching(true);

            if (!query.trim()) {
                setBookings(allBookings);
                setIsSearching(false);
                return;
            }

            const searchTerm = query.toLowerCase();
            const filtered = allBookings.filter((booking) => {
                return (
                    booking.contact_person
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    booking.company_name?.toLowerCase().includes(searchTerm) ||
                    booking.email?.toLowerCase().includes(searchTerm) ||
                    booking.phone?.includes(searchTerm) ||
                    booking.booking_reference
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    booking.status?.toLowerCase().includes(searchTerm) ||
                    booking.warehouseUnit?.toString().includes(searchTerm)
                );
            });

            setBookings(filtered);
            setIsSearching(false);
        },
        [allBookings]
    );

    // Filter bookings by status
    const filterBookingsByStatus = useCallback(
        (filter) => {
            let filtered = allBookings;

            switch (filter) {
                case "active":
                    filtered = allBookings.filter((b) =>
                        ["confirmed", "active"].includes(b.status)
                    );
                    break;
                case "pending":
                    filtered = allBookings.filter(
                        (b) => b.status === "pending"
                    );
                    break;
                case "completed":
                    filtered = allBookings.filter(
                        (b) => b.status === "completed"
                    );
                    break;
                case "cancelled":
                    filtered = allBookings.filter(
                        (b) => b.status === "cancelled"
                    );
                    break;
                default:
                    filtered = allBookings;
            }

            // Apply search query if exists
            if (searchQuery.trim()) {
                const searchTerm = searchQuery.toLowerCase();
                filtered = filtered.filter((booking) => {
                    return (
                        booking.contact_person
                            ?.toLowerCase()
                            .includes(searchTerm) ||
                        booking.company_name
                            ?.toLowerCase()
                            .includes(searchTerm) ||
                        booking.email?.toLowerCase().includes(searchTerm) ||
                        booking.phone?.includes(searchTerm) ||
                        booking.booking_reference
                            ?.toLowerCase()
                            .includes(searchTerm) ||
                        booking.status?.toLowerCase().includes(searchTerm)
                    );
                });
            }

            setBookings(filtered);
        },
        [allBookings, searchQuery]
    );

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!auth?.user) return;

        try {
            console.log('DashContent: Fetching warehouse notifications...');
            const response = await fetch('/vendors/warehouse/notifications/data');
            console.log('DashContent: Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('DashContent: Notifications data:', data);
                setWarehouseNotifications(data.notifications || []);
                setNotificationUnreadCount(data.unreadCount || 0);
            } else {
                console.error('DashContent: Failed to fetch notifications:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('DashContent: Failed to fetch notifications:', error);
        }
    }, [auth?.user]);

    // Generate mock recent activities based on real data context
    const generateRecentActivities = useCallback(() => {
        const activities = [
            {
                id: 1,
                type: "booking",
                title: `${user?.name || "Service Provider"
                    } confirmed new warehouse booking`,
                time: "10:45 AM",
                date: "Today",
                icon: "calendar",
            },
            {
                id: 2,
                type: "payment",
                title: "Payment received for Unit B-12",
                time: "09:30 AM",
                date: "Today",
                icon: "package",
            },
            {
                id: 3,
                type: "user",
                title: "New client registered for warehouse services",
                time: "16:20 PM",
                date: "Yesterday",
                icon: "users",
            },
            {
                id: 4,
                type: "unit",
                title: "Unit A-07 marked as available",
                time: "11:30 AM",
                date: "Yesterday",
                icon: "boxes",
            },
        ];
        setRecentActivities(activities);
    }, []);

    // Handle data refresh
    const refreshData = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchDashboardStats(),
                fetchChartData(),
                fetchBookings(),
                fetchUnits(),
            ]);
        } catch (error) {
            setError("Failed to refresh dashboard data");
        } finally {
            setRefreshing(false);
        }
    }, [fetchDashboardStats, fetchChartData, fetchBookings, fetchUnits]);

    // Fetch notifications on mount and set interval
    useEffect(() => {
        if (auth?.user) {
            fetchNotifications();
            // Refresh notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [auth?.user, fetchNotifications]);

    // Initial data loading
    useEffect(() => {
        const loadDashboard = async () => {
            setLoading(true);
            setError(null);
            try {
                await Promise.all([
                    fetchDashboardStats(),
                    fetchChartData(),
                    fetchBookings(),
                    fetchUnits(),
                ]);
                generateRecentActivities();
            } catch (error) {
                setError("Failed to load dashboard data");
                console.error("Dashboard loading error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    // Period change effect - fetch new chart data when period changes
    useEffect(() => {
        if (!loading && selectedPeriod) {
            fetchChartData(false);
        }
    }, [selectedPeriod, loading, fetchChartData]);

    useEffect(() => {
        if (!loading) {
            applyCurrentFilters(allBookings);
        }
    }, [loading, allBookings, applyCurrentFilters]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                warehouseExportMenuRef.current &&
                !warehouseExportMenuRef.current.contains(event.target)
            ) {
                setShowWarehouseExportMenu(false);
            }
        };

        if (showWarehouseExportMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showWarehouseExportMenu]);

    // Real-time auto-refresh effect
    useEffect(() => {
        if (!autoRefresh || !liveMode || loading) return;

        const interval = setInterval(async () => {
            try {
                // Silent updates (no loading indicators)
                await Promise.all([
                    fetchDashboardStats(true),
                    fetchChartData(true),
                    fetchBookings(true),
                    fetchUnits(true),
                ]);
                setLastUpdated(new Date());
            } catch (error) {
                console.error("Auto-refresh failed:", error);
            }
        }, updateInterval);

        return () => clearInterval(interval);
    }, [
        autoRefresh,
        liveMode,
        loading,
        updateInterval,
        fetchDashboardStats,
        fetchChartData,
        fetchBookings,
        fetchUnits,
    ]);

    // Real-time activity updates
    useEffect(() => {
        if (realtimeStats && allBookings.length > 0) {
            // Generate dynamic activities based on recent bookings
            const recentBookingsData = allBookings.slice(0, 3);
            const dynamicActivities = recentBookingsData.map((booking) => ({
                id: `dynamic-${booking.id}`,
                type: "booking",
                title: `New booking from ${booking.contact_person || "Client"}`,
                time: new Date(booking.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                date: isToday(new Date(booking.created_at))
                    ? "Today"
                    : "Yesterday",
                icon: "calendar",
            }));

            // Only update if we have fresh data
            if (dynamicActivities.length > 0) {
                setRecentActivities(dynamicActivities.slice(0, 4));
            }
        }
    }, [realtimeStats, allBookings]);

    const settingsRoute = (() => {
        try {
            return route("warehouse.settingsPage");
        } catch {
            return "/warehouse/settings";
        }
    })();

    // Helper function to check if date is today
    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // Handle unit availability check with real-time results
    const handleAvailabilityCheck = useCallback(async () => {
        if (!availabilityForm.date) {
            showNotification("Please select a date", "error");
            return;
        }

        setIsSearching(true);
        try {
            // Simulate API call with real-time data
            await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate network delay

            const availableUnits = unitTypes.filter(
                (type) => type.percent < 80
            );
            const totalAvailable = availableUnits.length;
            const selectedDate = new Date(
                availabilityForm.date
            ).toLocaleDateString();

            if (totalAvailable > 0) {
                showNotification(
                    `✅ Found ${totalAvailable} available unit types for ${selectedDate}`,
                    "success"
                );

                // Update availability in real-time
                const availabilityResults = availableUnits.map((unit) => ({
                    type: unit.name,
                    availability: Math.floor(Math.random() * 5) + 1,
                    price: Math.floor(Math.random() * 500) + 200,
                }));

                // Could show detailed results in a modal or notification
                console.log("Real-time availability:", availabilityResults);
            } else {
                showNotification(
                    "❌ No units available for selected date",
                    "error"
                );
            }
        } catch (error) {
            showNotification("Failed to check availability", "error");
        } finally {
            setIsSearching(false);
        }
    }, [availabilityForm, unitTypes, showNotification]);

    // Handle period changes with real-time chart updates
    const handlePeriodChange = useCallback(
        async (newPeriod) => {
            setSelectedPeriod(newPeriod);
            setIsSearching(true);
            try {
                await fetchChartData();
                showNotification(`Chart updated for ${newPeriod}`, "info");
            } catch (error) {
                showNotification("Failed to update chart", "error");
            } finally {
                setIsSearching(false);
            }
        },
        [fetchChartData, showNotification]
    );

    const handleStatusFilterChange = useCallback(
        (newFilter) => {
            setStatusFilter(newFilter);
            // Re-fetch chart data for new filter if needed
            if (liveMode) {
                fetchChartData(true);
            }
            showNotification(`Warehouse status filter: ${newFilter}`, "info");
        },
        [liveMode, fetchChartData, showNotification]
    );

    // Clear search function
    const clearSearch = useCallback(() => {
        setSearchQuery("");
        setBookings(allBookings);
    }, [allBookings]);

    // Handle search input change
    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        setSearchQuery(value);
    }, []);

    const toggleLiveMode = useCallback(() => {
        setLiveMode((prev) => !prev);
        if (!liveMode) {
            showNotification(
                "Live mode enabled - Auto-updates every 30s",
                "info"
            );
        } else {
            showNotification("Live mode disabled", "info");
        }
    }, [liveMode, showNotification]);

    const parseDateSafe = (dateValue) => {
        if (!dateValue) return null;
        const d = new Date(dateValue);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const formatShortDate = (dateValue) => {
        const d = parseDateSafe(dateValue);
        return d
            ? d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
            })
            : "N/A";
    };

    const mapWarehouseDisplayData = (booking) => {
        const durationValue =
            booking.durationMonths ||
            booking.duration_months ||
            booking.durationValue ||
            1;
        const rateValue =
            booking.monthlyRate ||
            booking.monthly_rate ||
            booking.total_price ||
            0;
        const paid =
            booking.payment_status === "paid" ||
            booking.paymentStatus === "Paid";

        return {
            id: booking.id || booking.booking_reference || "N/A",
            createdAt: formatShortDate(booking.bookingDate || booking.created_at),
            vendor:
                booking.contactPerson ||
                booking.contact_person ||
                booking.clientName ||
                "Unknown",
            company: booking.company_name || booking.companyName || "N/A",
            unit:
                booking.warehouseUnit ||
                booking.warehouse_unit ||
                booking.unit_type ||
                "N/A",
            term: `${durationValue} ${durationValue === 1 ? "month" : "months"}`,
            startDate: formatShortDate(booking.startDate || booking.start_date),
            endDate: formatShortDate(booking.endDate || booking.end_date),
            rate: `LKR ${Number(rateValue).toLocaleString()}/mo`,
            paymentStatus: booking.paymentStatus || (paid ? "Paid" : "Pending"),
            status: booking.status
                ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
                : "Pending",
        };
    };

    // Export warehouse bookings to CSV
    const exportWarehouseToCSV = () => {
        const rows = bookings.map(mapWarehouseDisplayData);
        if (!rows.length) {
            alert("No bookings to export");
            setShowWarehouseExportMenu(false);
            return;
        }

        const csvContent = [
            ["Booking ID", "Booking Date", "Client Name", "Company", "Unit", "Term", "Start Date", "End Date", "Rate", "Payment Status", "Status"],
            ...rows.map((booking) => [
                booking.id,
                booking.createdAt,
                booking.vendor,
                booking.company,
                booking.unit,
                booking.term,
                booking.startDate,
                booking.endDate,
                booking.rate,
                booking.paymentStatus,
                booking.status,
            ]),
        ]
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `warehouse-bookings-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowWarehouseExportMenu(false);
    };

    // Export warehouse bookings to PDF
    const exportWarehouseToPDF = () => {
        const rows = bookings.map(mapWarehouseDisplayData);
        if (!rows.length) {
            alert("No bookings to export");
            setShowWarehouseExportMenu(false);
            return;
        }

        const doc = new jsPDF({ orientation: "landscape" });
        const data = rows.map((booking) => [
            booking.id,
            booking.createdAt,
            booking.vendor,
            booking.company,
            booking.unit,
            booking.term,
            booking.startDate,
            booking.endDate,
            booking.rate,
            booking.paymentStatus,
            booking.status,
        ]);

        const headers = [["Booking ID", "Booking Date", "Client Name", "Company", "Unit", "Term", "Start Date", "End Date", "Rate", "Payment Status", "Status"]];

        doc.setFontSize(16);
        doc.text("Warehouse Bookings Report", 14, 10);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 18);

        autoTable(doc, {
            head: headers,
            body: data,
            startY: 25,
            margin: { top: 20, right: 10, bottom: 10, left: 10 },
            headStyles: { fillColor: [9, 85, 172], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [230, 240, 250] },
            didDrawPage: (data) => {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(9);
                doc.text(
                    `Page ${data.pageNumber} of ${pageCount}`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
        });

        doc.save(`warehouse-bookings-${new Date().toISOString().slice(0, 10)}.pdf`);
        setShowWarehouseExportMenu(false);
    };

    // Export warehouse bookings to XLSX
    const exportWarehouseToXLSX = () => {
        try {
            const rows = bookings.map(mapWarehouseDisplayData);
            if (!rows.length) {
                alert("No bookings to export");
                setShowWarehouseExportMenu(false);
                return;
            }

            const data = [
                ["Booking ID", "Booking Date", "Client Name", "Company", "Unit", "Term", "Start Date", "End Date", "Rate", "Payment Status", "Status"],
                ...rows.map((booking) => [
                    booking.id,
                    booking.createdAt,
                    booking.vendor,
                    booking.company,
                    booking.unit,
                    booking.term,
                    booking.startDate,
                    booking.endDate,
                    booking.rate,
                    booking.paymentStatus,
                    booking.status,
                ])
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Warehouse Bookings");

            XLSX.writeFile(workbook, `warehouse-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (error) {
            console.error("Error exporting to XLSX:", error);
            alert("Error exporting to XLSX. Please try again.");
        }
        setShowWarehouseExportMenu(false);
    };

    // Reset warehouse bookings filters
    const handleResetWarehouseFilters = useCallback(() => {
        setWarehouseSearchQuery("");
        setWarehouseStatusFilter("All");
        setWarehousePaymentFilter("All");
        setWarehouseDateFromFilter("");
        setWarehouseDateToFilter("");
    }, []);

    // Inline BookingOverviewBarChart Component
    const BookingOverviewBarChart = ({ data = [] }) => {
        const bookingData = data;
        const maxBookings = Math.max(1000, ...bookingData.map(d => d.bookings || d.confirmed + d.pending + d.cancelled || 0));
        const [hovered, setHovered] = useState(null);
        const chartHeight = 217; // px
        // Find the index of the highest bookings
        const maxIndex = bookingData.reduce((maxIdx, d, idx, arr) => (d.bookings || 0) > (arr[maxIdx]?.bookings || 0) ? idx : maxIdx, 0);

        if (bookingData.length === 0) {
            return (
                <div className="w-[600px] h-[217px] flex items-center justify-center text-gray-500">
                    <span>No booking data available</span>
                </div>
            );
        }

        return (
            <div className="w-[850px] mx-auto h-auto flex flex-col items-stretch relative">
                {/* Chart area: grid lines and bars, fixed height */}
                <div className="relative w-full" style={{ height: `${chartHeight}px` }}>
                    {/* Y-axis grid lines and labels */}
                    <div className="absolute left-0 w-full h-full z-0 pointer-events-none" style={{ height: `${chartHeight}px` }}>
                        {[1000, 750, 500, 250, 0].map((v) => {
                            const percentFromBottom = (v / maxBookings) * 100;
                            return (
                                <div
                                    key={v}
                                    className="w-full absolute flex items-center"
                                    style={{ bottom: `${percentFromBottom}%` }}
                                >
                                    <span className="text-[14px] text-gray-400 absolute -left-12 -top-7 w-8 text-left" style={{ transform: 'translateY(50%)' }}>{v === 1000 ? '1K' : v}</span>
                                    <div className={`w-full border-t`}></div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Bars */}
                    <div className="flex flex-row items-end w-full h-full z-10 relative" style={{ height: `${chartHeight}px`, marginBottom: 0 }}>
                        {bookingData.map((d, i) => (
                            <div key={d.name} className="flex flex-col items-center flex-1 relative group">
                                {/* Bar */}
                                <div
                                    className={`w-[25px] rounded-md transition-all duration-200 cursor-pointer ${i === 7 ? 'bg-[#39CEF3]' : 'bg-[#0955AC]'}`}
                                    style={{ height: `${(d.bookings / maxBookings) * chartHeight}px` }}
                                    onMouseEnter={() => setHovered(i)}
                                    onMouseLeave={() => setHovered(null)}
                                ></div>
                                {/* Tooltip */}
                                {(hovered === i || (hovered === null && i === maxIndex)) && (
                                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-[#D8E4F2] text-black px-6 py-2 rounded-lg shadow text-center z-20">
                                        <div className="font-[600] text-[14px] flex flex-row items-center justify-center gap-1">{d.name} <span className="">2025</span></div>
                                        <div className="text-[16px] font-[700]">{d.bookings}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {/* Month labels below chart area */}
                <div className="flex flex-row items-end w-full z-10 relative" style={{ marginTop: '8px' }}>
                    {bookingData.map((d) => (
                        <div key={d.name} className="flex-1 flex justify-center" style={{ minWidth: '36px' }}>
                            <div className="text-[14px] font-[500] text-[#7B7B7A]">{d.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Inline EarningSummaryChart Component
    const EarningSummaryChart = ({ data = [] }) => {
        const chartHeight = 300;
        const chartWidth = 1000;
        const padding = 40;

        // Normalize data to handle both 'value' and 'earnings' properties
        const normalizedData = data.map(d => ({
            name: d.name || d.month,
            value: d.value || d.earnings || 0
        }));

        const earningData = normalizedData;
        const maxValue = Math.max(24000, ...earningData.map(d => d.value || 0));

        const getX = (index) => {
            return padding + (index * (chartWidth - 2 * padding)) / (earningData.length - 1);
        };

        const getY = (value) => {
            return chartHeight - padding - (value * (chartHeight - 2 * padding)) / maxValue;
        };

        // Helper function to generate smooth curve
        const generateSmoothPath = (points) => {
            if (points.length < 2) return "";
            const path = [];
            path.push(`M ${points[0][0]} ${points[0][1]}`);
            for (let i = 0; i < points.length - 1; i++) {
                const current = points[i];
                const next = points[i + 1];
                const controlPointX = (current[0] + next[0]) / 2;
                path.push(`C ${controlPointX} ${current[1]}, ${controlPointX} ${next[1]}, ${next[0]} ${next[1]}`);
            }
            return path.join(" ");
        };

        // Find the index of the highest value
        const highestIndex = earningData.reduce(
            (maxIdx, d, idx, arr) => (d.value || 0) > (arr[maxIdx].value || 0) ? idx : maxIdx,
            0
        );
        const [hovered, setHovered] = useState(highestIndex);

        if (earningData.length === 0) {
            return (
                <div className="w-full h-[250px] flex items-center justify-center text-gray-500">
                    <span>No earnings data available</span>
                </div>
            );
        }

        // Generate points for the paths
        const points = earningData.map((d, i) => [getX(i), getY(d.value || 0)]);

        // Build the smooth line path
        const linePath = generateSmoothPath(points);

        // Build the smooth area path
        const areaPath = [
            `M ${getX(0)} ${chartHeight - padding}`,
            generateSmoothPath(points).slice(1),
            `L ${getX(earningData.length - 1)} ${chartHeight - padding}`,
            "Z",
        ].join(" ");

        return (
            <div className="w-full overflow-x-auto">
                <div className="w-full h-auto ml-10" style={{ minWidth: '1000px' }}>
                    <svg width={chartWidth} height={chartHeight} className="block mx-auto w-full">
                        <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#C4E0FF" />
                                <stop offset="100%" stopColor="#0955AC1A" />
                            </linearGradient>
                        </defs>
                        {[0, 6000, 12000, 18000, 24000].map((val, i) => {
                            const y = getY(val);
                            return (
                                <g key={i}>
                                    <line x1={padding} x2={chartWidth - padding} y1={y} y2={y} stroke="#E5E7EB" strokeWidth={1} />
                                    <text x={0} y={y + 5} className="fill-[#7B7B7A] text-[14px] font-[500]" textAnchor="start">
                                        {val / 1000}K
                                    </text>
                                </g>
                            );
                        })}
                        <path d={areaPath} fill="url(#areaGradient)" />
                        <path d={linePath} fill="none" stroke="#0955AC" strokeWidth={2} />
                        {earningData.map((d, i) => (
                            <g key={i}>
                                <circle
                                    cx={getX(i)}
                                    cy={getY(d.value)}
                                    r={15}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onClick={() => setHovered(i)}
                                />
                                {hovered === i && (
                                    <circle
                                        cx={getX(i)}
                                        cy={getY(d.value)}
                                        r={6}
                                        fill="rgba(9, 85, 172, 1)"
                                        strokeWidth={2}
                                    />
                                )}
                            </g>
                        ))}
                        {hovered !== null && earningData[hovered] && (() => {
                            const tooltipWidth = 108;
                            const tooltipHeight = 55;
                            const pointX = getX(hovered);
                            const pointY = getY(earningData[hovered].value || 0);
                            let tooltipX = pointX - tooltipWidth / 2;
                            let tooltipY = pointY - tooltipHeight - 15;

                            if (tooltipX < 0) tooltipX = 0;
                            if (tooltipX + tooltipWidth > chartWidth) tooltipX = chartWidth - tooltipWidth;
                            if (tooltipY < 0) tooltipY = pointY + 15;
                            if (tooltipY + tooltipHeight > chartHeight) tooltipY = pointY - tooltipHeight - 15;

                            const earningValue = earningData[hovered].value || 0;

                            return (
                                <foreignObject x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} pointerEvents="none">
                                    <div className="bg-[#D8E4F2] w-[108px] h-[55px] rounded-[5px] shadow-lg px-4 py-2 flex flex-col items-center">
                                        <span className="text-[14px] font-[500] mb-1">{earningData[hovered].name} 2025</span>
                                        <span className="text-[16px] font-[700]">LKR {earningValue.toLocaleString()}</span>
                                    </div>
                                </foreignObject>
                            );
                        })()}
                        {earningData.map((d, i) => (
                            <text
                                key={i}
                                x={getX(i)}
                                y={chartHeight - padding + 20}
                                className="fill-[#7B7B7A] text-[14px] font-[500]"
                                textAnchor="middle"
                            >
                                {d.name}
                            </text>
                        ))}
                    </svg>
                </div>
            </div>
        );
    };


    const refreshAllData = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchDashboardStats(),
                fetchChartData(),
                fetchBookings(),
                fetchUnits(),
            ]);
            showNotification("Dashboard refreshed successfully", "success");
        } catch (error) {
            setError("Failed to refresh dashboard data");
            showNotification("Failed to refresh dashboard", "error");
        } finally {
            setRefreshing(false);
        }
    }, [
        fetchDashboardStats,
        fetchChartData,
        fetchBookings,
        fetchUnits,
        showNotification,
    ]);
    // Loading state component
    if (loading) {
        return (
            <div className="w-full h-auto pr-5 py-10">
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-lg font-medium text-gray-600">
                        Loading dashboard...
                    </span>
                </div>
            </div>
        );
    }

    // Error state component
    if (error) {
        return (
            <div className="w-full h-auto pr-5 py-10">
                <div className="flex flex-col items-center justify-center h-96">
                    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <span className="text-lg font-medium text-gray-900 mb-2">
                        Dashboard Error
                    </span>
                    <span className="text-sm text-gray-600 mb-4">{error}</span>
                    <button
                        onClick={refreshData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* Real-time notifications */}
            {notifications.length > 0 && (
                <div className="fixed top-4 right-4 z-50 space-y-2">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-3 rounded-lg shadow-lg border-l-4 bg-white transform transition-all duration-300 ${notification.type === "success"
                                ? "border-green-500"
                                : notification.type === "error"
                                    ? "border-red-500"
                                    : "border-blue-500"
                                } animate-slide-in`}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-2 h-2 rounded-full ${notification.type === "success"
                                        ? "bg-green-500"
                                        : notification.type === "error"
                                            ? "bg-red-500"
                                            : "bg-blue-500"
                                        }`}
                                ></div>
                                <span className="text-sm font-medium text-gray-800">
                                    {notification.message}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Header section */}
            <div className="flex md:flex-row flex-col gap-5 justify-between items-center">

                <div className="flex items-center gap-4">
                    <h1 className="figtree text-[24px] md:text-[30px] font-[700] text-center md:text-left  md:mt-0">
                        Warehouse Dashboard
                    </h1>
                </div>
                {/* <div className="flex flex-row gap-5">
                    <div 
                        className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center cursor-pointer hover:bg-[#D8E4F2] transition-colors"
                        onClick={() => document.getElementById('globalSearch')?.focus()}
                        title="Search"
                    >
                        <Search size={24} />
                    </div>
                    <div 
                        className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center cursor-pointer hover:bg-[#D8E4F2] transition-colors"
                        title="Settings"
                    >
                        <Settings size={24} />
                    </div>  */}

                {/* 
                    <div 
                        className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center cursor-pointer hover:bg-[#D8E4F2] transition-colors"
                        title="Warehouses"
                    >
                        <Building2 size={24} />
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
                    <UserDropdown
                        settingsRoute={route("warehouse.settingsPage")}
                    />
                </div> */}
            </div>
            {/* end of header section */}

            <div className="flex flex-col gap-5 py-10">
                <div className="flex flex-col xl:flex-row gap-5">
                    {/* mini left section */}
                    <div className="flex flex-col gap-5 w-full">
                        {/* mini 4 cards */}
                        <div className="flex flex-col gap-5">
                            <div className="flex xl:flex-row flex-col gap-5 xl:w-full">
                                {/* card 1 */}
                                <div
                                    className="xl:min-w-[300px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-5 justify-center items-center">
                                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                            <DollarSign size={24} />
                                        </div>
                                        <div>
                                            <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">
                                                Total Revenue
                                            </h1>
                                            <h1 className="text-[22px] md:text-[26px] font-[700]">
                                                {dashboardStats.totalRevenue}
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                                        <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                            <ArrowUp size={19} />
                                            <h1>{dashboardStats.revenueChange}</h1>
                                        </div>
                                        <h1 className="text-[#7B7B7A]">from last week</h1>
                                    </div>
                                </div>
                                {/* end of card 1 */}

                                {/* card 2 */}
                                <div
                                    className="xl:min-w-[300px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-5 justify-center items-center">
                                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                            <CalendarDays size={24} />
                                        </div>
                                        <div>
                                            <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">
                                                Active Bookings
                                            </h1>
                                            <h1 className="text-[22px] md:text-[26px] font-[700]">
                                                {dashboardStats.activeBookings}
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                                        <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                            <ArrowUp size={19} />
                                            <h1>{dashboardStats.bookingsChange}</h1>
                                        </div>
                                        <h1 className="text-[#7B7B7A]">from last week</h1>
                                    </div>
                                </div>
                                {/* end of card 2 */}
                            </div>

                            <div className="flex xl:flex-row flex-col gap-5 w-full">
                                {/* card 3 */}
                                <div
                                    className="xl:min-w-[300px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-5 justify-center items-center">
                                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">
                                                Occupied Units
                                            </h1>
                                            <h1 className="text-[22px] md:text-[26px] font-[700]">
                                                {dashboardStats.occupiedUnits}
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                                        <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                            <ArrowUp size={19} />
                                            <h1>{dashboardStats.occupiedChange}</h1>
                                        </div>
                                        <h1 className="text-[#7B7B7A]">from last week</h1>
                                    </div>
                                </div>
                                {/* end of card 3 */}

                                {/* card 4 */}
                                <div
                                    className="xl:min-w-[300px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-5 justify-center items-center">
                                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                            <Boxes size={24} />
                                        </div>
                                        <div>
                                            <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">
                                                Total Units
                                            </h1>
                                            <h1 className="text-[22px] md:text-[26px] font-[700]">
                                                {dashboardStats.totalUnits}
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                                        <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                            <ArrowUp size={19} />
                                            <h1>{dashboardStats.unitsChange}</h1>
                                        </div>
                                        <h1 className="text-[#7B7B7A]">from last week</h1>
                                    </div>
                                </div>
                                {/* end of card 4 */}
                            </div>
                        </div>

                        {/* end of 4 mini cards */}
                        {/* vendors section */}

                        <div
                            className="w-full max-w-full h-auto bg-white flex flex-col justify-center items-center rounded-[10px] py-6 md:py-15 px-3 md:px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-col gap-4 w-full">
                                {/* Header and Buttons */}
                                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 w-full">
                                    <h1 className="text-[20px] md:text-[24px] font-[700]">
                                        Warehouse Clients
                                    </h1>

                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        <div className="w-full sm:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center py-2 px-4">
                                            <Search size={16} className="shrink-0" />
                                            <input
                                                type="text"
                                                value={warehouseSearchQuery}
                                                onChange={(e) => setWarehouseSearchQuery(e.target.value)}
                                                className="w-full outline-none bg-transparent placeholder:text-[#7B7B7ACC] border-0 focus:ring-0 text-sm ml-2"
                                                placeholder="Search client name, company, etc."
                                            />
                                        </div>

                                        <button onClick={() => setShowWarehouseFilters(!showWarehouseFilters)}
                                            className="w-full lg:w-auto xl:w-[115px] xl:h-[35px] text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white transition font-[500] text-[14px] border border-gray-300">
                                            <Filter size={14} className="shrink-0" />
                                            <span>Filter</span>
                                        </button>

                                        <div className="relative" ref={warehouseExportMenuRef}>
                                            <button
                                                onClick={() => setShowWarehouseExportMenu(!showWarehouseExportMenu)}
                                                className="w-full lg:w-auto xl:w-[115px] xl:h-[35px] text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white transition font-[500] text-[14px] border border-gray-300">
                                                <Download size={14} className="shrink-0" />
                                                <span>Export</span>
                                                <DropdownIcon size={12} />
                                            </button>
                                            {showWarehouseExportMenu && (
                                                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-[6px] shadow-lg z-50">
                                                    <button
                                                        onClick={exportWarehouseToCSV}
                                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px] border-b border-gray-200"
                                                    >
                                                        Export to CSV
                                                    </button>
                                                    <button
                                                        onClick={exportWarehouseToPDF}
                                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px] border-b border-gray-200"
                                                    >
                                                        Export to PDF
                                                    </button>
                                                    <button
                                                        onClick={exportWarehouseToXLSX}
                                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px]"
                                                    >
                                                        Export to XLSX
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Filter Panel */}
                                {showWarehouseFilters && (
                                    <div className="border border-gray-300 rounded-[8px] p-4 bg-gray-50 w-full">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-[600] text-[16px]">Filters</h3>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleResetWarehouseFilters}
                                                    className="px-3 py-2 text-[14px] bg-white border border-gray-300 rounded-[6px] text-gray-700 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500]"
                                                >
                                                    Reset Filters
                                                </button>
                                                <button
                                                    onClick={() => setShowWarehouseFilters(false)}
                                                    className="text-gray-500 hover:text-gray-700 text-[24px] font-bold"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                           

                                            {/* Status Filter */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-[600] text-gray-700">Status</label>
                                                <select
                                                    value={warehouseStatusFilter}
                                                    onChange={(e) => setWarehouseStatusFilter(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                >
                                                    <option value="All">All</option>
                                                    <option value="Active">Active</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            </div>

                                            {/* Payment Status Filter */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-[600] text-gray-700">Payment Status</label>
                                                <select
                                                    value={warehousePaymentFilter}
                                                    onChange={(e) => setWarehousePaymentFilter(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                >
                                                    <option value="All">All</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Pending">Pending</option>
                                                </select>
                                            </div>

                                            {/* From Date */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-[600] text-gray-700">From Date</label>
                                                <input
                                                    type="date"
                                                    value={warehouseDateFromFilter}
                                                    onChange={(e) => setWarehouseDateFromFilter(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>

                                            {/* To Date */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-[600] text-gray-700">To Date</label>
                                                <input
                                                    type="date"
                                                    value={warehouseDateToFilter}
                                                    onChange={(e) => setWarehouseDateToFilter(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="py-10 w-full">
                                    {/* DESKTOP/TABLET TABLE */}
                                    <div className="hidden md:block overflow-auto">
                                        {/* table headings */}
                                        <div className="grid grid-cols-8 bg-[#D8E4F2] min-h-[48px] items-center rounded-[8px] text-[14px] font-[600] px-12 py-3 gap-x-6 min-w-[1200px]">
                                            <div className="flex flex-row gap-2 items-center">
                                                <h1>Booking ID</h1>
                                                <div className="flex flex-col justify-center items-center">
                                                    <ChevronUp className="w-[6px] h-[10px]" />
                                                    <ChevronDown className="w-[6px] h-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-row gap-2 items-center">
                                                <h1>Booking Date</h1>
                                                <div className="flex flex-col justify-center items-center">
                                                    <ChevronUp className="w-[6px] h-[10px]" />
                                                    <ChevronDown className="w-[6px] h-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-row gap-2 items-center">
                                                <h1>Client Name</h1>
                                                <div className="flex flex-col justify-center items-center">
                                                    <ChevronUp className="w-[6px] h-[10px]" />
                                                    <ChevronDown className="w-[6px] h-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-row gap-2 items-center">
                                                <h1>Company / Unit</h1>
                                                <div className="flex flex-col justify-center items-center">
                                                    <ChevronUp className="w-[6px] h-[10px]" />
                                                    <ChevronDown className="w-[6px] h-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-row gap-2 items-center">
                                                <h1>Term</h1>
                                                <div className="flex flex-col justify-center items-center">
                                                    <ChevronUp className="w-[6px] h-[10px]" />
                                                    <ChevronDown className="w-[6px] h-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-row gap-2 items-center">
                                                <h1>Dates</h1>
                                                <div className="flex flex-col justify-center items-center">
                                                    <ChevronUp className="w-[6px] h-[10px]" />
                                                    <ChevronDown className="w-[6px] h-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-row gap-2 items-center ml-10">
                                                <h1>Payment</h1>
                                                <div className="flex flex-col justify-center items-center">
                                                    <ChevronUp className="w-[6px] h-[10px]" />
                                                    <ChevronDown className="w-[6px] h-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-row gap-2 items-center">
                                                <h1>Status</h1>
                                                <div className="flex flex-col justify-center items-center">
                                                    <ChevronUp className="w-[6px] h-[10px]" />
                                                    <ChevronDown className="w-[6px] h-[10px]" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            {isSearching && bookings.length === 0 ? (
                                                <div className="py-10 flex items-center justify-center h-64">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                    <span className="ml-3 text-gray-600">Loading bookings...</span>
                                                </div>
                                            ) : bookings.length === 0 ? (
                                                <div className="py-10 flex flex-col items-center justify-center h-64 text-gray-500">
                                                    <Package size={48} className="mb-4 text-gray-400" />
                                                    <span className="text-lg font-medium">No bookings found</span>
                                                    <span className="text-sm text-gray-400">Your warehouse bookings will appear here</span>
                                                </div>
                                            ) : (
                                                paginatedBookings.map((booking, index) => {
                                                    const parseDate = (dateValue) => {
                                                        if (!dateValue) return new Date();
                                                        try {
                                                            return new Date(dateValue);
                                                        } catch {
                                                            return new Date();
                                                        }
                                                    };

                                                    const getStatusBg = (status) => {
                                                        switch (status?.toLowerCase()) {
                                                            case 'confirmed':
                                                            case 'active': return '#FFCD29';
                                                            case 'completed': return '#ACE19957';
                                                            case 'cancelled': return 'transparent';
                                                            default: return '#FFCD29';
                                                        }
                                                    };

                                                    const getStatusBorder = (status) => {
                                                        switch (status?.toLowerCase()) {
                                                            case 'confirmed':
                                                            case 'active': return '#0000004D';
                                                            case 'completed': return '#3B8F314D';
                                                            case 'cancelled': return '#FF6060';
                                                            default: return '#0000004D';
                                                        }
                                                    };

                                                    const getStatusText = (status) => {
                                                        switch (status?.toLowerCase()) {
                                                            case 'confirmed':
                                                            case 'active': return '#000000';
                                                            case 'completed': return '#3B8F31';
                                                            case 'cancelled': return '#FF6060';
                                                            default: return '#000000';
                                                        }
                                                    };

                                                    const displayData = {
                                                        id: booking.id || booking.booking_reference || 'N/A',
                                                        createdAt: parseDate(booking.bookingDate || booking.created_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: '2-digit'
                                                        }),
                                                        vendor: booking.contactPerson || booking.contact_person || booking.clientName || 'Unknown',
                                                        company: booking.company_name || booking.companyName || 'N/A',
                                                        unit: booking.warehouseUnit || booking.warehouse_unit || 'N/A',
                                                        term: `${booking.durationMonths || booking.duration_months || booking.durationValue || 1} ${((booking.durationMonths || booking.duration_months || booking.durationValue || 1) === 1) ? 'month' : 'months'}`,
                                                        startDate: parseDate(booking.startDate || booking.start_date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: '2-digit',
                                                            year: 'numeric'
                                                        }),
                                                        endDate: parseDate(booking.endDate || booking.end_date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: '2-digit',
                                                            year: 'numeric'
                                                        }),
                                                        rate: `LKR ${(booking.monthlyRate || booking.monthly_rate || 0).toLocaleString()}/mo`,
                                                        paymentStatus: booking.paymentStatus || (booking.payment_status === 'paid' ? 'Paid' : 'Pending'),
                                                        paymentColor: (booking.payment_status === 'paid' || booking.paymentStatus === 'Paid') ? '#3B8F314D' : '#FF6060',
                                                        paymentBg: (booking.payment_status === 'paid' || booking.paymentStatus === 'Paid') ? '#ACE19957' : '#FF60608C',
                                                        status: booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Pending',
                                                        statusBg: getStatusBg(booking.status),
                                                        statusBorder: getStatusBorder(booking.status),
                                                        statusText: getStatusText(booking.status)
                                                    };

                                                    return (
                                                        <div
                                                            key={displayData.id || index}
                                                            className="grid grid-cols-8 border-b-[1.5px] border-[#00000033] min-h-[110px] items-center text-[15px] font-[500] px-12 py-4 gap-x-6 min-w-[1200px]"
                                                        >
                                                            <div>{displayData.id}</div>
                                                            <div>{displayData.createdAt}</div>
                                                            <div>{displayData.vendor}</div>
                                                            <div className="flex flex-col gap-2">
                                                                <h1>{displayData.company}</h1>
                                                                <div className="w-[120px] h-[22px] rounded-[4px] bg-[#D9D9D957] border-[1.5px] border-[#0000004D] flex justify-center items-center text-[#00000099] text-[13px]">
                                                                    {displayData.unit}
                                                                </div>
                                                            </div>
                                                            <div>{displayData.term}</div>
                                                            <div className="text-[14px] font-[500] text-[#939392] space-y-2">
                                                                <div className="flex flex-row gap-2 justify-start items-center">
                                                                    <h1>Start</h1>
                                                                    <div className="w-[90px] h-[19px] border-[0.5px] bg-[#D9D9D957] border-[#0000004D] text-[10px] font-[500] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                                                        {displayData.startDate}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-row gap-4 justify-start items-center">
                                                                    <h1>End</h1>
                                                                    <div className="w-[90px] h-[19px] border-[0.5px] bg-[#D9D9D957] border-[#0000004D] text-[10px] font-[500] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                                                        {displayData.endDate}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col justify-center items-center gap-2">
                                                                <h1>{displayData.rate}</h1>
                                                                <div
                                                                    className="w-[66px] h-[19px] rounded-[4px] text-[10px] text-[#00000099] font-[500] flex justify-center items-center"
                                                                    style={{
                                                                        border: `0.5px solid ${displayData.paymentColor}`,
                                                                        backgroundColor: displayData.paymentBg,
                                                                    }}
                                                                >
                                                                    {displayData.paymentStatus}
                                                                </div>
                                                            </div>
                                                            <div
                                                                className="w-[75px] h-[19px] rounded-[4px] flex justify-center items-center text-[10px] font-[700]"
                                                                style={{
                                                                    backgroundColor: displayData.statusBg,
                                                                    border: `1px solid ${displayData.statusBorder}`,
                                                                    color: displayData.statusText,
                                                                }}
                                                            >
                                                                {displayData.status}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* MOBILE VIEW: stacked cards */}
                                    <div className="md:hidden space-y-4">
                                        {isSearching && bookings.length === 0 ? (
                                            <div className="py-10 flex items-center justify-center h-64">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <span className="ml-3 text-gray-600">Loading bookings...</span>
                                            </div>
                                        ) : bookings.length === 0 ? (
                                            <div className="py-10 flex flex-col items-center justify-center h-64 text-gray-500">
                                                <Package size={48} className="mb-4 text-gray-400" />
                                                <span className="text-lg font-medium">No bookings found</span>
                                                <span className="text-sm text-gray-400">Your warehouse bookings will appear here</span>
                                            </div>
                                        ) : (
                                            paginatedBookings.map((booking, index) => {
                                                const parseDate = (dateValue) => {
                                                    if (!dateValue) return new Date();
                                                    try {
                                                        return new Date(dateValue);
                                                    } catch {
                                                        return new Date();
                                                    }
                                                };

                                                const getStatusBg = (status) => {
                                                    switch (status?.toLowerCase()) {
                                                        case 'confirmed':
                                                        case 'active': return '#FFCD29';
                                                        case 'completed': return '#ACE19957';
                                                        case 'cancelled': return 'transparent';
                                                        default: return '#FFCD29';
                                                    }
                                                };

                                                const getStatusBorder = (status) => {
                                                    switch (status?.toLowerCase()) {
                                                        case 'confirmed':
                                                        case 'active': return '#0000004D';
                                                        case 'completed': return '#3B8F314D';
                                                        case 'cancelled': return '#FF6060';
                                                        default: return '#0000004D';
                                                    }
                                                };

                                                const getStatusText = (status) => {
                                                    switch (status?.toLowerCase()) {
                                                        case 'confirmed':
                                                        case 'active': return '#000000';
                                                        case 'completed': return '#3B8F31';
                                                        case 'cancelled': return '#FF6060';
                                                        default: return '#000000';
                                                    }
                                                };

                                                const displayData = {
                                                    id: booking.id || booking.booking_reference || 'N/A',
                                                    createdAt: parseDate(booking.bookingDate || booking.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: '2-digit'
                                                    }),
                                                    vendor: booking.contactPerson || booking.contact_person || booking.clientName || 'Unknown',
                                                    company: booking.company_name || booking.companyName || 'N/A',
                                                    unit: booking.warehouseUnit || booking.warehouse_unit || 'N/A',
                                                    term: `${booking.durationMonths || booking.duration_months || booking.durationValue || 1} ${((booking.durationMonths || booking.duration_months || booking.durationValue || 1) === 1) ? 'month' : 'months'}`,
                                                    startDate: parseDate(booking.startDate || booking.start_date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: '2-digit',
                                                        year: 'numeric'
                                                    }),
                                                    endDate: parseDate(booking.endDate || booking.end_date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: '2-digit',
                                                        year: 'numeric'
                                                    }),
                                                    rate: `LKR ${(booking.monthlyRate || booking.monthly_rate || 0).toLocaleString()}/mo`,
                                                    paymentStatus: booking.paymentStatus || (booking.payment_status === 'paid' ? 'Paid' : 'Pending'),
                                                    paymentColor: (booking.payment_status === 'paid' || booking.paymentStatus === 'Paid') ? '#3B8F314D' : '#FF6060',
                                                    paymentBg: (booking.payment_status === 'paid' || booking.paymentStatus === 'Paid') ? '#ACE19957' : '#FF60608C',
                                                    status: booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Pending',
                                                    statusBg: getStatusBg(booking.status),
                                                    statusBorder: getStatusBorder(booking.status),
                                                    statusText: getStatusText(booking.status)
                                                };

                                                return (
                                                    <div
                                                        key={index}
                                                        className="border border-[#00000033] rounded-[8px] p-4 text-[14px] font-[500] space-y-2 bg-white"
                                                    >
                                                        <div className="flex justify-between">
                                                            <span className="font-[600]">Booking ID</span>
                                                            <span className="text-gray-600">{displayData.id}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-[600]">Booking Date</span>
                                                            <span className="text-gray-600">{displayData.createdAt}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-[600]">Client</span>
                                                            <span className="text-gray-600">{displayData.vendor}</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="font-[600]">Company / Unit</span>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-gray-600">{displayData.company}</span>
                                                                <div className="w-[120px] h-[22px] rounded-[4px] bg-[#D9D9D957] border-[1.5px] border-[#0000004D] flex justify-center items-center text-[#00000099] text-[13px]">
                                                                    {displayData.unit}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-[600]">Term</span>
                                                            <span className="text-gray-600">{displayData.term}</span>
                                                        </div>
                                                        <div className="space-y-1 text-[#939392]">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-[600] text-black">Start</span>
                                                                <div className="w-[90px] h-[19px] border-[0.5px] bg-[#D9D9D957] border-[#0000004D] text-[10px] font-[500] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                                                    {displayData.startDate}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-[600] text-black">End</span>
                                                                <div className="w-[90px] h-[19px] border-[0.5px] bg-[#D9D9D957] border-[#0000004D] text-[10px] font-[500] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                                                    {displayData.endDate}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-[600]">Price</span>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-gray-600">{displayData.rate}</span>
                                                                <div
                                                                    className="w-[66px] h-[19px] rounded-[4px] text-[10px] text-[#00000099] font-[500] flex justify-center items-center"
                                                                    style={{
                                                                        border: `0.5px solid ${displayData.paymentColor}`,
                                                                        backgroundColor: displayData.paymentBg,
                                                                    }}
                                                                >
                                                                    {displayData.paymentStatus}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-[600]">Status</span>
                                                            <div
                                                                className="w-[75px] h-[19px] rounded-[4px] flex justify-center items-center text-[10px] font-[700]"
                                                                style={{
                                                                    backgroundColor: displayData.statusBg,
                                                                    border: `1px solid ${displayData.statusBorder}`,
                                                                    color: displayData.statusText,
                                                                }}
                                                            >
                                                                {displayData.status}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Pagination Controls */}
                                    {bookings.length > 0 && (
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-8 py-4">
                                            <div className="flex items-center">
                                                <span className="mr-3 text-[#00000080] text-[14px] sm:text-[15px]">
                                                    Results per page
                                                </span>
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={handleItemsPerPageChange}
                                                    className="rounded px-3 py-1 font-[600] text-[14px] sm:text-[16px] bg-[#F4F3F3] border-[1px] border-[#BEBEBE] w-[80px] h-[36px] focus:outline-none"
                                                >
                                                    <option value={5}>5</option>
                                                    <option value={10}>10</option>
                                                    <option value={25}>25</option>
                                                    <option value={50}>50</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    onClick={() => goToPage(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 size-[36px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <span className="text-lg">&#60;</span>
                                                </button>

                                                {getPageNumbers().map((pageNumber) => (
                                                    <button
                                                        key={pageNumber}
                                                        className={`px-3 py-1 text-[14px] sm:text-[16px] font-[600] rounded-[4px] size-[36px] bg-[#F4F3F3] ${
                                                            currentPage === pageNumber
                                                                ? "text-[#0955AC] border-[2px] border-[#0955AC]"
                                                                : "text-black"
                                                        }`}
                                                        onClick={() => goToPage(pageNumber)}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                ))}

                                                <button
                                                    onClick={() => goToPage(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 size-[36px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <span className="text-lg">&#62;</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                        {/* end */}
                        {/* booking chart */}
                        <div
                            className="hidden md:block md:w-full md:min-w-[742px] min-h-[381px] bg-[#FFFFFF] rounded-[10px] py-10 px-10 overflow-hidden"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            {/* Occupancy Overview header and dropdown */}
                            <div className="flex flex-row items-center justify-between mb-16 w-full">
                                <h1 className="text-[24px] font-[700]">
                                    Occupancy Overview
                                </h1>
                                <div className="relative">
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) => {
                                            setSelectedPeriod(e.target.value);
                                            setIsSearching(true);
                                        }}
                                        className="w-[140px] h-[33px] bg-[#D9D9D94F] rounded-[6px] text-[#00000080] font-[600] text-[14px] border-none outline-none cursor-pointer appearance-none px-3 pr-8"
                                        disabled={isSearching}
                                    >
                                        <option value="Last 3 months">
                                            Last 3 months
                                        </option>
                                        <option value="Last 6 months">
                                            Last 6 months
                                        </option>
                                        <option value="Last 8 months">
                                            Last 8 months
                                        </option>
                                        <option value="Last 12 months">
                                            Last 12 months
                                        </option>
                                        <option value="This year">
                                            This Year
                                        </option>
                                    </select>
                                    {/* <ChevronDown
                                        size={16}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#00000080]"
                                    /> */}
                                    {isSearching && (
                                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                                            <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Booking Overview Bar Chart */}
                            {isSearching &&
                                chartData.bookingOverview.length === 0 ? (
                                <div className="xl:w-[600px] h-[217px] flex items-center justify-center text-gray-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading chart data...</span>
                                    </div>
                                </div>
                            ) : isMobile ? (
                                <div className="flex flex-col gap-2">
                                    {(chartData.bookingOverview ?? []).map((item, index) => (
                                        <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md">
                                            <span className="font-medium text-gray-700">{item.name}</span>
                                            <span className="font-bold text-blue-600">{item.bookings} bookings</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <BookingOverviewBarChart
                                    data={chartData.bookingOverview}
                                />
                            )}
                        </div>

                        <div
                            className="w-full md:min-w-[742px] min-h-[381px] bg-[#FFFFFF] rounded-[10px] py-10 px-10 overflow-hidden"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-col xl:flex-row items-center justify-between mb-12 w-full">
                                <h1 className="text-[24px] font-[700]">
                                    Earnings Summary
                                </h1>
                                <div className="relative">
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) =>
                                            handlePeriodChange(e.target.value)
                                        }
                                        className="w-[140px] h-[33px] bg-[#D9D9D94F] rounded-[6px] text-[#00000080] font-[600] text-[14px] border-none outline-none cursor-pointer appearance-none px-3 pr-8"
                                        disabled={isSearching}
                                    >
                                        <option value="Last 3 months">
                                            Last 3 months
                                        </option>
                                        <option value="Last 6 months">
                                            Last 6 months
                                        </option>
                                        <option value="Last 8 months">
                                            Last 8 months
                                        </option>
                                        <option value="Last 12 months">
                                            Last 12 months
                                        </option>
                                        <option value="This year">
                                            This Year
                                        </option>
                                    </select>
                                    {isSearching && (
                                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                                            <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isMobile ? (
                                <div className="flex flex-col gap-2">
                                    {(chartData.earningSummary ?? []).map((item, index) => (
                                        <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md">
                                            <span className="font-medium text-gray-700">{item.name}</span>
                                            <span className="font-bold text-green-600">${Number(item.value || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EarningSummaryChart
                                    data={chartData.earningSummary}
                                />
                            )}
                        </div>
                    </div>
                    {/* mini right section */}
                </div>
            </div>
        </div>
    );
};

// Add CSS animations for real-time updates
const dashboardStyles = `
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }
    
    @keyframes pulse-glow {
        0%, 100% {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
        }
        50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
        }
    }
    
    .animate-pulse-glow {
        animation: pulse-glow 2s infinite;
    }
`;

// Inject styles
if (
    typeof document !== "undefined" &&
    !document.getElementById("realtime-dashboard-styles")
) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "realtime-dashboard-styles";
    styleSheet.textContent = dashboardStyles;
    document.head.appendChild(styleSheet);
}

export default DashContent;
