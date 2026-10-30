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
  Plus,
  Search,
  Settings,
  AlertCircle,
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
  pending: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-rose-50 text-rose-700",
};

const bucketOf = (status = "") => {
  const s = String(status).toLowerCase();
  if (["cancelled", "canceled", "rejected", "refunded", "expired", "failed", "declined"].includes(s)) return "cancelled";
  if (["completed", "delivered", "returned", "finished", "checked_out"].includes(s)) return "completed";
  if (["pending", "pending_payment", "awaiting_payment", "awaiting_approval", "quoted", "requested", "processing", "draft"].includes(s)) return "pending";
  return "active";
};

const Stat = ({ label, value, tone }) => (
  <div className="rounded-[10px] bg-[#F6F8FB] px-3 py-2 text-center">
    <p className={`poppins text-[18px] font-[700] ${tone}`}>{value}</p>
    <p className="text-[10px] font-[600] uppercase tracking-wide text-[#64748B]">{label}</p>
  </div>
);

const ServiceCard = ({ icon: Icon, title, description, totals, actions, manageHref, currency }) => (
  <div className="flex flex-col rounded-[14px] bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.07)]">
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#EAF1FE] text-[#0955AC]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="poppins text-[16px] font-[700] text-[#0B1B34]">{title}</h2>
        <p className="text-[12px] leading-snug text-[#64748B]">{description}</p>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-4 gap-2">
      <Stat label="Active" value={totals.active} tone="text-emerald-600" />
      <Stat label="Pending" value={totals.pending} tone="text-amber-600" />
      <Stat label="Done" value={totals.completed} tone="text-slate-600" />
      <Stat label="Cancelled" value={totals.cancelled} tone="text-rose-600" />
    </div>

    <div className="mt-3 flex items-center justify-between text-[12px] text-[#64748B]">
      <span>{totals.total} booking{totals.total === 1 ? "" : "s"} in total</span>
      {totals.spent > 0 && (
        <span className="font-[600] text-[#0B1B34]">
          {currency} {money(totals.spent)} spent
        </span>
      )}
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0955AC] px-3.5 py-1.5 text-[12px] font-[600] text-white transition-colors hover:bg-[#074a8f]"
        >
          <Plus className="h-3.5 w-3.5" /> {a.label}
        </Link>
      ))}
    </div>

    <Link
      href={manageHref}
      className="mt-4 inline-flex items-center gap-1 border-t border-[#EEF2F6] pt-3 text-[12px] font-[700] text-[#0955AC] hover:underline"
    >
      View my bookings <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  </div>
);

