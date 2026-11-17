import React, { useMemo } from "react";
import { Link } from "@inertiajs/react";
import {
  Gauge,
  Fuel,
  Settings2,
  Users,
  Sliders,
  DoorClosed,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  Car,
  Tag,
  Star,
  User,
  ExternalLink,
  Sparkles,
  Info,
} from "lucide-react";

const fmtInt = (n) => (n ?? n === 0 ? Number(n).toLocaleString() : "—");
const fmtFloat = (n, d = 1) => (n ?? n === 0 ? Number(n).toFixed(d) : "—");
const ucfirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

const SpecCard = ({ icon: Icon, title, value }) => (
  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 hover:bg-white hover:shadow-md hover:border-blue-200 transition-all">
    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <p className="text-sm font-extrabold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);

const CarDetailsTab = ({ vehicle }) => {
  const land = vehicle?.landSpec;

  const specs = useMemo(() => {
    return {
      mileage: vehicle?.mileage_km ? `${fmtInt(vehicle.mileage_km)} km` : "Unlimited km",
      fuel: ucfirst(land?.fuel_type) || "Petrol",
      transmission: ucfirst(land?.transmission_type) || "Automatic",
      seats: land?.seats ? `${land.seats} Passengers` : (vehicle?.passenger_capacity ? `${vehicle.passenger_capacity} Passengers` : "4 Passengers"),
      gears: land?.gears ? `${land.gears} Speed` : "Automatic",
      brand: vehicle?.manufacturer || "Verified Brand",
      doors: land?.doors ? `${land.doors} Doors` : "4 Doors",
      tank: land?.fuel_tank_capacity_l ? `${fmtFloat(land.fuel_tank_capacity_l, 0)} Litres` : "Standard Tank",
      industryCategory: ucfirst(land?.industry_category) || "Sedan / Car",
      portPass: land?.has_port_pass ? "Authorized Port Pass" : "No Port Pass",
      condition: ucfirst(vehicle?.condition) || "Excellent",
      colour: vehicle?.colour || "Metallic",
      ownershipType: vehicle?.ownership_type
        ? vehicle.ownership_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "Fleet Managed",
      insuranceProvider: vehicle?.insurance_provider || "Comprehensive Commercial Cover",
      description:
        vehicle?.description ||
        "This vehicle is regularly serviced, sanitized, and maintained to the highest safety standards. Ideal for city commutes, airport transfers, business trips, or scenic island road trips with seamless reliability.",
      owner: {
        id: vehicle?.provider?.id,
        name: vehicle?.provider?.name || "Jaan Verified Fleet Partner",
        rating: vehicle?.rating_avg ? fmtFloat(vehicle.rating_avg, 1) : "5.0",
        reviews: vehicle?.reviews_count ?? 12,
        phone: vehicle?.provider?.phone || vehicle?.provider?.contact_number,
      },
    };
  }, [vehicle, land]);

  const features = [
    { label: "Air Conditioning", active: true },
    { label: "GPS Navigation", active: Boolean(vehicle?.gps) },
    { label: "Bluetooth & USB Audio", active: true },
    { label: "Full Insurance Covered", active: Boolean(vehicle?.insurance_coverage ?? true) },
    { label: "Child Seat Option", active: Boolean(vehicle?.child_seat) },
    { label: "High-Speed 4G WiFi", active: Boolean(vehicle?.wifi) },
    { label: "Roadside Assistance 24/7", active: true },
    { label: "Spare Tyre & Tool Kit", active: true },
  ];

  return (
    <div className="space-y-8">
      {/* Specifications Bento Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Car className="w-4 h-4 text-blue-600" />
          <span>Technical Specifications</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <SpecCard icon={Gauge} title="Mileage" value={specs.mileage} />
          <SpecCard icon={Fuel} title="Fuel Type" value={specs.fuel} />
          <SpecCard icon={Settings2} title="Transmission" value={specs.transmission} />
          <SpecCard icon={Users} title="Capacity" value={specs.seats} />
          <SpecCard icon={Sliders} title="Gearbox" value={specs.gears} />
          <SpecCard icon={DoorClosed} title="Doors" value={specs.doors} />
          <SpecCard icon={Droplets} title="Fuel Tank" value={specs.tank} />
          <SpecCard icon={Tag} title="Vehicle Class" value={specs.industryCategory} />
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Vehicle Overview</span>
        </h3>
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/60 text-sm leading-relaxed text-slate-700">
          <p>{specs.description}</p>
        </div>
      </div>

      {/* Features & Equipment */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Vehicle Features & Inclusions</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {features.map((f, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold ${
                f.active
                  ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-800"
                  : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${f.active ? "text-emerald-600" : "text-slate-300"}`} />
              <span className="truncate">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Details Table */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Ownership & Legal Protection
        </h3>
        <div className="rounded-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100 text-xs">
          <div className="grid grid-cols-2 px-4 py-3 bg-white">
            <span className="text-slate-500 font-medium">Vehicle Condition</span>
            <span className="font-bold text-slate-800">{specs.condition}</span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 bg-slate-50/50">
            <span className="text-slate-500 font-medium">Exterior Colour</span>
            <span className="font-bold text-slate-800">{specs.colour}</span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 bg-white">
            <span className="text-slate-500 font-medium">Ownership Structure</span>
            <span className="font-bold text-slate-800">{specs.ownershipType}</span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 bg-slate-50/50">
            <span className="text-slate-500 font-medium">Insurance Underwriter</span>
            <span className="font-bold text-emerald-700">{specs.insuranceProvider}</span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 bg-white">
            <span className="text-slate-500 font-medium">Port Clearance</span>
            <span className="font-bold text-slate-800">{specs.portPass}</span>
          </div>
        </div>
      </div>

      {/* Verified Host Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-bold text-xl shrink-0">
              {specs.owner.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">{specs.owner.name}</h4>
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Verified Transport Host · Fast Responder</p>

              <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{specs.owner.rating}</span>
                </div>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">{specs.owner.reviews} verified reviews</span>
              </div>
            </div>
          </div>

          {specs.owner.id && (
            <Link
              href={`/vendors/profile/${specs.owner.id}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-colors cursor-pointer"
            >
              <span>View Host Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarDetailsTab;
