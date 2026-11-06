import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Search, Truck } from "lucide-react";

const EMPTY = {
    summary: {
        totalEvents: 0,
        pickups: 0,
        deliveries: 0,
        exceptions: 0,
        highPriority: 0,
        activeShipments: 0,
    },
    filters: {
        month: "",
        eventType: "all",
        q: "",
        selectedDate: "",
    },
    monthLabel: "",
    monthStart: "",
    monthEnd: "",
    selectedDate: "",
    events: [],
    dayBuckets: {},
    agenda: [],
    exceptionQueue: [],
    eventTypeOptions: [
        { value: "all", label: "All" },
        { value: "pickup", label: "Pickup" },
        { value: "delivery", label: "Delivery" },
        { value: "exception", label: "Exception" },
    ],
};

const monthKeyToDate = (monthKey) => {
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [year, month] = monthKey.split("-").map((value) => Number(value));
    return new Date(year, month - 1, 1);
};

const formatMonthKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
};

const shiftMonth = (monthKey, delta) => {
    const base = monthKeyToDate(monthKey);
    return formatMonthKey(new Date(base.getFullYear(), base.getMonth() + delta, 1));
};

const toDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const buildMonthMatrix = (monthKey) => {
    const monthDate = monthKeyToDate(monthKey);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    const last = new Date(year, month + 1, 0);
    const end = new Date(last);
    end.setDate(last.getDate() + (6 - last.getDay()));

    const weeks = [];
    const cursor = new Date(start);

    while (cursor <= end) {
        const week = [];
        for (let i = 0; i < 7; i += 1) {
            week.push({
                dateKey: toDateKey(cursor),
                day: cursor.getDate(),
                inMonth: cursor.getMonth() === month,
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        weeks.push(week);
    }

    return weeks;
};

const toneClasses = {
    pickup: "bg-[#EAF1FF] text-[#0F3D8A]",
    delivery: "bg-[#E8FAEF] text-[#1B6C3A]",
    exception: "bg-[#FFE9E9] text-[#8A1C1C]",
    eta: "bg-[#FEF3C7] text-[#92400E]",
    delivered: "bg-[#E8FAEF] text-[#1B6C3A]",
};

const CalendarContent = () => {
    const pageProps = usePage().props;
    const calendar = pageProps.courierCalendar || EMPTY;

    const [search, setSearch] = useState(calendar.filters?.q || "");
    const [selectedDate, setSelectedDate] = useState(calendar.selectedDate || "");

    useEffect(() => {
        setSearch(calendar.filters?.q || "");
        setSelectedDate(calendar.selectedDate || "");
    }, [calendar.filters?.q, calendar.selectedDate, calendar.filters?.month]);

    const weeks = useMemo(() => buildMonthMatrix(calendar.filters?.month), [calendar.filters?.month]);

    const eventsByDate = useMemo(() => {
        const grouped = {};
        (calendar.events || []).forEach((event) => {
            if (!grouped[event.date]) {
                grouped[event.date] = [];
            }
            grouped[event.date].push(event);
        });
        return grouped;
    }, [calendar.events]);

    const agenda = useMemo(() => {
        if (!selectedDate) {
            return [];
        }

        return (eventsByDate[selectedDate] || []).slice().sort((a, b) => {
            const at = String(a.time || "");
            const bt = String(b.time || "");
            if (at === bt) return 0;
            return at > bt ? 1 : -1;
        });
    }, [eventsByDate, selectedDate]);

    const applyFilters = (next) => {
        const selectedDateForRequest =
            next.selectedDate ?? selectedDate ?? calendar.filters?.selectedDate ?? calendar.selectedDate;

        router.get(
            route("courierService.calendar"),
            {
                month: next.month ?? calendar.filters?.month,
                eventType: next.eventType ?? calendar.filters?.eventType,
                q: next.q ?? calendar.filters?.q,
                selectedDate: selectedDateForRequest,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const goToToday = () => {
        const today = new Date();
        const todayKey = toDateKey(today);
        setSelectedDate(todayKey);
        applyFilters({ month: formatMonthKey(today), selectedDate: todayKey });
    };

    const isToday = (dateKey) => dateKey === toDateKey(new Date());

    return (
        <div className="w-full h-auto lg:pl-4 lg:pr-5 pt-6 pb-12">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[34px] font-[700]">Courier Operations Calendar</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                        Plan pickups, monitor delivery windows, and resolve exceptions by day.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={goToToday}
                    className="h-[38px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] inline-flex items-center gap-2"
                >
                    <CalendarDays size={15} />
                    Today
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Total Events</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1">{calendar.summary.totalEvents}</p>
                </div>
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Pickups</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1">{calendar.summary.pickups}</p>
                </div>
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Deliveries / ETA</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1">{calendar.summary.deliveries}</p>
                </div>
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Exceptions</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1 text-[#B91C1C]">{calendar.summary.exceptions}</p>
                </div>
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">High Priority</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1 text-[#92400E]">{calendar.summary.highPriority}</p>
                </div>
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Active Shipments</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1">{calendar.summary.activeShipments}</p>
                </div>
            </div>

            <div className="bg-white rounded-[10px] p-4 mb-6" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                    <div className="h-[38px] rounded-[8px] bg-[#F3F4F6] px-3 flex items-center gap-2">
                        <Search size={16} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    applyFilters({ q: search });
                                }
                            }}
                            placeholder="Search by booking, tracking, client, service"
                            className="w-full border-none bg-transparent outline-none focus:ring-0"
                        />
                    </div>

                    <select
                        value={calendar.filters?.eventType || "all"}
                        onChange={(e) => applyFilters({ eventType: e.target.value })}
                        className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]"
                    >
                        {(calendar.eventTypeOptions || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <div className="flex items-center justify-center gap-1">
                        <button
                            type="button"
                            className="size-[34px] rounded-[8px] bg-[#F3F4F6] flex items-center justify-center"
                            onClick={() => applyFilters({ month: shiftMonth(calendar.filters?.month, -1) })}
                            aria-label="Previous month"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            className="size-[34px] rounded-[8px] bg-[#F3F4F6] flex items-center justify-center"
                            onClick={() => applyFilters({ month: shiftMonth(calendar.filters?.month, 1) })}
                            aria-label="Next month"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="h-[38px] rounded-[8px] bg-[#F3F4F6] px-4 flex items-center justify-center text-[13px] font-[700] text-[#111827]">
                        {calendar.monthLabel || "Calendar"}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-5">
                <div className="bg-white rounded-[10px] p-4" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <div className="grid grid-cols-7 gap-2 text-center text-[12px] font-[700] text-[#6B7280] mb-2">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                    </div>

                    <div className="space-y-2">
                        {weeks.map((week, weekIdx) => (
                            <div key={`week-${weekIdx}`} className="grid grid-cols-7 gap-2">
                                {week.map((day) => {
                                    const bucket = calendar.dayBuckets?.[day.dateKey] || { total: 0, pickup: 0, delivery: 0, exception: 0 };
                                    const dayEvents = eventsByDate[day.dateKey] || [];
                                    const active = selectedDate === day.dateKey;

                                    return (
                                        <button
                                            type="button"
                                            key={day.dateKey}
                                            onClick={() => {
                                                setSelectedDate(day.dateKey);
                                                applyFilters({ selectedDate: day.dateKey });
                                            }}
                                            className={`min-h-[112px] rounded-[10px] border p-2 text-left transition-colors ${
                                                active
                                                    ? "border-[#0955AC] bg-[#0955AC12]"
                                                    : "border-[#E5E7EB] hover:bg-[#F8FAFC]"
                                            } ${day.inMonth ? "" : "opacity-50"}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[12px] font-[700] ${isToday(day.dateKey) ? "text-[#0955AC]" : "text-[#374151]"}`}>
                                                    {day.day}
                                                </span>
                                                {bucket.exception > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFE9E9] text-[#8A1C1C] font-[700]">
                                                        {bucket.exception}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-[#6B7280] mb-1">{bucket.total} events</div>
                                            <div className="space-y-1">
                                                {dayEvents.slice(0, 2).map((event) => (
                                                    <div key={event.id} className={`text-[10px] px-2 py-1 rounded ${toneClasses[event.tone] || "bg-[#F3F4F6] text-[#374151]"}`}>
                                                        {event.time} • {event.type}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 2 && (
                                                    <div className="text-[10px] text-[#6B7280]">+{dayEvents.length - 2} more</div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-[10px] p-4" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                        <h2 className="text-[18px] font-[700] mb-1">Daily Agenda</h2>
                        <p className="text-[12px] text-[#6B7280] mb-3">{selectedDate || "Select a date"}</p>

                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                            {agenda.length > 0 ? (
                                agenda.map((item) => (
                                    <div key={item.id} className={`rounded-[8px] px-3 py-2 ${toneClasses[item.tone] || "bg-[#F3F4F6] text-[#374151]"}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[12px] font-[700] truncate">{item.title}</p>
                                            <span className="text-[11px] font-[700]">{item.time}</span>
                                        </div>
                                        <p className="text-[11px] mt-1 truncate">{item.subtitle}</p>
                                        <p className="text-[10px] mt-1 opacity-80">{item.bookingNumber}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[13px] text-[#6B7280] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[8px] px-3 py-4">
                                    No scheduled events for this date.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[10px] p-4" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle size={16} className="text-[#B91C1C]" />
                            <h2 className="text-[16px] font-[700]">Exception Queue</h2>
                        </div>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {(calendar.exceptionQueue || []).length > 0 ? (
                                (calendar.exceptionQueue || []).map((item) => (
                                    <div key={item.id} className="rounded-[8px] px-3 py-2 bg-[#FFE9E9] text-[#8A1C1C]">
                                        <p className="text-[12px] font-[700] truncate">{item.title}</p>
                                        <p className="text-[11px] mt-1">{item.date} • {item.time}</p>
                                        <p className="text-[11px] mt-1 truncate">{item.client}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[13px] text-[#6B7280] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[8px] px-3 py-4">
                                    No exception events in this period.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[10px] p-4" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Truck size={16} className="text-[#0955AC]" />
                            <h2 className="text-[16px] font-[700]">Legend</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                            <div className="px-2 py-1 rounded bg-[#EAF1FF] text-[#0F3D8A]">Pickup</div>
                            <div className="px-2 py-1 rounded bg-[#E8FAEF] text-[#1B6C3A]">Delivery</div>
                            <div className="px-2 py-1 rounded bg-[#FEF3C7] text-[#92400E]">ETA</div>
                            <div className="px-2 py-1 rounded bg-[#FFE9E9] text-[#8A1C1C]">Exception</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarContent;
