import React, { useEffect, useState } from "react";

const STATUS_STYLES = {
  active: { bg: "bg-[#C5E6F9]", label: "Active" },
  confirmed: { bg: "bg-[#C5E6F9]", label: "Active" },
  completed: { bg: "bg-[#D6F5DD]", label: "Completed" },
  delayed: { bg: "bg-[#FFE9C2]", label: "Delayed" },
  cancelled: { bg: "bg-[#FFDBDF]", label: "Cancelled" },
};

const getStatusStyle = (status) =>
  STATUS_STYLES[status] || { bg: "bg-[#E5E5E5]", label: status || "—" };

const pad = (n) => String(n).padStart(2, "0");

// Builds a Monday-first month grid (including leading/trailing days from
// adjacent months so every week row has 7 days).
function getMonthGrid(year, month) {
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const numDays = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = (firstDayOfMonth + 6) % 7; // Monday-first offset

  const cells = [];
  for (let i = 0; i < leadingEmpty; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= numDays; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

// events: real schedule rows from the backend, each with a `date` (Y-m-d),
// `type` (bus|train), `title`, `departureTime`, `route`, `status`,
// `bookingsCount`. Grouped here by date for the month grid.
const CalendarGrid = ({ events = [], currentMonth, currentYear }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const eventsByDate = events.reduce((acc, ev) => {
    if (!ev.date) return acc;
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {});

  const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeks = getMonthGrid(currentYear, currentMonth - 1);
  const today = new Date();
  const isToday = (day) =>
    day &&
    today.getFullYear() === currentYear &&
    today.getMonth() === currentMonth - 1 &&
    today.getDate() === day;

  if (isMobile) {
    const daysWithEvents = Object.keys(eventsByDate).sort();
    return (
      <div className="flex flex-col gap-4 p-4">
        {daysWithEvents.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No schedules for this month.
          </div>
        )}
        {daysWithEvents.map((date) => (
          <div key={date} className="bg-white rounded-lg p-4 shadow border">
            <h2 className="text-lg font-bold mb-4">{date}</h2>
            <div className="space-y-2">
              {eventsByDate[date].map((event, idx) => {
                const style = getStatusStyle(event.status);
                return (
                  <div
                    key={event.id || idx}
                    className={`p-3 rounded-lg mb-2 ${style.bg} border border-[#00000014]`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm capitalize">
                        {event.type} · {event.title}
                      </span>
                      <span className="text-[11px] font-[600]">
                        {event.departureTime}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">{event.route}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {event.bookingsCount ?? 0} booking
                      {event.bookingsCount === 1 ? "" : "s"} · {style.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-[700px]">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-t border-l border-[#00000026]">
        {weekDayLabels.map((label) => (
          <div
            key={label}
            className="border-b border-r border-[#00000026] bg-[#F8F8F8] flex justify-center items-center py-2 text-[14px] font-[600] text-[#00000080]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wIdx) => (
        <div key={wIdx} className="grid grid-cols-7 border-l border-[#00000026]">
          {week.map((day, dIdx) => {
            const dateStr = day
              ? `${currentYear}-${pad(currentMonth)}-${pad(day)}`
              : null;
            const dayEvents = dateStr ? eventsByDate[dateStr] || [] : [];

            return (
              <div
                key={dIdx}
                className="border-b border-r border-[#00000026] min-h-[120px] p-2 flex flex-col gap-1 bg-white"
              >
                {day && (
                  <span
                    className={`text-[13px] font-[600] mb-1 ${
                      isToday(day)
                        ? "text-white bg-[#0955AC] rounded-full w-[22px] h-[22px] flex items-center justify-center"
                        : "text-[#00000080]"
                    }`}
                  >
                    {day}
                  </span>
                )}
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                  {dayEvents.map((event, idx) => {
                    const style = getStatusStyle(event.status);
                    return (
                      <div
                        key={event.id || idx}
                        title={`${event.title} · ${event.route} · ${event.bookingsCount ?? 0} bookings`}
                        className={`${style.bg} rounded-[6px] px-2 py-1 text-[10px] leading-tight`}
                      >
                        <div className="flex justify-between gap-1">
                          <span className="font-[600] truncate capitalize">
                            {event.type === "train" ? "🚆" : "🚌"} {event.title}
                          </span>
                          <span className="font-[500]">{event.departureTime}</span>
                        </div>
                        <div className="truncate text-[#00000099]">{event.route}</div>
                        <div className="text-[#00000099]">
                          {event.bookingsCount ?? 0} bkg
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CalendarGrid;
