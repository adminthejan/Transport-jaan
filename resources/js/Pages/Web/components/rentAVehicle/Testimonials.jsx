import React from "react";

const TESTIMONIALS = [
  {
    initials: "NP",
    name: "Nadeesha Perera",
    quote:
      "Picked up the car at BIA within ten minutes of landing. Clean vehicle, transparent pricing, no surprises at return.",
  },
  {
    initials: "CW",
    name: "Chathura Wickramasinghe",
    quote:
      "Booked a van with a driver for a family trip to Ella. The driver knew every stop worth making along the way.",
  },
  {
    initials: "AS",
    name: "Amali Silva",
    quote:
      "Rented an SUV for a week around the south coast. Support answered within minutes when I had a question about the booking.",
  },
];

const Testimonials = () => {
  return (
    <div className="w-full py-10 md:py-14 bg-[#F8FAFC] border-t border-black/[0.04]">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <h2 className="bebas-neue text-[26px] sm:text-[32px] md:text-[36px] font-[400] text-center mb-8 md:mb-10 text-[#0B1B34]">
          TRUSTED BY <span className="text-[#0955AC]">TRAVELLERS</span> ISLAND-WIDE
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="relative bg-white rounded-[18px] border border-black/5 shadow-sm p-5 sm:p-6 hover:shadow-md transition-all duration-300"
            >
              <div className="absolute top-2 right-5 font-serif text-[40px] text-[#EAF1FE] leading-none select-none">
                &rdquo;
              </div>
              <div className="relative flex items-center gap-3 mb-3 pr-6">
                <div className="w-10 h-10 rounded-full bg-[#EAF1FE] flex items-center justify-center font-[700] text-[#0955AC] text-[13px] flex-shrink-0">
                  {t.initials}
                </div>
                <div>
                  <div className="figtree font-[700] text-[#0B1B34] text-[13.5px]">{t.name}</div>
                  <div className="text-[#F0BB0D] text-[12px] tracking-[1px]">★★★★★</div>
                </div>
              </div>
              <p className="figtree text-[13px] leading-relaxed text-[#45526B] relative">{t.quote}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          {TESTIMONIALS.map((t, i) => (
            <span
              key={t.name}
              className={`w-2 h-2 rounded-full ${i === 0 ? "bg-[#0955AC]" : "bg-black/10"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
