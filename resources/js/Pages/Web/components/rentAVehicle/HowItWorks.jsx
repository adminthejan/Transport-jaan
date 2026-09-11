import React from "react";
import { MapPin } from "lucide-react";
import happy from "../../assets/rentAVehicle/HowItWorks/happy.png";
import calendar from "../../assets/rentAVehicle/HowItWorks/calendar.png";
import search from "../../assets/rentAVehicle/HowItWorks/search.png";

const DEFAULT_STEPS = [
  {
    title: "Search",
    icon: search,
    desc: "Choose your location, dates, and vehicle.",
  },
  {
    title: "Book",
    icon: calendar,
    desc: "Reserve your vehicle online in minutes.",
  },
  {
    title: "Pick Up",
    Icon: MapPin,
    desc: "Collect your vehicle at the agreed location.",
  },
  {
    title: "Enjoy the Ride",
    icon: happy,
    desc: "Travel comfortably, anywhere you're headed.",
  },
];

const HowItWorks = ({
  steps: customSteps,
  title = "RENTING A VEHICLE IS",
  highlight = "EASY",
  badge = "How It Works",
}) => {
  const steps = customSteps || DEFAULT_STEPS;

  return (
    <div className="w-full py-10 md:py-14 bg-white border-t border-black/[0.04]">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="text-center mb-3">
          <span className="poppins inline-block text-[10px] sm:text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] bg-[#EAF1FE] px-3 py-1 rounded-full uppercase">
            {badge}
          </span>
        </div>
        <h2 className="bebas-neue text-[28px] md:text-[36px] font-[400] text-center mb-8 md:mb-10 text-[#0B1B34] leading-tight">
          {title} <span className="text-[#0955AC]">{highlight}</span>
        </h2>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 max-w-[980px] mx-auto">
          <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-0 border-t-2 border-dashed border-black/10 z-0" />
          {steps.map((step, i) => (
            <div key={step.title} className="relative z-10 flex flex-col items-center text-center px-2">
              <div className="w-14 h-14 rounded-full bg-[#0955AC] shadow-[0_8px_20px_rgba(9,85,172,0.25)] flex items-center justify-center mb-4">
                {step.Icon ? (
                  <step.Icon className="w-[20px] h-[20px] text-white" />
                ) : (
                  <img src={step.icon} alt="" className="w-[20px] h-[20px] object-contain brightness-0 invert" />
                )}
              </div>
              <span className="poppins text-[10px] sm:text-[11px] font-[700] text-[#0955AC] tracking-[0.1em] uppercase mb-1">
                Step {i + 1}
              </span>
              <h3 className="figtree text-[15px] sm:text-[16px] font-[700] text-[#0B1B34] mb-1">{step.title}</h3>
              <p className="figtree text-[12px] sm:text-[13px] text-[#00000080] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
