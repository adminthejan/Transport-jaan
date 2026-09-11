import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { ShieldCheck, Wallet, Clock } from "lucide-react";
import Header from "./client/ClientHeader";
import { ModuleTabs, RentalSubTabs } from "../components/ModuleTabs";
import FilterSidebar from "../components/airVehicleList/FilterSidebar";
import AirVehicleListContent from "../components/airVehicleList/AirVehicleListContent";
import SearchForm from "../components/airVehicleList/SearchForm";
import ScheduledFlightForm from "../components/airVehicleList/ScheduledFlightForm";
import WhyChooseUs from "../components/rentAVehicle/WhyChooseUs";
import Categories from "../components/rentAVehicle/Categories";
import HowItWorks from "../components/rentAVehicle/HowItWorks";
import Testimonials from "../components/rentAVehicle/Testimonials";
import ContactStrip from "../components/rentAVehicle/ContactStrip";
import Footer from "../layouts/Footer";
import heroImg from "../assets/rentAVehicle/hero/land-sea-air.jpg";

const HERO_FEATURES = [
  { icon: ShieldCheck, label: "Verified Vendors" },
  { icon: Wallet, label: "All-Inclusive Pricing" },
  { icon: Clock, label: "24/7 Support" },
];

const airVehicleList = () => {
  const { props } = usePage();
  // Charter Flight = rent the aircraft itself (the existing flow below).
  // Scheduled Flight = book a seat on an already-scheduled route instead.
  const [bookingMode, setBookingMode] = useState("charter");

  const [formData, setFormData] = useState({
    pickupLocation: "",
    pickupDate: "",
    dropoffLocation: "",
    dropoffDate: "",
    brand: "",
    bodyType: "",
  });

  useEffect(() => {
    if (props.filters) {
      setFormData((prevData) => ({
        ...prevData,
        ...props.filters,
      }));
    }
  }, [props.filters]);

  const handleFormChange = (newData) => {
    setFormData(newData);
  };

  return (
    <div className="vehicle-list-page bg-[#F6F7F9] min-h-screen">
      <Header />

      {/* Full-bleed hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" aria-hidden="true" className="w-full h-full object-cover object-[65%_45%] opacity-75" />
          {/* Gentle protective gradient ensuring text readability while keeping image ~75% visible */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.30) 30%, rgba(255,255,255,0.05) 55%, transparent 75%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, #F6F7F9 0%, rgba(246,247,249,0.20) 10%, transparent 25%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 sm:pt-8 md:pt-10 pb-14 sm:pb-16 md:pb-20">
          <p className="poppins text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] uppercase mb-2">
            Vehicle Rental · Air
          </p>
          <h1 className="bebas-neue text-[28px] sm:text-[36px] md:text-[44px] leading-none text-[#0B1B34] mb-4">
            CHARTER YOUR <span className="text-[#0955AC]">NEXT FLIGHT</span>
          </h1>

          <div className="flex flex-wrap gap-x-6 sm:gap-x-8 gap-y-2.5 mb-6 max-w-[620px]">
            {HERO_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#EAF1FE] flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-[#0955AC]" />
                </div>
                <span className="poppins text-[12.5px] font-[600] text-[#0B1B34]">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center mt-3 sm:mt-4">
            <ModuleTabs active="rental" />
            <div className="mt-2.5 sm:mt-3">
              <RentalSubTabs active="air" />
            </div>
          </div>
        </div>
      </section>

      {/* Floats smoothly over the hero bottom edge */}
      <div className="relative z-20 -mt-6 sm:-mt-8 md:-mt-10">
        {/* Charter Flight / Scheduled Flight tabs */}
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 mb-2">
          <div className="inline-flex bg-white shadow-[0_10px_24px_rgba(11,27,52,0.12)] rounded-full p-1 border border-black/5">
            {[
              { value: "charter", label: "Charter Flight" },
              { value: "scheduled", label: "Scheduled Flight" },
            ].map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setBookingMode(opt.value)}
                className={`px-5 sm:px-6 py-2 rounded-full text-[12.5px] sm:text-[13px] font-[700] transition-all cursor-pointer ${
                  bookingMode === opt.value ? "bg-[#0955AC] text-white shadow-sm" : "text-[#475569] hover:text-[#0955AC]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {bookingMode === "scheduled" ? (
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-4">
            <ScheduledFlightForm />
          </div>
        ) : (
          <>
            <SearchForm formData={formData} onFormChange={handleFormChange} />

            <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 pb-12 sm:pb-14">
              <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6 items-start">
                {/* Filters */}
                <div className="order-2 xl:order-1">
                  <FilterSidebar searchParams={formData} />
                </div>

                {/* Results */}
                <div className="order-1 xl:order-2 min-w-0">
                  <AirVehicleListContent
                    vehicles={props.vehicles}
                    authUser={props.auth.user}
                    likedVehicleIds={props.likedVehicleIds}
                    searchParams={{
                      dropoffDate: formData.dropoffDate,
                      dropoffLocation: formData.dropoffLocation,
                      pickupDate: formData.pickupDate,
                      pickupLocation: formData.pickupLocation
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Explore categories right after the aircraft results */}
      <Categories basePath="/airVehicleList" />
      <WhyChooseUs />
      <HowItWorks />
      <Testimonials />
      <ContactStrip />
      <Footer />
    </div>
  );
};

export default airVehicleList;
