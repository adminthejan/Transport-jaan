import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import miniDownArrow from "../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Groups bookings by month (based on travelDate, falling back to bookingDate)
 * and counts "done" (Completed/Confirmed) vs "cancelled" bookings per month.
 * Returns the last 8 months that actually have data, oldest first.
 */
export function aggregateMonthly(bookings) {
  const map = {};

  bookings.forEach((b) => {
    const dateStr = b.travelDate || b.bookingDate;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) {
      map[key] = {
        key,
        year: d.getFullYear(),
        month: d.getMonth(),
        done: 0,
        cancelled: 0,
      };
    }

    const status = (b.status || "").toLowerCase();
    if (status === "cancelled") {
      map[key].cancelled += 1;
    } else if (status === "completed" || status === "confirmed") {
      map[key].done += 1;
    }
  });

  return Object.values(map)
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-8);
}

// Custom Tooltip
function CustomTooltip({ tooltip, entries, labels, doneData, cancelledData }) {
  if (!tooltip || !tooltip.opacity || !entries.length) return null;
  const { dataPoints } = tooltip;
  if (!dataPoints || dataPoints.length === 0) return null;
  const dp = dataPoints[0];
  const month = labels[dp.dataIndex];
  const year = entries[dp.dataIndex]?.year ?? new Date().getFullYear();
  const done = doneData[dp.dataIndex];
  const cancelled = Math.abs(cancelledData[dp.dataIndex]);
  const type = dp.datasetIndex === 0 ? "Done" : "Cancelled";
  const value = type === "Done" ? done : cancelled;
  return (
    <div
      style={{
        position: "absolute",
        left: tooltip.caretX,
        top: tooltip.caretY - 60,
        background: "#D8E4F2",
        color: "#000",
        padding: "12px 24px",
        borderRadius: 12,
        boxShadow: "0 2px 8px #0001",
        pointerEvents: "none",
        minWidth: 120,
        textAlign: "center",
        zIndex: 100,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="text-[14px] font-[600]">
        {month} {year}
      </div>
      <div className="text-[16px] font-[700] text-[#000000]">
        <span className="font-[700] text-[16px]">{type} </span>
        {value}
      </div>
    </div>
  );
}

function BookingBarChart({ bookings = [] }) {
  const chartRef = React.useRef();
  const [tooltipModel, setTooltipModel] = React.useState(null);

  const entries = React.useMemo(() => aggregateMonthly(bookings), [bookings]);
  const labels = entries.map((e) => MONTH_NAMES[e.month]);
  const doneData = entries.map((e) => e.done);
  const cancelledData = entries.map((e) => -e.cancelled); // negative for downward bars

  const maxAbs = Math.max(1, ...doneData, ...cancelledData.map((v) => Math.abs(v)));
  // Round the axis max up to the nearest 50 for a bit of breathing room.
  const axisMax = Math.max(50, Math.ceil((maxAbs * 1.2) / 50) * 50);

  const data = {
    labels,
    datasets: [
      {
        label: "Done",
        data: doneData,
        backgroundColor: labels.map((_, i) => (i === labels.length - 1 ? "#39CEF3" : "#0955AC")),
        borderRadius: { topLeft: 8, topRight: 8 },
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
        stack: "booking",
      },
      {
        label: "Cancelled",
        data: cancelledData,
        backgroundColor: "#000000",
        borderRadius: { bottomLeft: 8, bottomRight: 8 },
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
        stack: "booking",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: function (context) {
          // Custom tooltip rendering handled below
        },
        callbacks: {
          label: function (context) {
            // Not used, custom tooltip below
            return "";
          },
        },
      },
      title: {
        display: false,
      },
    },
    layout: {
      padding: {
        top: 20,
        bottom: 10,
        left: 0,
        right: 0,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: "#7B7B7A",
          font: {
            size: 14,
            weight: 500,
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        min: -axisMax,
        max: axisMax,
        stacked: true,
        grid: {
          color: "#00000040",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          stepSize: axisMax / 2,
          color: "#B0B0B0",
          font: {
            size: 14,
          },
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    hover: {
      mode: "index",
      intersect: false,
    },
  };

  // Custom tooltip handler
  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart || entries.length === 0) return;
    chart.options.plugins.tooltip.external = (context) => {
      setTooltipModel({
        ...context.tooltip,
      });
    };
    chart.update();

    // Show tooltip for the highest 'Done' bar on mount
    const maxDone = Math.max(...doneData);
    const maxDoneIndex = doneData.indexOf(maxDone);
    const timer = setTimeout(() => {
      if (!chart) return;
      const meta = chart.getDatasetMeta(0); // 0 for 'Done' dataset
      if (!meta || !meta.data || !meta.data[maxDoneIndex]) return;
      const bar = meta.data[maxDoneIndex];
      const { x, y } = bar.getCenterPoint();
      setTooltipModel({
        opacity: 1,
        dataPoints: [
          {
            dataIndex: maxDoneIndex,
            datasetIndex: 0,
          },
        ],
        caretX: x,
        caretY: y,
      });
    }, 500); // Delay to ensure chart is rendered

    return () => clearTimeout(timer);
  }, [entries.length]);

  return (
    <div className="w-full h-full flex flex-col md:w-[500px] xl:w-[500px] relative px-8 pt-8 pb-4">
      {/* Header */}
      <div className="flex xl:flex-row flex-col justify-between items-center mb-6">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-[28px] font-[700]">Booking Overview</h2>
          <div className="flex flex-row items-center gap-6 mt-1">
            <div className="flex flex-row items-center gap-2">
              <span className="inline-block w-6 h-6 rounded bg-[#0955AC]"></span>
              <span className="text-[20px] font-[600] text-[#7B7B7A]">Done</span>
            </div>
            <div className="flex flex-row items-center gap-2">
              <span className="inline-block w-6 h-6 rounded bg-black"></span>
              <span className="text-[20px] font-[600] text-[#7B7B7A]">Cancelled</span>
            </div>
          </div>
        </div>
        <div className="ml-8 mt-5 xl:mt-0">
          <button className="bg-[#F3F3F3] rounded-lg px-4 py-2 flex flex-row items-center gap-2 text-[16px] font-[500] text-[#7B7B7A] shadow-none border-none outline-none">
            Last {entries.length || 8} months
            <img src={miniDownArrow} alt="dropdown" />
          </button>
        </div>
      </div>
      {/* Chart */}
      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#7B7B7A] text-[16px] min-h-[200px]">
          No booking data yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="relative w-full min-w-[800px]" style={{ height: `300px` }}>
            <Bar ref={chartRef} data={data} options={options} />
            {/* Custom Tooltip Render */}
            {tooltipModel && (
              <CustomTooltip
                tooltip={tooltipModel}
                entries={entries}
                labels={labels}
                doneData={doneData}
                cancelledData={cancelledData}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingBarChart;
