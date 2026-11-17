import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { ShieldCheck, Wallet, Clock, Sparkles, CheckCircle2, ChevronRight, SlidersHorizontal } from "lucide-react";
import Header from "./client/ClientHeader";
import { ModuleTabs, RentalSubTabs } from "../components/ModuleTabs";
import FilterSidebar from "../components/vehicleList/FilterSidebar";
import VehicleListContent from "../components/vehicleList/VehicleListContent";
import SearchForm from "../components/vehicleList/SearchForm";
import WhyChooseUs from "../components/rentAVehicle/WhyChooseUs";
import Categories from "../components/rentAVehicle/Categories";
import HowItWorks from "../components/rentAVehicle/HowItWorks";
import Testimonials from "../components/rentAVehicle/Testimonials";
import ContactStrip from "../components/rentAVehicle/ContactStrip";
import Footer from "../layouts/Footer";
import heroImg from "../assets/rentAVehicle/hero/land-sea-air.jpg";

const HERO_FEATURES = [
  { icon: ShieldCheck, label: "Verified Hosts & Fleets" },
  { icon: Wallet, label: "Zero Hidden Fees" },
  { icon: Clock, label: "24/7 Roadside Assistance" },
  { icon: Sparkles, label: "Instant Reservation" },
];

const VehicleList = () => {
  const { props } = usePage();

  const [formData, setFormData] = useState({
    pickupLocation: "",
    pickupDate: "",
    dropoffLocation: "",
    dropoffDate: "",
    withDriver: false,
    brand: "",
    bodyType: "",
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    if (props.filters) {
      setFormData((prevData) => ({
        ...prevData,
        ...props.filters,
        withDriver: [true, "true", "1", 1].includes(props.filters.withDriver),
      }));
    }
  }, [props.filters]);

  const handleFormChange = (newData) => {
    setFormData(newData);
  };

  return (
    <div className="vehicle-list-page bg-slate-50 min-h-screen text-slate-800 antialiased">
      <Header />

      {/* Hero Showcase */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        {/* Background Image with refined luxury gradient overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={heroImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-[60%_40%] opacity-35 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-slate-900/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-20 md:pb-28">
          {/* Breadcrumb pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide uppercase mb-4 backdrop-blur-md">
            <span>Vehicle Rental</span>
            <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white">Land Fleet</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Premium Cars for Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Journey</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mb-8 leading-relaxed font-normal">
            Choose from thousands of verified sedans, luxury SUVs, and commercial vehicles with instant booking, chauffeur options, and flexible cancellation.
          </p>

          {/* Value Props Bar */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-8">
            {HERO_FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs sm:text-sm font-medium text-slate-200"
              >
                <f.icon className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex flex-col items-center pt-2">
            <ModuleTabs active="rental" />
            <div className="mt-3">
              <RentalSubTabs active="land" />
            </div>
          </div>
        </div>
      </section>

      {/* Floating Search Form over hero bottom edge */}
      <div className="relative z-30 -mt-10 sm:-mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SearchForm formData={formData} onFormChange={handleFormChange} />
      </div>

      {/* Main Results & Filtering Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Mobile filter toggle button */}
        <div className="xl:hidden flex items-center justify-between mb-6 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>Filter Results</span>
            {props.vehicles?.total && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
                {props.vehicles.total} cars
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-transform"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{mobileFilterOpen ? "Hide Filters" : "Filters & Sort"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Filters Sidebar */}
          <aside className={`xl:block ${mobileFilterOpen ? "block" : "hidden"} order-2 xl:order-1`}>
            <div className="sticky top-24">
              <FilterSidebar searchParams={formData} onCloseMobile={() => setMobileFilterOpen(false)} />
            </div>
          </aside>

          {/* Vehicle Listing Content */}
          <section className="order-1 xl:order-2 min-w-0">
            <VehicleListContent
              vehicles={props.vehicles}
              authUser={props.auth?.user}
              likedVehicleIds={props.likedVehicleIds}
              searchParams={{
                dropoffDate: formData.dropoffDate,
                dropoffLocation: formData.dropoffLocation,
                pickupDate: formData.pickupDate,
                pickupLocation: formData.pickupLocation,
                withDriver: formData.withDriver,
              }}
            />
          </section>
        </div>
      </main>

      {/* Discovery & Trust Sections */}
      <div className="bg-white border-t border-slate-200/60">
        <Categories basePath="/vehicleList" />
        <WhyChooseUs />
        <HowItWorks />
        <Testimonials />
        <ContactStrip />
      </div>

      <Footer />
    </div>
  );
};

export default VehicleList;
