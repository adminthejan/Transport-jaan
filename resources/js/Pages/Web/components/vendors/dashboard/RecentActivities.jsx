import React, { useMemo } from "react";

/* ====== inline icons (so you don't depend on extra assets) ====== */
const IconWrap = ({ children }) => (
  <div className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center shadow-sm">
    {children}
  </div>
);
const CalendarIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6">
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <line x1="8" y1="2.5" x2="8" y2="6.5" />
    <line x1="16" y1="2.5" x2="16" y2="6.5" />
    <line x1="3" y1="9" x2="21" y2="9" />
  </svg>
);
const WarningIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="7" x2="12" y2="13" />
    <circle cx="12" cy="17" r="1.2" fill="#111" stroke="none" />
  </svg>
);
const CarIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6">
    <path d="M3 12l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 7l2 5" />
    <rect x="4" y="12" width="16" height="5" rx="1.5" />
    <circle cx="7.5" cy="18.5" r="1.5" />
    <circle cx="16.5" cy="18.5" r="1.5" />
  </svg>
);
const CheckIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12.5l2.8 2.8L16 10" />
  </svg>
);

/* ====== helpers ====== */
function parseDateLike(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input)) return input;
  if (typeof input === "number") return new Date(input);
  if (typeof input === "string") {
    let s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/.test(s)) s = s.replace(" ", "T");
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00:00";
    const d = new Date(s);
    if (!isNaN(d)) return d;
  }
  return null;
}
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function fmtTime(dt) {
  try {
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Split first full name (if present) to bold it like the mock */
function splitBold(description, customerName) {
  if (customerName) {
    const idx = description.toLowerCase().indexOf(customerName.toLowerCase());
    if (idx === 0) {
      return { bold: customerName, rest: description.slice(customerName.length).trimStart() };
    }
  }
  const m = description.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s(.*)$/); // "Alice Johnson ..."
  if (m) return { bold: m[1], rest: m[2] || "" };
  return { bold: description, rest: "" };
}

function pickIcon(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("complete") || t === "success" || t === "done") return <CheckIcon />;
  if (t.includes("pending") || t.includes("warn") || t.includes("issue")) return <WarningIcon />;
  if (t.includes("vehicle") || t.includes("car")) return <CarIcon />;
  return <CalendarIcon />;
}

/* ====== one activity row with connector ====== */
const ActivityRow = ({ item, drawConnector }) => {
  const { description, datetime, type, customer_name } = item;
  const { bold, rest } = splitBold(description || "", customer_name || "");
  return (
    <div className="flex gap-10">
      {/* left rail */}
      <div className="flex flex-col items-center pt-2">
        <IconWrap>{pickIcon(type)}</IconWrap>
        {drawConnector && <div className="w-[2px] h-[54px] bg-[#00000033]" />}
      </div>

      {/* right text */}
      <div className="flex-1 pt-2">
        <p className="text-[16px] md:text-[18px] leading-6">
          <span className="font-[700]">{bold}</span>
          {rest ? <span className="text-[#6B7280] font-[600]"> {" "}{rest}</span> : null}
        </p>
        {datetime && (
          <p className="text-[14px] md:text-[16px] font-[600] text-[#0F0F0F80] mt-2">{fmtTime(datetime)}</p>
        )}
      </div>
    </div>
  );
};

/* ====== section renderer (Today / Yesterday) ====== */
const Section = ({ title, items }) => (
  <>
    <h2 className="text-[18px] md:text-[20px] font-[600] text-[#0F0F0F80] py-3">{title}</h2>
    {items.length ? (
      <div className="flex flex-col">
        {items.map((it, idx) => (
          <ActivityRow
            key={it.id ?? `${title}-${idx}`}
            item={it}
            drawConnector={idx !== items.length - 1}
          />
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500 px-2">No activity {title.toLowerCase()}.</p>
    )}
  </>
);

/* ====== main ====== */
const RecentActivities = ({ activities }) => {
  // Normalize payload (supports many shapes)
  const items = useMemo(() => {
    const arr = Array.isArray(activities) ? activities : (activities?.data || []);
    return arr
      .map((a, i) => {
        const dt =
          parseDateLike(a?.datetime) ||
          parseDateLike(a?.created_at) ||
          parseDateLike(a?.date) ||
          null;

        // Compose a sentence like your pic if not provided:
        // Prefer given 'description'; otherwise build from pieces.
        let description = a?.description || a?.title || "";
        if (!description) {
          const actor   = a?.customer_name || a?.client_name || a?.actor || "Customer";
          const action  = a?.action || a?.status || "completed a booking";
          const vehicle = a?.vehicle_name || a?.vehicle || a?.car;
          const plate   = a?.plate || a?.registration_number;
          const forTxt  = vehicle ? ` for ${vehicle}${plate ? ` (${plate})` : ""}` : "";
          description   = `${actor} ${action}${forTxt}`;
        }

        return {
          id: a?.id ?? i,
          description,
          customer_name: a?.customer_name || a?.client_name || a?.actor || null,
          type: a?.type || a?.status || a?.action || "",
          datetime: dt,
        };
      })
      .filter((x) => x.description && x.datetime)
      .sort((a, b) => b.datetime - a.datetime);
  }, [activities]);

  // Split into Today / Yesterday (like your mock)
  const today = startOfDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const todayList = items.filter((i) => sameDay(startOfDay(i.datetime), today));
  const yestList  = items.filter((i) => sameDay(startOfDay(i.datetime), yesterday));

  return (
    <div
      className="w-full min-w-0 min-h-0 bg-[#0F0F0F08] rounded-[10px] px-4 md:px-10 py-5 md:py-10"
      style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
    >
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-[20px] md:text-[24px] font-[700]">Recent Activities</h1>
        <h1 className="text-[20px] md:text-[24px] font-[700]">...</h1>
      </div>

      <Section title="Today" items={todayList} />
      <Section title="Yesterday" items={yestList} />
      {/* (If you want “Older”, add another Section here) */}
    </div>
  );
};

export default RecentActivities;
