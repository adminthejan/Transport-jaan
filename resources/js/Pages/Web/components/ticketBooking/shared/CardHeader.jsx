import React from "react";

// Premium gradient header shared by Bus/Train/Flight search cards — an icon
// badge, title, and optional subtitle over a soft multi-stop gradient with
// blurred decorative circles, replacing the old flat single-color banner.
const CardHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="relative rounded-t-[20px] bg-gradient-to-br from-[#0B63C4] via-[#0955AC] to-[#073E82] px-5 sm:px-6 py-3.5 sm:py-4 overflow-hidden">
    <div className="absolute -right-10 -top-12 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
    <div className="absolute right-16 -bottom-10 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />
    <div className="relative flex items-center gap-3">
      {Icon && (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
          <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-[#FFC93C]" />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="text-white font-[800] text-[16px] sm:text-[18px] tracking-wide leading-tight">{title}</h3>
        {subtitle && <p className="text-white/75 text-[11.5px] sm:text-[12px] mt-0.5 leading-snug">{subtitle}</p>}
      </div>
    </div>
  </div>
);

export default CardHeader;
