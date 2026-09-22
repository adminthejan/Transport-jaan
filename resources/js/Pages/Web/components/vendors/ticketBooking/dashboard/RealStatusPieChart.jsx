import React from "react";
import { PieChart, Pie, Cell } from "recharts";

const DEFAULT_DATA = [
  { name: "Confirmed", value: 0, color: "#3DD0FF" },
  { name: "Pending", value: 0, color: "#0955AC" },
  { name: "Cancelled", value: 0, color: "#C4C4C4" },
];

const renderCustomizedLabel = () => {
  // No label in the center for this design
  return null;
};

const RealStatusPieChart = ({ data }) => {
  const chartData = Array.isArray(data) && data.length > 0 ? data : DEFAULT_DATA;
  const hasValues = chartData.some((entry) => (entry.value || 0) > 0);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <PieChart width={172} height={171}>
        <Pie
          data={hasValues ? chartData : DEFAULT_DATA.map((d) => ({ ...d, value: 1 }))}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          startAngle={200}
          endAngle={-160}
          paddingAngle={6}
          dataKey="value"
          label={renderCustomizedLabel}
          stroke="none"
          strokeWidth={0}
          cornerRadius={6}
        >
          {(hasValues ? chartData : DEFAULT_DATA).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={hasValues ? entry.color : "#E5E7EB"} />
          ))}
        </Pie>
      </PieChart>
      <div className="flex flex-col gap-2 mt-6 w-full">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex flex-row items-center justify-between w-full mb-1">
            <div className="flex flex-row items-center gap-2">
              <span className=" w-5 h-5 rounded bg-[#E8EBEF] flex items-center justify-center" style={{ backgroundColor: entry.color }}></span>
              <span className="text-[20px] font-[600] text-[#00000080]">{entry.name}</span>
            </div>
            <div className="flex flex-row items-center gap-2">
              <span className="text-[20px] font-[600] text-[#000000]">{entry.value}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealStatusPieChart;
