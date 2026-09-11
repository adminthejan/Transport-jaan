import React from "react";
import { Phone, Mail, MessageCircle } from "lucide-react";

const ContactStrip = () => {
  const items = [
    {
      icon: Phone,
      label: "Call Us 24/7",
      value: "+94 11 234 5678",
      href: "tel:+94112345678",
    },
    {
      icon: Mail,
      label: "Email Us",
      value: "support@transport-jaan.com",
      href: "mailto:support@transport-jaan.com",
    },
    {
      icon: MessageCircle,
      label: "Need Help?",
      value: "Live chat with our team",
    },
  ];

  return (
    <div className="bg-[#0955AC] py-8 md:py-10">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
        {items.map((item) => {
          const inner = (
            <>
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="poppins text-white/70 text-[13px] mb-0.5">{item.label}</div>
                <div className="poppins text-white font-[700] text-[16px]">{item.value}</div>
              </div>
            </>
          );
          return item.href ? (
            <a key={item.label} href={item.href} className="flex items-center gap-4">
              {inner}
            </a>
          ) : (
            <div key={item.label} className="flex items-center gap-4">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContactStrip;
