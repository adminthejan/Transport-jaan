import React, { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import {
  Building2,
  CalendarDays,
  Clock,
  Search,
  ShieldCheck,
  Wallet,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import ClientHeader from "../client/ClientHeader";
import WarehouseFilterSidebar from "../../components/warehouseList/WarehouseFilterSidebar";
import WarehouseSearchForm from "../../components/warehouseList/WarehouseSearchForm";
import WarehouseListContent from "../../components/warehouseList/WarehouseListContent";
import WarehouseListMap from "../../components/warehouseList/WarehouseListMap";
import WhyChooseUs from "../../components/rentAVehicle/WhyChooseUs";
import HowItWorks from "../../components/rentAVehicle/HowItWorks";
import Testimonials from "../../components/rentAVehicle/Testimonials";
import ContactStrip from "../../components/rentAVehicle/ContactStrip";
import Footer from "../../layouts/Footer";
import heroImg from "../../assets/warehouse/warehouse_hero_2k.jpeg";

const HERO_FEATURES = [
  { icon: ShieldCheck, label: "Verified Facilities" },
  { icon: Building2, label: "Flexible Lease Terms" },
  { icon: Clock, label: "24/7 Security & Support" },
];

const WAREHOUSE_WHY_US = [
  {
    icon: ShieldCheck,
    title: "Verified Facilities",
    desc: "Every commercial warehouse on our platform is inspected and verified for security and compliance.",
  },
  {
    icon: Building2,
    title: "Prime Logistics Hubs",
    desc: "Strategically located near major highways, seaports, and transit corridors across the island.",
  },
  {
    icon: Wallet,
    title: "Transparent Pricing",
    desc: "Clear square-footage and monthly rates with no hidden management fees at checkout.",
  },
  {
    icon: Clock,
    title: "24/7 Security & Support",
    desc: "Round-the-clock facility access, perimeter monitoring, and dedicated customer assistance.",
  },
];

const WAREHOUSE_HOW_IT_WORKS = [
  {
    title: "Explore",
    Icon: Search,
    desc: "Search by district, required space, and storage type.",
  },
  {
    title: "Select Space",
    Icon: CalendarDays,
    desc: "Choose flexible monthly terms or long-term lease.",
  },
  {
    title: "Verify & Contract",
    Icon: ShieldCheck,
    desc: "Transparent paperwork and verified facility inspection.",
  },
  {
    title: "Move In",
    Icon: WarehouseIcon,
    desc: "Store your inventory safely with 24/7 access.",
  },
];

const WarehouseList = () => {
  const { props } = usePage();
  const [showMap, setShowMap] = useState(true);

  const [formData, setFormData] = useState({
    warehouseLocation: "",
    requiredSpace: "",
    requiredSpaceUnit: "sqft",
    moveinDate: "",
    leaseDuration: "",
    dateMode: "flexible",
    nearLat: "",
    nearLng: "",
  });

  useEffect(() => {
    // Backend sends the current query string back as `searchParams` so the
    // form reflects whatever filters are actually active on page load.
    if (props.searchParams) {
      setFormData((prevData) => ({
        ...prevData,
        ...props.searchParams,
      }));
    }
  }, [props.searchParams]);

  const handleFormChange = (newData) => {
    setFormData(newData);
  };

  return (
    <div className="warehouse-list-page bg-[#F6F7F9] min-h-screen">
      <Head title="Find Warehouses - Transport Jaan" />
      <ClientHeader />

      {/* Full-bleed hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-[65%_40%] opacity-85"
          />
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
            Warehouse Rental · Storage & Fulfillment
          </p>
          <h1 className="bebas-neue text-[28px] sm:text-[36px] md:text-[44px] leading-none text-[#0B1B34] mb-4">
            FIND YOUR <span className="text-[#0955AC]">PERFECT WAREHOUSE</span>
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
        </div>
      </section>

      {/* Search form, floating smoothly over hero's bottom edge */}
      <div className="relative z-20 -mt-6 sm:-mt-8 md:-mt-10">
        <WarehouseSearchForm formData={formData} onFormChange={handleFormChange} />
      </div>

      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 pb-12 sm:pb-14">
        <div
          className={`grid grid-cols-1 ${
            showMap ? "xl:grid-cols-[260px_1fr_400px]" : "xl:grid-cols-[260px_1fr]"
          } gap-6 items-start`}
        >
          {/* Filters */}
          <div className="order-2 xl:order-1">
            <WarehouseFilterSidebar searchParams={formData} />
          </div>

          {/* Results */}
          <div className="order-1 xl:order-2 min-w-0">
            <WarehouseListContent
              warehouses={props.warehouses}
              authUser={props.auth?.user}
              likedWarehouseIds={props.likedWarehouseIds}
              showMap={showMap}
              onToggleMap={() => setShowMap(!showMap)}
            />
          </div>

          {/* Map — sticky beside the results on desktop when active */}
          {showMap && (
            <div className="order-3 xl:sticky xl:top-6">
              <div className="rounded-[20px] overflow-hidden border border-black/5 shadow-[0_8px_24px_rgba(11,27,52,0.08)] bg-white p-2">
                <WarehouseListMap
                  warehouses={props.warehouses}
                  heightClass="h-[280px] xl:h-[calc(100vh-140px)]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supporting sections matching vehicleList */}
      <WhyChooseUs
        points={WAREHOUSE_WHY_US}
        title="MORE THAN JUST"
        highlight="STORAGE"
        badge="Why Choose Us"
      />
      <HowItWorks
        steps={WAREHOUSE_HOW_IT_WORKS}
        title="RENTING A WAREHOUSE IS"
        highlight="SIMPLE"
        badge="How It Works"
      />
      <Testimonials />
      <ContactStrip />
      <Footer />
    </div>
  );
};

export default WarehouseList;