import React, { useMemo } from "react";
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

const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] ${className}`}>
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
  { icon: Car, label: "Rent Vehicle", sub: "Cars, Vans, Buses", href: "/vehicleList", tone: "bg-blue-50 text-blue-600" },
  { icon: Ticket, label: "Book Ticket", sub: "Train, Bus, Flight", href: "/landTicketBooking", tone: "bg-violet-50 text-violet-600" },
  { icon: Package, label: "Send Courier", sub: "Documents, Packages", href: "/courier-service", tone: "bg-orange-50 text-orange-600" },
  { icon: Warehouse, label: "Book Warehouse", sub: "Storage Solutions", href: "/warehouseList", tone: "bg-teal-50 text-teal-600" },
  { icon: Truck, label: "Freight Quote", sub: "Get Quote", href: "/freight-home", tone: "bg-rose-50 text-rose-600" },
];

const SHORTCUTS = [
  { icon: ClipboardList, label: "My Bookings", href: "/clientAllBookings" },
  { icon: CalendarClock, label: "Upcoming Services", href: "/clientAllBookings" },
  { icon: Receipt, label: "Payment History", href: "/client/wallet" },
  { icon: Search, label: "Track Courier", href: "/track-shipment" },
];

const HELP = [
  { icon: MessageCircle, label: "Live Chat", sub: "Chat with support", href: "/chat", tone: "bg-emerald-50 text-emerald-600" },
  { icon: Headphones, label: "Contact Us", sub: "24/7 Support", href: "/chat", tone: "bg-violet-50 text-violet-600" },
];

const ClientCardDashboard = () => {
  const { auth, overview } = usePage().props;
  const sections = overview?.sections || {};
  const wallet = overview?.wallet;
  const recent = overview?.recent || [];
  const upcoming = overview?.upcoming || [];
  const attentionItems = overview?.attention || [];
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
      manageHref: "/clientAllBookings",
    },
  ];

  // Send the user to the first section that actually has something waiting on them.
  const attention = cards.find((c) => c.totals.pending > 0);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 xl:py-10">
      {/* Greeting + wallet */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-50" />
          <div className="pointer-events-none absolute -right-4 top-20 h-24 w-24 rounded-full bg-violet-50" />
          <div className="relative">
            <p className="poppins text-[11px] font-[700] uppercase tracking-[0.14em] text-blue-600">{today}</p>
            <h1 className="poppins mt-1.5 text-[28px] font-[700] leading-tight text-slate-900 sm:text-[34px]">
              Hello, {firstName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-1.5 max-w-[520px] text-[14px] text-slate-500">
              {all.total === 0
                ? "You have no bookings yet — pick a service below to get started."
                : `You have ${all.active} active and ${all.pending} pending booking${all.pending === 1 ? "" : "s"} across all services.`}
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/clientAllBookings" className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-[12.5px] font-[700] text-white shadow-sm transition-colors hover:bg-blue-700">
                <ClipboardList className="h-4 w-4" /> All bookings
              </Link>
              <Link href="/track" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-[700] text-slate-700 transition-colors hover:bg-slate-50">
                <Search className="h-4 w-4" /> Track an order
              </Link>
              <Link href="/clientDashboardSettings" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-[700] text-slate-700 transition-colors hover:bg-slate-50">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-[600] text-slate-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Wallet className="h-4 w-4" />
              </span>
              Wallet balance
            </div>
            <p className="poppins mt-3 text-[32px] font-[700] leading-none text-slate-900">
              {wallet ? `${currency} ${money(wallet.balance)}` : "—"}
            </p>
            {!wallet && <p className="mt-1 text-[11.5px] text-slate-400">Balance unavailable right now.</p>}
          </div>
          <div className="mt-5">
            <Link href="/client/wallet" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[12.5px] font-[700] text-white transition-colors hover:bg-slate-800">
              Top up / manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Receipt} label="Total spent" value={`${currency} ${money(all.spent)}`} accent="bg-blue-50 text-blue-600" />
        <Kpi icon={ClipboardList} label="Total bookings" value={all.total} accent="bg-slate-100 text-slate-600" />
        <Kpi icon={Activity} label="Active bookings" value={all.active} accent="bg-emerald-50 text-emerald-600" />
        <Kpi icon={CalendarClock} label="Upcoming" value={upcoming.length} accent="bg-violet-50 text-violet-600" />
        <Kpi icon={CheckCircle2} label="Completed" value={all.completed} accent="bg-slate-100 text-slate-600" />
        <Kpi icon={Clock} label="Pending payments" value={`${currency} ${money(payments.pending)}`} accent="bg-amber-50 text-amber-600" />
      </div>

      {/* Upcoming / Action required / Payment overview */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <PanelHead title="Upcoming Services" href="/clientAllBookings" />
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-slate-400">Nothing scheduled in the coming days.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((u) => (
                <li key={`${u.type}-${u.id}`}>
                  <Link href={u.url} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-[700] text-slate-900">{u.type}</p>
                      <p className="truncate text-[11.5px] text-slate-500">{u.reference} · {fmtDate(u.date)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-[700] capitalize ring-1 ring-inset ${STATUS_TONE[bucketOf(u.status)]}`}>
                      {String(u.status).replace(/_/g, " ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <PanelHead title="Action Required" href="/clientAllBookings" />
          {attentionItems.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-slate-400">You're all caught up.</p>
          ) : (
            <ul className="space-y-2">
              {attentionItems.map((a) => (
                <li key={`${a.type}-${a.id}`} className="flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-[600] text-slate-800">{a.type} awaiting payment or approval</p>
                    <p className="truncate text-[11.5px] text-slate-500">{a.reference}</p>
                  </div>
                  <Link href={a.url} className="shrink-0 rounded-md border border-blue-200 px-2.5 py-1 text-[11.5px] font-[700] text-blue-600 hover:bg-blue-50">Review</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col p-5">
          <PanelHead title="Payment Overview" href="/client/wallet" label="View transactions" />
          <dl className="space-y-2.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="font-[700] text-emerald-600">{currency} {money(payments.paid)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Pending Payments</dt><dd className="font-[700] text-amber-600">{currency} {money(payments.pending)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Refunds</dt><dd className="font-[700] text-slate-800">{currency} {money(payments.refunds)}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-2.5"><dt className="font-[600] text-slate-700">Outstanding</dt><dd className="font-[700] text-rose-600">{currency} {money(payments.pending)}</dd></div>
          </dl>
          <Link href="/client/wallet" className="mt-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-[12.5px] font-[700] text-white hover:bg-blue-700">Make a Payment</Link>
        </Card>
      </div>

      {/* Attention banner */}
      {attention && (
        <Link
          href={attention.manageHref}
          className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[13px] text-amber-900 transition-colors hover:bg-amber-50"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="flex-1">
            {all.pending} booking{all.pending === 1 ? " is" : "s are"} waiting for payment or approval — start with {attention.title}.
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      {/* Section cards */}
      <h2 className="poppins mb-4 mt-9 text-[18px] font-[700] text-slate-900">Your services</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <ServiceCard key={c.title} {...c} currency={currency} />
        ))}
      </div>

      {/* Analytics + shortcuts + help */}
      <div className="mt-9 grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <PanelHead title="Monthly Booking Trends" />
          <TrendChart trends={overview?.trends} />
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <PanelHead title="Quick Shortcuts" />
            <ul className="space-y-1">
              {SHORTCUTS.map((x) => (
                <li key={x.label}>
                  <Link href={x.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] font-[600] text-slate-700 hover:bg-slate-50">
                    <x.icon className="h-4 w-4 text-slate-400" /> <span className="flex-1">{x.label}</span> <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <PanelHead title="Need Help?" />
            <ul className="space-y-2">
              {HELP.map((x) => (
                <li key={x.label}>
                  <Link href={x.href} className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${x.tone}`}><x.icon className="h-4 w-4" /></span>
                    <span><span className="block text-[12.5px] font-[700] text-slate-800">{x.label}</span><span className="block text-[11px] text-slate-500">{x.sub}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/chat" className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-[700] text-rose-600 hover:bg-rose-100">
              <Siren className="h-3.5 w-3.5" /> Emergency Support
            </Link>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      <Card className="mt-9 p-5 sm:p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="poppins text-[18px] font-[700] text-slate-900">Recent activity</h2>
          <Link href="/clientAllBookings" className="inline-flex items-center gap-1 text-[12.5px] font-[700] text-blue-600 hover:text-blue-700">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="text-[13px] text-slate-500">Your latest bookings across every service will show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <Link href={r.url} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-[700] text-slate-900">{r.reference}</p>
                    <p className="text-[12px] text-slate-500">
                      {r.type}
                      {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {r.amount != null && <span className="hidden text-[12.5px] font-[600] text-slate-700 sm:inline">{currency} {money(r.amount)}</span>}
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-[700] capitalize ring-1 ring-inset ${STATUS_TONE[bucketOf(r.status)]}`}>
                      {String(r.status || "pending").replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default ClientCardDashboard;