const ClientCardDashboard = () => {
  const { auth, overview } = usePage().props;
  const sections = overview?.sections || {};
  const wallet = overview?.wallet;
  const recent = overview?.recent || [];

  const vehicle = useMemo(() => sumSections([sections.vehicle?.land, sections.vehicle?.air, sections.vehicle?.sea]), [sections]);
  const tickets = useMemo(
    () => sumSections([sections.tickets?.bus, sections.tickets?.train, sections.tickets?.flight, sections.tickets?.sea]),
    [sections]
  );
  const courier = useMemo(() => sumSections([sections.courier]), [sections]);
  const warehouse = useMemo(() => sumSections([sections.warehouse]), [sections]);
  const multimodal = useMemo(() => sumSections([sections.multimodal]), [sections]);
  const freight = EMPTY;

  const all = sumSections([vehicle, tickets, courier, warehouse, multimodal].map((s) => ({ ...s })));
  const currency = wallet?.currency || "LKR";
  const firstName = (auth?.user?.name || "there").split(" ")[0];

  const cards = [
    {
      icon: Car,
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
      title: "Courier Service",
      description: "Send parcels and track shipments.",
      totals: courier,
      actions: [{ label: "Send a parcel", href: "/courier-service" }],
      manageHref: "/courierBookingDashboard",
    },
    {
      icon: Warehouse,
      title: "Warehouse Services",
      description: "Find and reserve storage space.",
      totals: warehouse,
      actions: [{ label: "Find a warehouse", href: "/warehouseList" }],
      manageHref: "/warehouseBookingDashboard",
    },
    {
      icon: Truck,
      title: "Freight Services",
      description: "Request freight quotes and shipping.",
      totals: freight,
      actions: [{ label: "Get a quote", href: "/freight-home" }],
      manageHref: "/freightBookingDashboard",
    },
    {
      icon: RouteIcon,
      title: "Multimodal Journeys",
      description: "Combine land, air and sea in one trip.",
      totals: multimodal,
      actions: [{ label: "Plan a journey", href: "/multiModel/plan-journey" }],
      manageHref: "/clientAllBookings",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 xl:py-12">
      {/* Greeting + wallet */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <div className="flex-1">
          <p className="poppins text-[11px] font-[700] uppercase tracking-[0.14em] text-[#0955AC]">Client Dashboard</p>
          <h1 className="poppins mt-1 text-[28px] font-[700] text-[#0B1B34] sm:text-[36px]">Hello, {firstName} 👋</h1>
          <p className="mt-1 text-[14px] text-[#64748B]">
            {all.total === 0
              ? "You have no bookings yet — pick a service below to get started."
              : `You have ${all.active} active and ${all.pending} pending booking${all.pending === 1 ? "" : "s"} across all services.`}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/clientAllBookings" className="inline-flex items-center gap-1.5 rounded-full border border-[#0955AC] px-4 py-2 text-[12px] font-[700] text-[#0955AC] hover:bg-[#0955AC] hover:text-white transition-colors">
              <ClipboardList className="h-4 w-4" /> All bookings
            </Link>
            <Link href="/track" className="inline-flex items-center gap-1.5 rounded-full border border-[#0955AC] px-4 py-2 text-[12px] font-[700] text-[#0955AC] hover:bg-[#0955AC] hover:text-white transition-colors">
              <Search className="h-4 w-4" /> Track an order
            </Link>
            <Link href="/clientDashboardSettings" className="inline-flex items-center gap-1.5 rounded-full border border-[#0955AC] px-4 py-2 text-[12px] font-[700] text-[#0955AC] hover:bg-[#0955AC] hover:text-white transition-colors">
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </div>
        </div>

        <div className="w-full rounded-[16px] bg-gradient-to-br from-[#0955AC] to-[#073E82] p-6 text-white shadow-[0_10px_28px_rgba(9,85,172,0.25)] lg:w-[340px]">
          <div className="flex items-center gap-2 text-[12px] font-[600] text-white/80">
            <Wallet className="h-4 w-4" /> Wallet balance
          </div>
          <p className="poppins mt-2 text-[30px] font-[700]">
            {wallet ? `${currency} ${money(wallet.balance)}` : "—"}
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/client/wallet" className="rounded-full bg-white px-4 py-2 text-[12px] font-[700] text-[#0955AC] hover:bg-white/90">
              Top up / manage
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-white/70">Total spent on bookings: {currency} {money(all.spent)}</p>
        </div>
      </div>

      {/* Attention banner */}
      {all.pending > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>
            {all.pending} booking{all.pending === 1 ? " is" : "s are"} waiting for payment or approval. Open the section below to finish or follow up.
          </span>
        </div>
      )}

      {/* Section cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <ServiceCard key={c.title} {...c} currency={currency} />
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-10 rounded-[14px] bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.07)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="poppins text-[16px] font-[700] text-[#0B1B34]">Recent activity</h2>
          <Link href="/clientAllBookings" className="text-[12px] font-[700] text-[#0955AC] hover:underline">
            See all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#94A3B8]">Your latest bookings across every service will show up here.</p>
        ) : (
          <ul className="divide-y divide-[#EEF2F6]">
            {recent.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <Link href={r.url} className="flex items-center justify-between gap-3 py-3 hover:bg-[#F8FAFC]">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-[700] text-[#0B1B34]">{r.reference}</p>
                    <p className="text-[11px] text-[#64748B]">
                      {r.type}
                      {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {r.amount != null && <span className="text-[12px] font-[600] text-[#334155]">{currency} {money(r.amount)}</span>}
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-[700] capitalize ${STATUS_TONE[bucketOf(r.status)]}`}>
                      {String(r.status || "pending").replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ClientCardDashboard;
