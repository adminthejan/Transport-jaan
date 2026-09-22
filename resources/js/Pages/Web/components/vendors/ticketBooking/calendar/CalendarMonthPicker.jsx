import React, { useState } from "react";
import dropdown from "../../../../assets/vendors/calendar/dropDown.svg"

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

/**
 * Controlled month picker. `month` is 0-indexed, driven by the parent
 * (which in turn is driven by the backend's currentMonth/currentYear).
 * Navigating months calls `onMonthChange(month, year)` so the parent can
 * re-fetch that month's real schedules from the server.
 */
const CalendarMonthPicker = ({ month, year, eventDates = [], onMonthChange }) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // For grid: get previous month's trailing days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthDays = getDaysInMonth(prevMonthYear, prevMonth);
  const leadingEmpty = (firstDay + 6) % 7; // Make Sunday first

  // Build calendar grid
  let calendarDays = [];
  // Previous month's days
  for (let i = leadingEmpty - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      current: false,
      key: `prev-${prevMonthDays - i}`
    });
  }
  // Current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      current: true,
      key: `curr-${i}`
    });
  }
  // Next month's days
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push({
      day: calendarDays.length - daysInMonth - leadingEmpty + 1,
      current: false,
      key: `next-${calendarDays.length}`
    });
  }

  const hasEvent = (day) => {
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    return eventDates.includes(dateStr);
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (month === 0) {
      onMonthChange?.(11, year - 1);
    } else {
      onMonthChange?.(month - 1, year);
    }
  };
  const handleNextMonth = () => {
    setSelectedDay(null);
    if (month === 11) {
      onMonthChange?.(0, year + 1);
    } else {
      onMonthChange?.(month + 1, year);
    }
  };

  // Dropdown handlers
  const handleYearSelect = (y) => {
    setShowYearDropdown(false);
    setSelectedDay(null);
    onMonthChange?.(month, y);
  };
  const handleMonthSelect = (m) => {
    setShowMonthDropdown(false);
    setSelectedDay(null);
    onMonthChange?.(m, year);
  };

  // Years for dropdown
  const years = [];
  for (let y = year - 5; y <= year + 5; y++) years.push(y);

  return (
    <div className="w-full h-auto flex flex-col items-center">
      {/* Header: Year, Month, Arrows */}
      <div className="flex flex-row justify-between items-center w-full mb-4">
        {/* Year dropdown */}
        <div className="relative">
          <button
            className="text-[12px] font-[500] text-[#424242] px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-1"
            onClick={() => setShowYearDropdown((v) => !v)}
          >
            {year}
            <span className="ml-1 text-gray-400"><img src={dropdown} /></span>
          </button>
          {showYearDropdown && (
            <div className="absolute z-10 bg-white border rounded shadow w-[80px] max-h-[180px] overflow-y-auto mt-1">
              {years.map((y) => (
                <div
                  key={y}
                  className={`px-3 py-1 cursor-pointer hover:bg-gray-100 ${y === year ? "font-bold bg-gray-50" : ""}`}
                  onClick={() => handleYearSelect(y)}
                >
                  {y}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Month navigation */}
        <div className="flex flex-row items-center gap-2">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
          >
            <span className="text-xl">&#60;</span>
          </button>
          <div className="relative">
            <button
              className="text-[12px] text-[#424242] font-[500] px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-1"
              onClick={() => setShowMonthDropdown((v) => !v)}
            >
              {months[month]}
            </button>
            {showMonthDropdown && (
              <div className="absolute z-10 bg-white border rounded w-[120px] max-h-[180px] overflow-y-auto mt-1">
                {months.map((m, idx) => (
                  <div
                    key={m}
                    className={`px-3 py-1 cursor-pointer hover:bg-gray-100 ${idx === month ? "font-bold bg-gray-50" : ""}`}
                    onClick={() => handleMonthSelect(idx)}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
            onClick={handleNextMonth}
            aria-label="Next Month"
          >
            <span className="text-xl">&#62;</span>
          </button>
        </div>
      </div>
      {/* Calendar grid */}
      <div className="w-full grid grid-cols-7 gap-y-1">
        <div className="col-span-7 grid grid-cols-7 bg-[#F8F8F8] rounded-lg p-2">
          {daysOfWeek.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-[400] text-[#757575] py-1"
            >
              {d}
            </div>
          ))}
        </div>
        {calendarDays.map(({ day, current, key }) => (
          <div
            key={key}
            className={`relative flex items-center justify-center text-[12px] font-[400] h-10 w-10 m-auto my-1 rounded-full cursor-pointer
              ${current ? "text-[#424242]" : "text-gray-300"}
              ${current && day === selectedDay ? "bg-[#0955AC] text-[#FFFFFF] font-[700]" : ""}
              ${current && day !== selectedDay ? "hover:bg-[#E5EFFF]" : ""}
            `}
            onClick={() => current && setSelectedDay(day)}
          >
            {day}
            {current && hasEvent(day) && day !== selectedDay && (
              <span className="absolute bottom-1 w-[4px] h-[4px] rounded-full bg-[#0955AC]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarMonthPicker;
