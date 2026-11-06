import React from "react";

const MobileCalendarCard = ({ days, times, events, proPicTwo }) => {
  // Group events by day
  const eventsByDay = days.map((day, dayIdx) => {
    const dayEvents = events.filter(event => event.day === dayIdx);
    return {
      ...day,
      events: dayEvents
    };
  });

  return (
    <div className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-5 py-5 md:hidden"
         style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
      <h1 className="text-[20px] font-[700] mb-5">Weekly Schedule</h1>
      <div className="flex flex-col gap-4">
        {eventsByDay.map((day, dayIdx) => (
          <div key={dayIdx} className="border border-[#E5E5E5] rounded-[10px] p-4">
            <h2 className="text-[16px] font-[600] mb-3">
              {day.label} {day.date}
            </h2>
            {day.events.length > 0 ? (
              <div className="flex flex-col gap-2">
                {day.events.map((event, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-[8px] flex flex-row items-center gap-3 ${
                      event.status === "done" ? "bg-[#C5E6F9]" : "bg-[#FFDBDF]"
                    }`}
                  >
                    <img
                      src={proPicTwo}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="text-[14px] font-[600]">{event.title}</span>
                      <span className="text-[12px] text-[#00000080]">{event.person}</span>
                      <span className="text-[12px] text-[#00000080]">{event.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-[#00000080]">No events</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileCalendarCard;