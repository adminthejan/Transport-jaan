import React from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import { Anchor, CheckCircle2, Ship } from "lucide-react";
import Header from "../client/ClientHeader";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
import CardHeader from "../../components/ticketBooking/shared/CardHeader";
import { SegmentedControl, SubmitButton } from "../../components/ticketBooking/shared/FormElements";
import TicketCategoryPicker from "../../../../Components/forms/TicketCategoryPicker";
import { validateNic } from "../../../../Components/forms/IdentityFields";
import { SEA_TICKET_CATEGORIES } from "../../../../constants/ticketCategories";

const labelClass = "block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5";
const fieldClass = (hasError) =>
    `w-full h-[52px] rounded-[12px] border px-4 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors ${
        hasError ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
    }`;

const Field = ({ label, error, children }) => (
    <div>
        <label className={labelClass}>{label}</label>
        {children}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const SeaTicketBooking = () => {
    const { props } = usePage();
    const authUser = props.auth?.user;
    const flash = props.flash || {};
    const today = new Date().toISOString().split("T")[0];

    const { data, setData, post, processing, errors, reset } = useForm({
        category: "",
        sub_category: "",
        trip_type: "oneway",
        departure_port: "",
        arrival_port: "",
        travel_date: "",
        return_date: "",
        adults: 1,
        children: 0,
        name: authUser?.name || "",
        email: authUser?.email || "",
        phone: authUser?.phone || "",
        passenger_nic: authUser?.nic_number || "",
        special_requests: "",
    });

    const nicError = data.passenger_nic ? validateNic(data.passenger_nic) : null;
    const text = (name) => (e) => setData(name, e.target.value);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateNic(data.passenger_nic)) return;
        post("/sea-ticket-requests", { onSuccess: () => reset() });
    };

    return (
        <div className="bg-[#F6F7F9] min-h-screen">
            <Head title="Sea Ticket Request - Transport Jaan" />
            <Header />

            <div className="pt-6 sm:pt-8 px-5 md:px-10 max-w-[1800px] mx-auto">
                <ModuleTabs active="ticket" />
                <div className="mt-4 sm:mt-6">
                    <TicketSubTabs active="sea" />
                </div>
            </div>

            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82]">
                <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-4">
                        <Ship className="w-7 h-7 text-yellow-400" />
                    </div>
                    <h1 className="text-white text-[26px] sm:text-[32px] font-[800]">Request a Sea Ticket</h1>
                    <p className="text-white/80 text-[13px] sm:text-[15px] mt-3 max-w-[560px] mx-auto">
                        Ferries, cruises, boat transfers and yacht experiences. Tell us the route and date and our
                        marine partners will confirm pricing and availability.
                    </p>
                </div>
            </div>

            <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
                {flash.success && (
                    <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-green-200 bg-green-50 p-4 text-green-800 text-[14px] font-[600]">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        {flash.success}
                    </div>
                )}

                <div className="bg-white rounded-[22px] shadow-[0_20px_60px_rgba(9,85,172,0.14)] border border-black/5">
                    <CardHeader icon={Anchor} title="Sea Ticket Request" subtitle="Choose a category, then tell us where and when you want to sail." />

                    <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                        <h3 className="text-[13px] font-[700] text-[#0F172A] mb-3">Service</h3>
                        <TicketCategoryPicker
                            categories={SEA_TICKET_CATEGORIES}
                            category={data.category}
                            subCategory={data.sub_category}
                            onChange={({ category, subCategory }) => {
                                setData((prev) => ({ ...prev, category, sub_category: subCategory }));
                            }}
                            errors={{ category: errors.category, subCategory: errors.sub_category }}
                        />

                        <SegmentedControl
                            value={data.trip_type}
                            onChange={(value) => setData("trip_type", value)}
                            options={[
                                { value: "oneway", label: "One way" },
                                { value: "return", label: "Return" },
                            ]}
                        />

                        <h3 className="text-[13px] font-[700] text-[#0F172A] mb-3">Trip Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <Field label="DEPARTURE PORT / PLACE" error={errors.departure_port}>
                                <input value={data.departure_port} onChange={text("departure_port")} placeholder="e.g. Colombo Harbour" className={fieldClass(errors.departure_port)} />
                            </Field>
                            <Field label="ARRIVAL PORT / PLACE" error={errors.arrival_port}>
                                <input value={data.arrival_port} onChange={text("arrival_port")} placeholder="e.g. Trincomalee" className={fieldClass(errors.arrival_port)} />
                            </Field>
                            <Field label="TRAVEL DATE" error={errors.travel_date}>
                                <input type="date" min={today} value={data.travel_date} onChange={text("travel_date")} className={fieldClass(errors.travel_date)} />
                            </Field>
                            {data.trip_type === "return" && (
                                <Field label="RETURN DATE" error={errors.return_date}>
                                    <input type="date" min={data.travel_date || today} value={data.return_date} onChange={text("return_date")} className={fieldClass(errors.return_date)} />
                                </Field>
                            )}
                            <Field label="ADULTS" error={errors.adults}>
                                <input type="number" min={1} max={200} value={data.adults} onChange={text("adults")} className={fieldClass(errors.adults)} />
                            </Field>
                            <Field label="CHILDREN" error={errors.children}>
                                <input type="number" min={0} max={200} value={data.children} onChange={text("children")} className={fieldClass(errors.children)} />
                            </Field>
                        </div>

                        <h3 className="text-[13px] font-[700] text-[#0F172A] mb-3 mt-6">Passenger Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <Field label="YOUR NAME" error={errors.name}>
                                <input value={data.name} onChange={text("name")} className={fieldClass(errors.name)} />
                            </Field>
                            <Field label="NIC NUMBER *" error={errors.passenger_nic || nicError}>
                                <input
                                    value={data.passenger_nic}
                                    onChange={(e) => setData("passenger_nic", e.target.value.toUpperCase().replace(/\s/g, ""))}
                                    maxLength={12}
                                    placeholder="199012345678"
                                    className={fieldClass(errors.passenger_nic || nicError)}
                                />
                            </Field>
                            <Field label="YOUR EMAIL" error={errors.email}>
                                <input type="email" value={data.email} onChange={text("email")} className={fieldClass(errors.email)} />
                            </Field>
                            <Field label="PHONE NUMBER" error={errors.phone}>
                                <input type="tel" value={data.phone} onChange={text("phone")} className={fieldClass(errors.phone)} />
                            </Field>
                        </div>

                        <div className="mb-6">
                            <label className={labelClass}>SPECIAL REQUESTS (OPTIONAL)</label>
                            <textarea
                                value={data.special_requests}
                                onChange={text("special_requests")}
                                rows="3"
                                placeholder="Group size, cabin or seating needs, luggage, accessibility, etc."
                                className="w-full rounded-[12px] border border-[#E2E8F0] p-4 text-[14px] font-[500] text-[#0F172A] bg-white outline-none resize-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                            />
                            {errors.special_requests && <p className="text-red-500 text-xs mt-1">{errors.special_requests}</p>}
                        </div>

                        <SubmitButton icon={Ship} iconPosition="left" disabled={processing}>
                            {processing ? "Sending Request..." : "Request Sea Ticket"}
                        </SubmitButton>
                        <p className="text-center text-[12px] text-[#94A3B8] mt-3">
                            This is a request, not an instant booking: a member of our team will confirm pricing and availability by email or phone.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SeaTicketBooking;
