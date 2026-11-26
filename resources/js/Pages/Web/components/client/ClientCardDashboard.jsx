import React, { useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import {
  Car,
  ClipboardList,
  Ticket,
  Package,
  Warehouse,
  Truck,
  Route as RouteIcon,
  Wallet,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Search,
  Settings,
  AlertCircle,
  Activity,
  Clock,
  CheckCircle2,
  Receipt,
  Inbox,
  CalendarClock,
  LifeBuoy,
  Headphones,
  MessageCircle,
  Siren,
  CreditCard,
  RefreshCw,
  Download,
  Filter,
  Bell,
  Eye,
  Info,
  Sparkles,
} from "lucide-react";

const EMPTY = { total: 0, pending: 0, active: 0, completed: 0, cancelled: 0, spent: 0, recent: [] };

const sumSections = (list) =>
  list.reduce(
    (acc, s) => {
      const x = s || EMPTY;
      return {
        total: acc.total + (x.total || 0),
        pending: acc.pending + (x.pending || 0),
        active: acc.active + (x.active || 0),
        completed: acc.completed + (x.completed || 0),
        cancelled: acc.cancelled + (x.cancelled || 0),
        spent: acc.spent + (x.spent || 0),
      };
    },
    { ...EMPTY }
  );

const money = (v) =>
  Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_TONE = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  completed: "bg-slate-100 text-slate-600 ring-slate-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const BAR_TONE = {
  active: "bg-emerald-500",
  pending: "bg-amber-400",
  completed: "bg-slate-400",
  cancelled: "bg-rose-400",
};

const ACCENT = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  orange: "bg-orange-50 text-orange-600",
  teal: "bg-teal-50 text-teal-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
};

const bucketOf = (status = "") => {
  const s = String(status).toLowerCase();
  if (["cancelled", "canceled", "rejected", "refunded", "expired", "failed", "declined"].includes(s)) return "cancelled";
  if (["completed", "delivered", "returned", "finished", "checked_out"].includes(s)) return "completed";
  if (["pending", "pending_payment", "awaiting_payment", "awaiting_approval", "quoted", "requested", "processing", "draft"].includes(s)) return "pending";
  return "active";
};

const Card = ({ className = "", children, id }) => (
  <div id={id} className={`rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] ${className}`}>
    {children}
  </div>
);

const Kpi = ({ icon: Icon, label, value, accent }) => (
  <Card className="flex items-center gap-3.5 p-4">
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0">
      <p className="poppins truncate text-[22px] font-[700] leading-tight text-slate-900">{value}</p>
      <p className="text-[12px] font-[500] text-slate-500">{label}</p>
    </div>
  </Card>
);

const StatusBar = ({ totals }) => {
  if (!totals.total) return <div className="h-1.5 w-full rounded-full bg-slate-100" />;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      {["active", "pending", "completed", "cancelled"].map((k) =>
        totals[k] ? (
          <span key={k} className={BAR_TONE[k]} style={{ width: `${(totals[k] / totals.total) * 100}%` }} title={`${k}: ${totals[k]}`} />
        ) : null
      )}
    </div>
  );
};

const Legend = ({ label, value, dot }) => (
  <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
    <span className={`h-2 w-2 rounded-full ${dot}`} />
    <span>{label}</span>
    <span className="font-[700] text-slate-800">{value}</span>
  </div>
);

