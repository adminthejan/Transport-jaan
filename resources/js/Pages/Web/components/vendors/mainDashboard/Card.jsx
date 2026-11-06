import { router } from "@inertiajs/react";
import { Car, Ticket, Package, Warehouse, Truck, Route as RouteIcon, ArrowRight } from "lucide-react";

const SERVICE_ICON = {
    "Vehicle Rental": { icon: Car, tone: "bg-blue-50 text-blue-600" },
    "Ticket Booking": { icon: Ticket, tone: "bg-violet-50 text-violet-600" },
    "Courier Service": { icon: Package, tone: "bg-orange-50 text-orange-600" },
    Warehousing: { icon: Warehouse, tone: "bg-teal-50 text-teal-600" },
    Freight: { icon: Truck, tone: "bg-sky-50 text-sky-600" },
    Multimodal: { icon: RouteIcon, tone: "bg-rose-50 text-rose-600" },
};

const Card = ({ title, description, index, subOptions, canAccess = true, onAccessDenied }) => {
    const handleNavigate = (option = null) => {
        if (!canAccess) {
            onAccessDenied?.(title);
            return;
        }

        if (title === "Vehicle Rental") {
            if (option) {
                router.visit(`/dashboard/${option.toLowerCase()}`); // Navigate per sub-option
            } else {
                router.visit("/dashboard");
            }
        } else if (title === "Ticket Booking") {
            router.visit("/ticketBooking/dashboard");
        } else if (title === "Courier Service") {
            router.visit("/courierService/dashboard");
        } else if (title === "Warehousing") {
            router.visit("/warehouse/dashboard");
        } else if (title === "Freight") {
            router.visit("/freight/dashboard");
        } else if (title === "Multimodal") {
            router.visit("/multimodal/dashboard");
        } else {
            router.visit("/dashboard");
        }
    };

    const meta = SERVICE_ICON[title] || { icon: Package, tone: "bg-slate-100 text-slate-600" };
    const Icon = meta.icon;

    return (
        <div
            className={`rounded-2xl border border-slate-200/70 bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-200 ${
                canAccess ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg" : "cursor-pointer opacity-80"
            }`}
            onClick={() => handleNavigate()}
        >
            <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                    <Icon className="h-5 w-5" />
                </span>
                <h2 className="poppins flex-1 text-[17px] font-[700] text-slate-900">{title}</h2>
                {canAccess && <ArrowRight className="h-4 w-4 text-slate-300" />}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{description}</p>
            {!canAccess && (
                <p className="mt-3 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] font-[700] text-amber-700 ring-1 ring-inset ring-amber-200">
                    Register this service to access dashboard
                </p>
            )}

            {subOptions && canAccess && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                    {subOptions.map((opt, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg bg-[#EEF3FA] px-3 py-2 text-center text-[12.5px] font-[700] text-[#0955AC] transition-colors hover:bg-[#0955AC] hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation(); // prevent parent click
                                handleNavigate(opt);
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Card;
