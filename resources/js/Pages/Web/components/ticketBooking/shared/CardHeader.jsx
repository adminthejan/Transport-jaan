import React from "react";

// Premium gradient header shared by Bus/Train/Flight search cards — an icon
// badge, title, and optional subtitle over a soft multi-stop gradient with
// blurred decorative circles, replacing the old flat single-color banner.
const CardHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="relative rounded-t-[22px] bg-gradient-to-br from-[#0B63C4] via-[#0955AC] to-[#073E82] px-6 sm:px-8 py-6 sm:py-7 overflow-hidden">
    <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
    <div className="absolute right-20 -bottom-14 w-28 h-28 rounded-full bg-white/5 blur-xl pointer-events-none" />
    <div className="relative flex items-center gap-3.5">
      {Icon && (
        <div className="w-12 h-12 rounded-[14px] bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
          <Icon className="w-[22px] h-[22px] text-[#FFC93C]" />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="text-white font-[800] text-[19px] sm:text-[21px] tracking-wide leading-tight">{title}</h3>
        {subtitle && <p className="text-white/70 text-[12px] sm:text-[12.5px] mt-1 leading-snug">{subtitle}</p>}
      </div>
    </div>
  </div>
);

export default CardHeader;
