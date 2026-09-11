import React from "react";
import { Head } from "@inertiajs/react";
import {
  ShieldCheck,
  Ticket,
  Wallet,
  Clock,
  Bus as BusIcon,
  TrainFront as TrainIcon,
  Plane as PlaneIcon,
  Ship as ShipIcon,
  Car as CarIcon,
} from "lucide-react";

import Header from "../client/ClientHeader";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
import BusCard from "../../components/ticketBooking/BusCard";
import HeroDetailsTwo from "../../components/ticketBooking/HeroDetailsTwo";
import Categories from "../../components/rentAVehicle/Categories";
import WhyChooseUs from "../../components/rentAVehicle/WhyChooseUs";
import HowItWorks from "../../components/rentAVehicle/HowItWorks";
import Testimonials from "../../components/rentAVehicle/Testimonials";
import ContactStrip from "../../components/rentAVehicle/ContactStrip";
import Footer from "../../layouts/Footer";

import busHero from "../../assets/ticketBooking/hero-bus-train-flight.jpg";

const HERO_FEATURES = [
  { icon: ShieldCheck, label: "Verified Bus Operators" },
  { icon: Ticket, label: "Instant E-Tickets" },
  { icon: Wallet, label: "0% Hidden Fees" },
  { icon: Clock, label: "24/7 Live Support" },
];

const TICKET_CATEGORIES = [
  { id: "express_bus", label: "Express Highway Buses", icon: BusIcon },
  { id: "luxury_ac", label: "Super Luxury A/C Coaches", icon: BusIcon },
  { id: "scenic_train", label: "Scenic & Intercity Trains", icon: TrainIcon },
  { id: "sleeper_coach", label: "Overnight Sleeper Buses", icon: BusIcon },
  { id: "airport_transfer", label: "Airport Direct Shuttles", icon: CarIcon },
  { id: "island_ferry", label: "Island & Coastal Ferries", icon: ShipIcon },
];

const TICKET_WHY_POINTS = [
  {
    icon: ShieldCheck,
    title: "100% Verified Operators",
    desc: "Every bus carrier on our platform is licensed, insured, and verified for passenger safety.",
  },
  {
    icon: Ticket,
    title: "Instant Digital E-Tickets",
    desc: "Receive your QR boarding pass instantly via SMS, email, and inside your personal dashboard.",
  },
  {
    icon: Wallet,
    title: "Zero Hidden Booking Fees",
    desc: "Guaranteed transparent pricing with live seat selection and no surprise checkout add-ons.",
  },
  {
    icon: Clock,
    title: "24/7 Live Journey Support",
    desc: "Dedicated support team ready to help with rescheduling, cancellations, and station directions.",
  },
];

const BusTicketBookingDetails = ({
  stations,
  schedules,
  returnSchedules,
  route,
  nearbyDates,
  searchParams,
}) => {
  return (
    <div className="bus-ticket-booking-page bg-[#F6F7F9] min-h-screen">
      <Head title="Bus Ticket Booking - Search Schedules & Book Seats | Transport Jaan" />
      <Header />

      {/* Full-bleed hero with 75% visible image */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={busHero}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-[65%_45%] opacity-75"
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
            Ticket Booking · Bus
          </p>
          <h1 className="bebas-neue text-[28px] sm:text-[36px] md:text-[44px] leading-none text-[#0B1B34] mb-4">
            BOOK YOUR <span className="text-[#0955AC]">BUS TICKETS</span>
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
            <ModuleTabs active="ticket" />
            <div className="mt-2.5 sm:mt-3">
              <TicketSubTabs active="bus" />
            </div>
          </div>
        </div>
      </section>

      {/* Search form floating smoothly over hero's bottom edge */}
      <div className="relative z-20 -mt-6 sm:-mt-8 md:-mt-10 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <BusCard />
      </div>

      {/* Search results & route details */}
      <HeroDetailsTwo
        hideSearchCard={true}
        stations={stations}
        schedules={schedules}
        returnSchedules={returnSchedules}
        route={route}
        nearbyDates={nearbyDates}
        searchParams={searchParams}
      />

      {/* Categories */}
      <Categories
        basePath="/busTicketBookingDetails"
        categories={TICKET_CATEGORIES}
        badge="Browse Categories"
        title="EXPLORE BY"
        highlight="TRAVEL MODE"
      />

      {/* Why Choose Us */}
      <WhyChooseUs
        points={TICKET_WHY_POINTS}
        badge="Why Choose Us"
        title="MORE THAN JUST A"
        highlight="BUS TICKET"
      />

      {/* How It Works */}
      <HowItWorks
        badge="Simple Process"
        title="BOARDING YOUR BUS IS"
        highlight="EASY"
      />

      {/* Testimonials */}
      <Testimonials />

      {/* Contact Strip */}
      <ContactStrip />

      {/* Platform Footer */}
      <Footer />
    </div>
  );
};

export default BusTicketBookingDetails;