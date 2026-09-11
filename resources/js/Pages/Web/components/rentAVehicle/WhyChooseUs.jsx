import React from "react";
import { ShieldCheck, Star, Clock, Wallet } from "lucide-react";

const DEFAULT_POINTS = [
  {
    icon: ShieldCheck,
    title: "Verified Vendors",
    desc: "Every vehicle owner on our platform is identity-checked, so you always rent from a trusted source.",
  },
  {
    icon: Star,
    title: "Top-Rated Fleet",
    desc: "Backed by a 4.8★ average rating from renters, across land, sea, and air vehicles.",
  },
  {
    icon: Wallet,
    title: "All-Inclusive Pricing",
    desc: "The price you see is the price you pay — no hidden fees added at checkout.",
  },
  {
    icon: Clock,
    title: "24/7 Customer Support",
    desc: "Our support team is available around the clock, before, during, and after your booking.",
  },
];

const WhyChooseUs = ({
  points: customPoints,
  title = "MORE THAN JUST A",
  highlight = "RENTAL",
  badge = "Why Choose Us",
}) => {
  const points = customPoints || DEFAULT_POINTS;

  return (
    <div className="w-full py-10 md:py-14 bg-[#F8FAFC]">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="text-center max-w-[600px] mx-auto mb-8 md:mb-10">
          <span className="poppins inline-block text-[10px] sm:text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] bg-[#EAF1FE] px-3 py-1 rounded-full uppercase mb-3">
            {badge}
          </span>
          <h2 className="bebas-neue text-[28px] md:text-[36px] font-[400] text-[#0B1B34] leading-tight">
            {title} <span className="text-[#0955AC]">{highlight}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {points.map((p) => (
            <div
              key={p.title}
              className="group text-center p-5 sm:p-6 rounded-[18px] bg-white border border-black/5 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="w-[54px] h-[54px] rounded-full bg-[#EAF1FE] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0955AC] transition-colors duration-300">
                <p.icon className="w-[22px] h-[22px] text-[#0955AC] group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="figtree text-[15px] sm:text-[16px] font-[700] text-[#0B1B34] mb-1.5">{p.title}</h3>
              <p className="figtree text-[12.5px] sm:text-[13px] text-[#00000080] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhyChooseUs;