const ServiceCard = ({ icon: Icon, accent, title, description, totals, actions, manageHref, manageLabel = "View my bookings", currency, note }) => (
  <Card className="group flex flex-col p-5 transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-14px_rgba(15,23,42,0.16)]">
    <div className="flex items-start gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT[accent]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="poppins text-[16px] font-[700] text-slate-900">{title}</h2>
        <p className="text-[12.5px] leading-snug text-slate-500">{description}</p>
      </div>
      <Link
        href={manageHref}
        aria-label={`Open ${title}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
      >
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>

    <div className="mt-5 flex items-end justify-between">
      <div>
        <p className="poppins text-[28px] font-[700] leading-none text-slate-900">{totals.total}</p>
        <p className="mt-1 text-[12px] text-slate-500">booking{totals.total === 1 ? "" : "s"} in total</p>
      </div>
      {totals.spent > 0 && (
        <p className="text-right text-[12px] text-slate-500">
          Spent
          <span className="block text-[14px] font-[700] text-slate-800">
            {currency} {money(totals.spent)}
          </span>
        </p>
      )}
    </div>

    <div className="mt-3">
      <StatusBar totals={totals} />
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        <Legend label="Active" value={totals.active} dot="bg-emerald-500" />
        <Legend label="Pending" value={totals.pending} dot="bg-amber-400" />
        <Legend label="Done" value={totals.completed} dot="bg-slate-400" />
        <Legend label="Cancelled" value={totals.cancelled} dot="bg-rose-400" />
      </div>
    </div>

    {note && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] leading-snug text-slate-500">{note}</p>}

    <div className="mt-5 flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-[600] text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <Plus className="h-3.5 w-3.5" /> {a.label}
        </Link>
      ))}
    </div>

    <Link
      href={manageHref}
      className="mt-5 inline-flex items-center gap-1 border-t border-slate-100 pt-3.5 text-[12.5px] font-[700] text-blue-600 hover:text-blue-700"
    >
      {manageLabel} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  </Card>
);


const SERIES = [
  { key: "vehicle", label: "Vehicle", color: "#2563eb" },
  { key: "tickets", label: "Tickets", color: "#7c3aed" },
  { key: "courier", label: "Courier", color: "#f97316" },
  { key: "warehouse", label: "Warehouse", color: "#0d9488" },
  { key: "multimodal", label: "Multimodal", color: "#e11d48" },
];

const TrendChart = ({ trends }) => {
  const months = trends?.months || [];
  const series = SERIES.map((x) => ({ ...x, data: trends?.series?.[x.key] || [] }));
  const max = Math.max(4, ...series.flatMap((x) => x.data));
  const W = 560, H = 190, L = 28, B = 24, T = 8;
  const px = (i) => L + (months.length > 1 ? (i * (W - L - 8)) / (months.length - 1) : 0);
  const py = (v) => T + (H - T - B) * (1 - v / max);
  const empty = series.every((x) => x.data.every((v) => !v));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[200px] w-full" role="img" aria-label="Monthly booking trends">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - 8} y1={py(max * f)} y2={py(max * f)} stroke="#e2e8f0" strokeDasharray="3 4" />
            <text x={L - 6} y={py(max * f) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{Math.round(max * f)}</text>
          </g>
        ))}
        {months.map((m, i) => (
          <text key={m + i} x={px(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{m}</text>
        ))}
        {series.map((x) => (
          <g key={x.key}>
            <polyline fill="none" stroke={x.color} strokeWidth="2" strokeLinejoin="round" points={x.data.map((v, i) => `${px(i)},${py(v)}`).join(" ")} />
            {x.data.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r="2.5" fill={x.color} />)}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {SERIES.map((x) => (
          <span key={x.key} className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: x.color }} /> {x.label}
          </span>
        ))}
      </div>
      {empty && <p className="mt-2 text-[12px] text-slate-400">No bookings in the last six months yet.</p>}
    </div>
  );
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

const PanelHead = ({ title, href, label = "View all" }) => (
  <div className="mb-3 flex items-center justify-between">
    <h2 className="poppins text-[15px] font-[700] text-slate-900">{title}</h2>
    {href && (
      <Link href={href} className="text-[12px] font-[700] text-blue-600 hover:text-blue-700">{label}</Link>
    )}
  </div>
);

const QUICK_BOOK = [
  { icon: Car, label: "Vehicle Rental", sub: "Open dashboard", href: "/clientVehicleDashboard", tone: "bg-blue-50 text-blue-600" },
  { icon: Ticket, label: "Ticket Booking", sub: "Open dashboard", href: "/clientTicketBookingDashboard", tone: "bg-violet-50 text-violet-600" },
  { icon: Package, label: "Courier Booking", sub: "Open dashboard", href: "/courierBookingDashboard", tone: "bg-orange-50 text-orange-600" },
  { icon: Warehouse, label: "Warehouse", sub: "Open dashboard", href: "/warehouseBookingDashboard", tone: "bg-teal-50 text-teal-600" },
  { icon: Truck, label: "Freight", sub: "Open dashboard", href: "/freightBookingDashboard", tone: "bg-rose-50 text-rose-600" },
];

const SHORTCUTS = [
  { icon: ClipboardList, label: "My Bookings", href: "/client/dashboard#bookings" },
  { icon: CalendarClock, label: "Upcoming Services", href: "/client/dashboard#bookings" },
  { icon: Receipt, label: "Payment History", href: "/client/wallet" },
  { icon: Search, label: "Track Courier", href: "/track-shipment" },
];

const HELP = [
  { icon: MessageCircle, label: "Live Chat", sub: "Chat with support", href: "/chat", tone: "bg-emerald-50 text-emerald-600" },
  { icon: Headphones, label: "Contact Us", sub: "24/7 Support", href: "/chat", tone: "bg-violet-50 text-violet-600" },
];


const iso = (days, h = 9) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const sec = (total, pending, active, completed, cancelled, spent) => ({ total, pending, active, completed, cancelled, spent, recent: [] });
const DEMO = {
  sections: {
    vehicle: { land: sec(3, 1, 1, 1, 0, 64500), air: sec(0, 0, 0, 0, 0, 0), sea: sec(0, 0, 0, 0, 0, 0) },
    tickets: { bus: sec(4, 1, 2, 1, 0, 6200), train: sec(2, 0, 1, 1, 0, 3200), flight: sec(2, 0, 1, 1, 0, 0), sea: sec(0, 0, 0, 0, 0, 0) },
    courier: sec(2, 1, 1, 0, 0, 8100),
    warehouse: sec(1, 0, 1, 0, 0, 125500),
    multimodal: sec(1, 0, 0, 1, 0, 14000),
  },
  wallet: { balance: 4200, currency: "LKR" },
  payments: { paid: 221500, pending: 12500, refunds: 5000 },
  upcoming: [{ id: 1 }, { id: 2 }, { id: 3 }],
  trends: {
    months: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
    series: { vehicle: [0, 1, 1, 0, 1, 1], tickets: [1, 2, 1, 3, 2, 3], courier: [0, 0, 1, 0, 1, 0], warehouse: [0, 0, 0, 1, 0, 0], multimodal: [0, 1, 0, 0, 0, 0] },
  },
  actions: [
    { kind: "payment_due", severity: "high", title: "Payment pending — Bus ticket", detail: "BUS-20481 · Hold ends in 2 hours", amount: 1500, cta: { label: "Pay now", href: "/clientTicketBookingDashboard", method: "get" } },
    { kind: "payment_failed", severity: "high", title: "Payment failed — Land vehicle", detail: "VB-77120 · Your card was not charged for this attempt", amount: 11000, cta: { label: "Retry payment", href: "/clientVehicleDashboard", method: "get" } },
    { kind: "upcoming", severity: "info", title: "Train ticket starts in 1 day", detail: "TRN-3301 · 07:30", cta: { label: "View details", href: "/clientTicketBookingDashboard", method: "get" } },
    { kind: "review", severity: "low", title: "Quote ready — Courier", detail: "CR-6K4OTKOD", amount: 7811.69, cta: { label: "Review quote", href: "/courierBookingDashboard", method: "get" } },
    { kind: "low_wallet", severity: "low", title: "Wallet balance is lower than your pending payments", detail: "Top up so you can settle bookings in one tap.", amount: 8300, cta: { label: "Top up wallet", href: "/client/wallet", method: "get" } },
  ],
  bookings: [
    { id: 1, type: "Bus ticket", reference: "BUS-20481", status: "pending", unpaid: true, pay_state: "pending", pay_url: "/clientTicketBookingDashboard", amount: 1500, date: iso(1, 9), view_url: "/clientTicketBookingDashboard" },
    { id: 2, type: "Train ticket", reference: "TRN-3301", status: "confirmed", amount: 3200, date: iso(1, 7), view_url: "/clientTicketBookingDashboard" },
    { id: 3, type: "Land vehicle", reference: "VB-77120", status: "pending", unpaid: true, pay_state: "failed", pay_url: "/clientVehicleDashboard", amount: 11000, date: iso(6, 8), view_url: "/clientVehicleDashboard" },
    { id: 4, type: "Warehouse", reference: "WH-DF10E3E9", status: "confirmed", amount: 125500, date: iso(9, 10), view_url: "/warehouseBookingDashboard" },
    { id: 5, type: "Courier", reference: "CR-6K4OTKOD", status: "quoted", amount: 7811.69, date: iso(3, 14), view_url: "/courierBookingDashboard" },
    { id: 6, type: "Flight ticket", reference: "FL-310", status: "completed", amount: 38000, date: iso(-20, 11), view_url: "/clientTicketBookingDashboard" },
  ],
};

const TYPE_META = {
  "Land vehicle": { icon: Car, tone: "bg-blue-50 text-blue-600" },
  "Air vehicle": { icon: Car, tone: "bg-blue-50 text-blue-600" },
  "Sea vehicle": { icon: Car, tone: "bg-blue-50 text-blue-600" },
  "Bus ticket": { icon: Ticket, tone: "bg-emerald-50 text-emerald-600" },
  "Train ticket": { icon: Ticket, tone: "bg-indigo-50 text-indigo-600" },
  "Flight ticket": { icon: Ticket, tone: "bg-sky-50 text-sky-600" },
  "Sea ticket": { icon: Ticket, tone: "bg-cyan-50 text-cyan-600" },
  Courier: { icon: Package, tone: "bg-orange-50 text-orange-600" },
  Warehouse: { icon: Warehouse, tone: "bg-teal-50 text-teal-600" },
  Multimodal: { icon: RouteIcon, tone: "bg-rose-50 text-rose-600" },
};

const SEVERITY = {
  high: { ring: "border-rose-200 bg-rose-50/60", icon: "bg-rose-100 text-rose-600", btn: "bg-rose-600 hover:bg-rose-700 text-white", Icon: AlertCircle },
  medium: { ring: "border-amber-200 bg-amber-50/60", icon: "bg-amber-100 text-amber-600", btn: "bg-blue-600 hover:bg-blue-700 text-white", Icon: CreditCard },
  low: { ring: "border-slate-200 bg-slate-50/60", icon: "bg-blue-100 text-blue-600", btn: "bg-blue-600 hover:bg-blue-700 text-white", Icon: Info },
  info: { ring: "border-slate-200 bg-slate-50/60", icon: "bg-emerald-100 text-emerald-600", btn: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50", Icon: CalendarClock },
};

// POST ctas (one-click "Retry payment") go through Inertia so the redirect to checkout is followed.
const ActionButton = ({ cta, className }) =>
  cta.method === "post" ? (
    <Link href={cta.href} method="post" as="button" type="button" className={className}>{cta.label}</Link>
  ) : (
    <Link href={cta.href} className={className}>{cta.label}</Link>
  );

const Sparkline = ({ data = [], color = "#2563eb" }) => {
  const W = 120, H = 36;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i * W) / Math.max(1, data.length - 1)},${H - 4 - (v / max) * (H - 8)}`);
  if (data.length < 2) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full" aria-hidden="true" preserveAspectRatio="none">
      <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill={color} opacity="0.1" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const StatCard = ({ icon: Icon, tone, label, value, sub, subTone = "text-slate-500", spark, color }) => (
  <Card className="p-4">
    <div className="flex items-start gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-[12px] font-[500] text-slate-500">{label}</p>
        <p className="poppins truncate text-[22px] font-[700] leading-tight text-slate-900">{value}</p>
      </div>
    </div>
    <div className="mt-2 flex items-end justify-between gap-3">
      <p className={`text-[11.5px] font-[600] ${subTone}`}>{sub}</p>
      <div className="w-24 shrink-0"><Sparkline data={spark} color={color} /></div>
    </div>
  </Card>
);

const PAY_PILL = {
  pending: ["Payment due", "bg-amber-50 text-amber-700 ring-amber-200"],
  failed: ["Payment failed", "bg-rose-50 text-rose-700 ring-rose-200"],
  expired: ["Hold expired", "bg-slate-100 text-slate-600 ring-slate-200"],
  awaiting_vendor: ["Awaiting vendor", "bg-sky-50 text-sky-700 ring-sky-200"],
};

const BookingStatusPill = ({ b }) => {
  const [label, tone] = PAY_PILL[b.pay_state] || [String(b.status || "pending").replace(/_/g, " "), STATUS_TONE[bucketOf(b.status)]];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-[700] capitalize ring-1 ring-inset ${tone}`}>{label}</span>;
};

// The one button a row shows, chosen from what the client can actually do next.
const rowCta = (b) => {
  if (b.pay_state === "pending" && b.pay_url) return { label: "Pay now", href: b.pay_url, method: "get", primary: true };
  if (b.pay_state === "failed" && (b.retry_url || b.pay_url)) return { label: "Retry", href: b.retry_url || b.pay_url, method: b.retry_url ? "post" : "get", primary: true };
  if (b.pay_state === "expired") return { label: "Book again", href: "/landTicketBooking", method: "get", primary: true };
  return null;
};

const TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "unpaid", label: "Needs payment" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const BookingsTable = ({ bookings, currency }) => {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const rows = bookings.filter((b) => {
    const bucket = bucketOf(b.status);
    if (tab === "upcoming" && !(b.date && new Date(b.date) >= new Date() && bucket !== "cancelled" && bucket !== "completed")) return false;
    if (tab === "unpaid" && !b.unpaid) return false;
    if (tab === "completed" && bucket !== "completed") return false;
    if (tab === "cancelled" && bucket !== "cancelled") return false;
    const needle = q.trim().toLowerCase();
    return !needle || `${b.reference} ${b.type} ${b.status}`.toLowerCase().includes(needle);
  });
  const exportCsv = () => {
    const lines = [["Type", "Reference", "Date", "Amount", "Payment", "Status"], ...rows.map((b) => [b.type, b.reference, b.date || "", b.amount ?? "", b.pay_state || "", b.status])];
    const blob = new Blob([lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my-bookings.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Card className="scroll-mt-24 p-5" id="bookings">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="poppins text-[17px] font-[700] text-slate-900">Your Bookings</h2>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <label className="flex min-w-[200px] max-w-[340px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by reference, service…" className="w-full border-0 bg-transparent p-0 text-[12.5px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0" />
          </label>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-[600] text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> Export</button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-[600] transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{t.label}</button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11.5px] font-[700] uppercase tracking-wide text-slate-400">
              <th className="py-2.5 pr-3">Service</th><th className="pr-3">Reference</th><th className="pr-3">Date</th><th className="pr-3">Amount</th><th className="pr-3">Status</th><th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">No bookings match this view.</td></tr>}
            {rows.map((b) => {
              const meta = TYPE_META[b.type] || TYPE_META.Courier;
              return (
                <tr key={`${b.type}-${b.id}`} className="align-middle">
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.tone}`}><meta.icon className="h-4 w-4" /></span>
                      <span className="font-[600] text-slate-800">{b.type}</span>
                    </span>
                  </td>
                  <td className="pr-3 font-[600] text-slate-700">{b.reference}</td>
                  <td className="pr-3 text-slate-600">{fmtDate(b.date || b.created_at)}</td>
                  <td className="pr-3 font-[600] text-slate-700">{b.amount != null ? `${currency} ${money(b.amount)}` : "—"}</td>
                  <td className="pr-3"><BookingStatusPill b={b} /></td>
                  <td className="text-right">
                    {rowCta(b) ? (
                      <ActionButton cta={rowCta(b)} className="inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-[700] text-white hover:bg-blue-700" />
                    ) : (
                      <Link href={b.view_url} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-[700] text-blue-600 hover:bg-blue-50"><Eye className="h-3.5 w-3.5" /> View</Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const ActionRequired = ({ actions, currency }) => (
  <Card className="scroll-mt-24 p-5" id="actions">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="poppins flex items-center gap-2 text-[16px] font-[700] text-slate-900">
        <Bell className="h-4 w-4 text-amber-500" /> Action Required
        {actions.length > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-[700] text-white">{actions.length}</span>}
      </h2>
    </div>
    {actions.length === 0 ? (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-6 w-6" /></span>
        <p className="text-[13px] font-[600] text-slate-700">You're all caught up</p>
        <p className="text-[12px] text-slate-400">No payments or approvals are waiting on you.</p>
      </div>
    ) : (
      <ul className="space-y-2.5">
        {actions.map((a, i) => {
          const sv = SEVERITY[a.severity] || SEVERITY.low;
          return (
            <li key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${sv.ring}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${sv.icon}`}><sv.Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-[700] text-slate-800">{a.title}</p>
                <p className="truncate text-[11.5px] text-slate-500">{a.detail}{a.amount ? ` · ${currency} ${money(a.amount)}` : ""}</p>
              </div>
              <ActionButton cta={a.cta} className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-[700] transition-colors ${sv.btn}`} />
            </li>
          );
        })}
      </ul>
    )}
  </Card>
);

const NextUp = ({ item, currency }) => {
  if (!item) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600"><CalendarClock className="h-6 w-6" /></span>
        <p className="poppins text-[15px] font-[700] text-slate-800">Nothing scheduled</p>
        <p className="text-[12px] text-slate-400">Book a service and your next one shows up here.</p>
      </Card>
    );
  }
  const meta = TYPE_META[item.type] || TYPE_META.Courier;
  const days = Math.ceil((new Date(item.date) - new Date()) / 86400000);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.tone}`}><meta.icon className="h-6 w-6" /></span>
        <h2 className="poppins flex-1 text-[17px] font-[700] text-slate-900">Next Up</h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11.5px] font-[700] text-blue-600">{days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-4">
        <div><p className="text-[11px] text-slate-400">Service</p><p className="text-[13px] font-[700] text-slate-800">{item.type}</p></div>
        <div><p className="text-[11px] text-slate-400">Reference</p><p className="text-[13px] font-[700] text-slate-800">{item.reference}</p></div>
        <div><p className="text-[11px] text-slate-400">Date</p><p className="text-[13px] font-[700] text-slate-800">{fmtDate(item.date)}</p></div>
        <div><p className="text-[11px] text-slate-400">Status</p><span className={`mt-0.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-[700] capitalize ring-1 ring-inset ${STATUS_TONE[bucketOf(item.status)]}`}>{String(item.status).replace(/_/g, " ")}</span></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Link href={item.view_url} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-[700] text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" /> View details</Link>
        <Link href="/track" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-[700] text-slate-700 hover:bg-slate-50"><Search className="h-4 w-4" /> Track</Link>
        <Link href="/client/dashboard#bookings" className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-[12.5px] font-[700] text-rose-600 hover:bg-rose-50">Manage / cancel</Link>
      </div>
    </Card>
  );
};

const SpendBars = ({ trends }) => {
  const months = trends?.months || [];
  const totals = months.map((_, i) => Object.values(trends?.series || {}).reduce((a, s) => a + (s[i] || 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <div className="flex h-[150px] items-end gap-3" role="img" aria-label="Monthly booking activity bar chart">
      {totals.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-[700] text-slate-600">{v}</span>
          <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400" style={{ height: `${Math.max(6, (v / max) * 100)}px` }} />
          <span className="text-[11px] text-slate-400">{months[i]}</span>
        </div>
      ))}
    </div>
  );
};

const QUICK_ACTIONS = [
  { icon: Plus, label: "New Booking", href: "/landTicketBooking", tone: "text-blue-600" },
  { icon: Search, label: "Track Order", href: "/track", tone: "text-violet-600" },
  { icon: Wallet, label: "Wallet", href: "/client/wallet", tone: "text-orange-600" },
  { icon: Receipt, label: "Payments", href: "/client/wallet#transactions", tone: "text-emerald-600" },
  { icon: ClipboardList, label: "All Bookings", href: "/client/dashboard#bookings", tone: "text-sky-600" },
  { icon: Headphones, label: "Support", href: "/chat", tone: "text-rose-600" },
];

const ClientCardDashboard = () => {
  const { auth, overview: real } = usePage().props;
  const realTotal = ["vehicle", "tickets"].reduce((n, g) => n + Object.values(real?.sections?.[g] || {}).reduce((a, x) => a + (x?.total || 0), 0), 0)
    + (real?.sections?.courier?.total || 0) + (real?.sections?.warehouse?.total || 0) + (real?.sections?.multimodal?.total || 0);
  const isDemo = !real || realTotal === 0;
  const overview = isDemo ? { ...DEMO, wallet: real?.wallet?.balance ? real.wallet : DEMO.wallet } : real;
  const sections = overview?.sections || {};
  const wallet = overview?.wallet;
  const upcoming = overview?.upcoming || [];
  const actions = overview?.actions || [];
  const bookings = overview?.bookings || [];
  const payments = overview?.payments || { paid: 0, pending: 0, refunds: 0 };

  const vehicle = useMemo(() => sumSections([sections.vehicle?.land, sections.vehicle?.air, sections.vehicle?.sea]), [sections]);
  const tickets = useMemo(
    () => sumSections([sections.tickets?.bus, sections.tickets?.train, sections.tickets?.flight, sections.tickets?.sea]),
    [sections]
  );
  const courier = useMemo(() => sumSections([sections.courier]), [sections]);
  const warehouse = useMemo(() => sumSections([sections.warehouse]), [sections]);
  const multimodal = useMemo(() => sumSections([sections.multimodal]), [sections]);
  // Freight quotes are not linked to a user account yet, so there is nothing to count.
  const freight = EMPTY;

  const all = sumSections([vehicle, tickets, courier, warehouse, multimodal]);
  const currency = wallet?.currency || "LKR";
  const firstName = (auth?.user?.name || "there").trim().split(/\s+/)[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const trendTotal = (overview?.trends?.months || []).map((_, i) => Object.values(overview?.trends?.series || {}).reduce((a, x) => a + (x[i] || 0), 0));
  const nextUp = [...bookings]
    .filter((b) => b.date && new Date(b.date) >= new Date() && !b.unpaid && ["active"].includes(bucketOf(b.status)))
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  const cards = [
    {
      icon: Car,
      accent: "blue",
      title: "Vehicle Rental",
      description: "Rent land, air and sea vehicles.",
      totals: vehicle,
      actions: [
        { label: "Land", href: "/vehicleList" },
        { label: "Air", href: "/airVehicleList" },
        { label: "Sea", href: "/seaVehicleList" },
      ],
      manageHref: "/clientVehicleDashboard",
    },
    {
      icon: Ticket,
      accent: "violet",
      title: "Ticket Booking",
      description: "Bus, train, flight and sea tickets.",
      totals: tickets,
      actions: [
        { label: "Land", href: "/landTicketBooking" },
        { label: "Air", href: "/ticketBooking?type=flight" },
        { label: "Sea", href: "/seaTicketBooking" },
      ],
      manageHref: "/clientTicketBookingDashboard",
    },
    {
      icon: Package,
      accent: "orange",
      title: "Courier Service",
      description: "Send parcels and track shipments.",
      totals: courier,
      actions: [
        { label: "Send a parcel", href: "/courier-service" },
        { label: "Track", href: "/track-shipment" },
      ],
      manageHref: "/courierBookingDashboard",
      manageLabel: "My shipments",
    },
    {
      icon: Warehouse,
      accent: "teal",
      title: "Warehouse Services",
      description: "Find and reserve storage space.",
      totals: warehouse,
      actions: [{ label: "Find a warehouse", href: "/warehouseList" }],
      manageHref: "/warehouseBookingDashboard",
    },
    {
      icon: Truck,
      accent: "sky",
      title: "Freight Services",
      description: "Request freight quotes and shipping.",
      totals: freight,
      actions: [{ label: "Get a quote", href: "/freight-home" }],
      manageHref: "/freightBookingDashboard",
      note: "Freight quotes are handled by our team and are not tracked on this dashboard yet.",
    },
    {
      icon: RouteIcon,
      accent: "rose",
      title: "Multimodal Journeys",
      description: "Combine land, air and sea in one trip.",
      totals: multimodal,
      actions: [{ label: "Plan a journey", href: "/multiModel/plan-journey" }],
      manageHref: "/client/dashboard#bookings",
    },
  ];


  return (
    <div className="w-full pb-10 lg:pl-4">
      {isDemo && (
        <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-[12.5px] text-blue-800">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>You're viewing <b>sample data</b> so you can see how the dashboard works. It switches to your real bookings as soon as you make one.</span>
        </div>
      )}

      {/* Greeting + wallet */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-50" />
          <div className="pointer-events-none absolute -right-4 top-20 h-24 w-24 rounded-full bg-violet-50" />
          <div className="relative">
            <p className="poppins text-[11px] font-[700] uppercase tracking-[0.14em] text-blue-600">{today}</p>
            <h1 className="poppins mt-1.5 text-[28px] font-[700] leading-tight text-slate-900 sm:text-[34px]">Hello, {firstName} <span aria-hidden="true">👋</span></h1>
            <p className="mt-1.5 max-w-[540px] text-[14px] text-slate-500">
              {actions.length > 0
                ? `${actions.length} thing${actions.length === 1 ? "" : "s"} need${actions.length === 1 ? "s" : ""} your attention — settle them below to keep your trips on track.`
                : "Everything is up to date. Pick a service to book something new."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/client/dashboard#bookings" className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-[12.5px] font-[700] text-white shadow-sm transition-colors hover:bg-blue-700"><ClipboardList className="h-4 w-4" /> All bookings</Link>
              <Link href="/track" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-[700] text-slate-700 transition-colors hover:bg-slate-50"><Search className="h-4 w-4" /> Track an order</Link>
              <Link href="/clientDashboardSettings" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-[700] text-slate-700 transition-colors hover:bg-slate-50"><Settings className="h-4 w-4" /> Settings</Link>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-[600] text-slate-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Wallet className="h-4 w-4" /></span>
              Wallet balance
            </div>
            <p className="poppins mt-3 text-[32px] font-[700] leading-none text-slate-900">{wallet ? `${currency} ${money(wallet.balance)}` : "—"}</p>
            {!wallet && <p className="mt-1 text-[11.5px] text-slate-400">Balance unavailable right now.</p>}
          </div>
          <Link href="/client/wallet" className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[12.5px] font-[700] text-white transition-colors hover:bg-slate-800">Top up / manage <ArrowRight className="h-4 w-4" /></Link>
        </Card>
      </div>

      {/* Quick booking */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {QUICK_BOOK.map((q) => (
          <Link key={q.label} href={q.href} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${q.tone}`}><q.icon className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="poppins block truncate text-[13px] font-[700] text-slate-900">{q.label}</span>
              <span className="block truncate text-[11.5px] text-slate-500">{q.sub}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* KPI strip with sparklines */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} tone="bg-blue-50 text-blue-600" label="Total Bookings" value={all.total} sub={`${all.completed} completed`} spark={trendTotal} color="#2563eb" />
        <StatCard icon={CalendarClock} tone="bg-emerald-50 text-emerald-600" label="Upcoming Services" value={upcoming.length} sub={nextUp ? `Next: ${fmtDate(nextUp.date)}` : "Nothing scheduled"} spark={overview?.trends?.series?.tickets} color="#10b981" />
        <StatCard icon={Clock} tone="bg-orange-50 text-orange-600" label="Pending Payments" value={`${currency} ${money(payments.pending)}`} sub={actions.some((a) => a.kind.startsWith("payment")) ? "Action required" : "All settled"} subTone={actions.some((a) => a.kind.startsWith("payment")) ? "text-orange-600" : "text-emerald-600"} spark={overview?.trends?.series?.vehicle} color="#f97316" />
        <StatCard icon={Receipt} tone="bg-violet-50 text-violet-600" label="Total Spent" value={`${currency} ${money(all.spent || payments.paid)}`} sub="This year" spark={trendTotal} color="#7c3aed" />
      </div>

      {/* Next up + Action required */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <NextUp item={nextUp} currency={currency} />
        <ActionRequired actions={actions} currency={currency} />
      </div>

      {/* Bookings table */}
      <div className="mt-5"><BookingsTable bookings={bookings} currency={currency} /></div>

      {/* Charts + payment summary */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <PanelHead title="Booking Activity" />
          <p className="-mt-2 mb-3 text-[11.5px] text-slate-400">Last 6 months</p>
          <SpendBars trends={overview?.trends} />
        </Card>
        <Card className="p-5 lg:col-span-1">
          <PanelHead title="Monthly Booking Trends" />
          <TrendChart trends={overview?.trends} />
        </Card>
        <Card className="flex flex-col p-5">
          <PanelHead title="Payment Summary" href="/client/wallet" label="Transactions" />
          <dl className="space-y-3 text-[13px]">
            <div className="flex justify-between"><dt className="text-slate-500">Pending payments</dt><dd className="font-[700] text-amber-600">{currency} {money(payments.pending)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Completed payments</dt><dd className="font-[700] text-emerald-600">{currency} {money(payments.paid)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Refunds</dt><dd className="font-[700] text-slate-800">{currency} {money(payments.refunds)}</dd></div>
          </dl>
          <div className="mt-auto pt-5">
            <Link href="/client/wallet" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-[12.5px] font-[700] text-blue-600 hover:bg-blue-50">View all payments <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="mt-5 p-5">
        <PanelHead title="Quick Actions" />
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {QUICK_ACTIONS.map((x) => (
            <Link key={x.label} href={x.href} className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white px-2 py-4 text-center transition-shadow hover:shadow-md">
              <x.icon className={`h-6 w-6 ${x.tone}`} />
              <span className="text-[12px] font-[700] text-slate-700">{x.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Section cards */}
      <h2 className="poppins mb-4 mt-9 text-[18px] font-[700] text-slate-900">Your services</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <ServiceCard key={c.title} {...c} currency={currency} />
        ))}
      </div>

      {/* Help */}
      <Card className="mt-9 p-5">
        <PanelHead title="Need Help?" />
        <div className="flex flex-wrap items-center gap-6">
          {HELP.map((x) => (
            <Link key={x.label} href={x.href} className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${x.tone}`}><x.icon className="h-4 w-4" /></span>
              <span><span className="block text-[12.5px] font-[700] text-slate-800">{x.label}</span><span className="block text-[11px] text-slate-500">{x.sub}</span></span>
            </Link>
          ))}
          <Link href="/chat" className="ml-auto flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-[700] text-rose-600 hover:bg-rose-100"><Siren className="h-3.5 w-3.5" /> Emergency Support</Link>
        </div>
      </Card>
    </div>
  );
};

export default ClientCardDashboard;
