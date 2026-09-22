import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import miniDownArrow from "../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#D8E4F2] text-black px-6 py-2 rounded-lg shadow text-center">
        <div className="font-[600] text-[14px] flex flex-row items-center justify-center gap-1">{label} <span>2025</span></div>
        <div className="text-[16px] font-[700]">{payload[0].value}</div>
      </div>
    );
  }
  return null;
};

function BookingOverviewBarChart({ data = [] }) {
  const chartData = Array.isArray(data) ? data : [];

  if (chartData.length === 0) {
    return <div className="w-full h-[300px] flex items-center justify-center text-gray-500">No data available</div>;
  }

  const maxBookings = Math.max(...chartData.map(d => d.bookings || 0), 1000);
  const colors = chartData.map((d, i) => i === 7 ? '#39CEF3' : '#2957C6');
  
  return (
    <div className="w-full flex flex-col items-center">
        <div className="w-[600px] h-auto flex flex-col items-stretch relative">
          <BarChart width={600} height={300} data={chartData} margin={{ top: 40, right: 20, left: 0, bottom: 0 }} barCategoryGap={30}>
          <CartesianGrid stroke="#BDBDBD" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 18, fill: '#7B7B7A', fontWeight: 500, dy: 8, fontFamily: 'Figtree' }}
            height={40}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 18, fill: '#7B7B7A', fontWeight: 600, dx: -8, fontFamily: 'Figtree' }}
            tickFormatter={(value) => value === 1000 ? '1K' : value}
            domain={[0, 1000]}
            width={50}
          />
          <Tooltip
            cursor={{ fill: 'rgba(41, 87, 198, 0.08)' }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#E6EEF7] text-black px-8 py-4 rounded-xl shadow text-center" style={{fontWeight:700, fontSize:18}}>
                    <div className="font-[700] text-[20px] mb-1">{label} 2025</div>
                    <div className="text-[22px] font-[700]">{payload[0].value}</div>
                  </div>
                );
              }
              return null;
            }}
            position={{ y: 30 }}
          />
          <Bar dataKey="bookings" radius={[8, 8, 8, 8]} barSize={32} >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </div>
    </div>
  );
}

export default BookingOverviewBarChart; 