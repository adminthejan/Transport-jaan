import React, { useMemo, useState } from "react";
import { Check } from "lucide-react";

const DURATION_PRESETS = [
  { value: "6", label: "6 Months" },
  { value: "1", label: "Month" },
  { value: "12", label: "Year" },
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Builds a Sun-Sat grid for a given month, front/back padded with nulls so
 * every row has 7 cells and the grid always spans full weeks.
 */
const buildMonthMatrix = (year, month) => {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay(); // 0 = Sunday

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
};

// Six month-shortcut cards starting from the current month, matching the
// Warehowz "jump to a month" row.
const buildMonthShortcuts = (base, count = 6) => {
  const shortcuts = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    shortcuts.push(d);
  }
  return shortcuts;
};

const MiniCalendar = ({ viewDate, selectedDate, today, onSelectDay }) => {
  const rows = useMemo(
    () => buildMonthMatrix(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  );

  return (
    <div className="flex-1 min-w-[220px]">
      <div className="text-center text-[12px] font-[700] text-[#0F0F0F] mb-2">
        {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] font-[600] text-[#9CA3AF] py-1">
            {w}
          </div>
        ))}
        {rows.map((row, ri) =>
          row.map((day, di) => {
            if (!day) return <div key={`${ri}-${di}`} />;
            const isPast = day < today;
            const isSelected = selectedDate && toISODate(day) === toISODate(selectedDate);
            return (
              <button
                type="button"
                key={`${ri}-${di}`}
                disabled={isPast}
                onClick={() => onSelectDay(day)}
                className={`h-7 w-7 mx-auto rounded-full text-[11px] font-[600] transition-colors ${
                  isSelected
                    ? "bg-[#0955AC] text-white"
                    : isPast
                    ? "text-[#D1D5DB] cursor-not-allowed"
                    : "text-[#374151] hover:bg-[#F1F5F9]"
                }`}
              >
                {day.getDate()}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * Warehowz-style storage-date picker: a segmented "I'm flexible / Choose
 * dates" toggle, duration-preset pills, a row of month-shortcut cards, and
 * (in "choose dates" mode) a real two-month calendar grid — all built with
 * plain Date math, no calendar library.
 */
const WarehouseDatePicker = ({
  dateMode,
  setDateMode,
  moveinDate,
  onSelectDate,
  leaseDuration,
  onSelectDuration,
  onClose,
}) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewDate, setViewDate] = useState(() => {
    const parsed = moveinDate ? new Date(moveinDate) : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? new Date(parsed.getFullYear(), parsed.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const nextViewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  const monthShortcuts = useMemo(() => buildMonthShortcuts(today, 6), [today]);
  const selectedDate = moveinDate ? new Date(moveinDate) : null;

  const jumpToMonth = (d) => setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));

  const handleSelectDay = (day) => {
    onSelectDate(toISODate(day));
  };

  return (
    <div className="absolute z-50 mt-2 left-0 right-0 sm:right-auto sm:w-[560px] bg-white rounded-[15px] shadow-2xl shadow-[#00000030] border border-[#0000001A] p-5">
      {/* Segmented toggle */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[13px] font-[700] text-[#0F0F0F]">Storage Dates</h4>
        <div className="inline-flex gap-1 p-1.5 rounded-full bg-[#F1F5F9] shadow-inner text-[11px]">
          {[
            { value: "flexible", label: "I'm flexible" },
            { value: "choose", label: "Choose dates" },
          ].map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setDateMode(m.value)}
              className={`px-3 py-1.5 rounded-full font-[700] transition-colors ${
                dateMode === m.value
                  ? "bg-[#0955AC] text-white shadow-md"
                  : "text-[#475569] hover:bg-white/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration presets */}
      <div className="mb-4">
        <p className="text-[10px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-2">
          Duration
        </p>
        <div className="flex gap-2">
          {DURATION_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.value}
              onClick={() => onSelectDuration(preset.value)}
              className={`flex-1 py-2 rounded-[8px] text-[12px] font-[700] transition-colors border ${
                leaseDuration === preset.value
                  ? "bg-[#0955AC] border-[#0955AC] text-white"
                  : "bg-white border-[#0000001A] text-[#475569] hover:border-[#0955AC] hover:text-[#0955AC]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month-shortcut row */}
      <div className="mb-4">
        <p className="text-[10px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-2">
          Jump to a month
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {monthShortcuts.map((m) => {
            const active =
              m.getMonth() === viewDate.getMonth() && m.getFullYear() === viewDate.getFullYear();
            return (
              <button
                type="button"
                key={`${m.getFullYear()}-${m.getMonth()}`}
                onClick={() => {
                  jumpToMonth(m);
                  if (dateMode === "flexible") {
                    onSelectDate(toISODate(new Date(m.getFullYear(), m.getMonth(), 1)));
                  }
                }}
                className={`shrink-0 px-3 py-2 rounded-[8px] text-[11px] font-[600] border transition-colors whitespace-nowrap ${
                  active
                    ? "bg-[#0955AC] border-[#0955AC] text-white"
                    : "bg-white border-[#0000001A] text-[#475569] hover:border-[#0955AC] hover:text-[#0955AC]"
                }`}
              >
                {MONTH_NAMES[m.getMonth()].slice(0, 3)} {m.getFullYear()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-month calendar grid — only for "choose dates" mode */}
      {dateMode === "choose" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="text-[11px] font-[700] text-[#0955AC] hover:underline"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="text-[11px] font-[700] text-[#0955AC] hover:underline"
            >
              Next →
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 border-t border-[#00000014] pt-3">
            <MiniCalendar
              viewDate={viewDate}
              selectedDate={selectedDate}
              today={today}
              onSelectDay={handleSelectDay}
            />
            <MiniCalendar
              viewDate={nextViewDate}
              selectedDate={selectedDate}
              today={today}
              onSelectDay={handleSelectDay}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#00000014]">
        <span className="text-[11px] text-[#6B7280]">
          {dateMode === "choose" && selectedDate
            ? `Selected: ${selectedDate.toLocaleDateString()}`
            : dateMode === "flexible" && leaseDuration
            ? `${DURATION_PRESETS.find((p) => p.value === leaseDuration)?.label || ""} flexible`
            : "No dates selected yet"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 bg-[#0955AC] text-white text-[12px] font-[700] px-4 py-2 rounded-[8px] hover:bg-[#073E82] transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Done
        </button>
      </div>
    </div>
  );
};

export default WarehouseDatePicker;
