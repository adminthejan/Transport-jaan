import React, { useRef, useState, useEffect, useMemo } from "react";
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Filler,
    Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Filler,
    Legend
);

// `points` is an array of { label, income, expenses } for the last 12 months,
// supplied by the real /vendors/warehouse/api/expenses/stats endpoint.
const CashflowChart = ({ points = [] }) => {
    const chartRef = useRef();
    const chartDivRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    const months = useMemo(() => points.map((p) => p.label), [points]);
    const incomeData = useMemo(() => points.map((p) => p.income), [points]);
    const expensesData = useMemo(() => points.map((p) => p.expenses), [points]);
    const maxValue = useMemo(
        () => Math.max(1, ...incomeData, ...expensesData),
        [incomeData, expensesData]
    );
    const highlightIndex = points.length ? points.length - 1 : 0;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [tooltip, setTooltip] = React.useState(null);

    const data = {
        labels: months,
        datasets: [
            {
                label: "Income",
                data: incomeData,
                fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, "#C4E0FF");
                    gradient.addColorStop(0.7539, "rgba(9, 85, 172, 0.4)");
                    gradient.addColorStop(1, "rgba(9, 85, 172, 0.4)");
                    return gradient;
                },
                borderColor: "#0955AC",
                pointBackgroundColor: "#0955AC",
                pointRadius: 0,
                tension: 0.4,
                borderWidth: 3,
                pointHoverRadius: 7,
                order: 2,
            },
            {
                label: "Expenses",
                data: expensesData,
                fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, "rgba(217, 217, 217, 0.5)");
                    gradient.addColorStop(0.274, "rgba(217, 217, 217, 0.5)");
                    gradient.addColorStop(0.6971, "rgba(115, 115, 115, 0.2)");
                    gradient.addColorStop(1, "rgba(115, 115, 115, 0.2)");
                    return gradient;
                },
                borderColor: "#000000",
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 7,
                pointBackgroundColor: "#000000",
                tension: 0.4,
                order: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: false,
                external: function () {},
            },
        },
        interaction: { mode: "nearest", intersect: false },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { family: "Figtree", size: 14, weight: 500 }, color: "#00000040" },
            },
            y: {
                grid: { color: "#00000040", drawBorder: false },
                ticks: {
                    callback: (value) => `LKR ${(value / 1000).toFixed(0)}K`,
                    font: { family: "Figtree", size: 14, weight: 500 },
                    color: "#7B7B7A",
                    maxTicksLimit: 5,
                },
                min: 0,
                max: Math.ceil((maxValue * 1.2) / 1000) * 1000,
            },
        },
        elements: { point: { hoverRadius: 4 } },
    };

    const customTooltip = (context) => {
        const { chart, tooltip: t } = context;
        if (!t.opacity) {
            setTooltip(null);
            return;
        }
        const dataIndex = t.dataPoints?.[0]?.dataIndex;
        if (dataIndex !== undefined && months[dataIndex] !== undefined) {
            const paddingLeft = isMobile ? 0 : (chartDivRef.current ? parseInt(getComputedStyle(chartDivRef.current).paddingLeft, 10) : 0);
            setTooltip({
                x: paddingLeft + chart.scales.x.getPixelForValue(months[dataIndex]),
                y: chart.scales.y.getPixelForValue(expensesData[dataIndex]),
                month: months[dataIndex],
                income: incomeData[dataIndex],
                expenses: expensesData[dataIndex],
            });
        } else {
            setTooltip(null);
        }
    };

    React.useEffect(() => {
        if (!isMobile && months.length) {
            const chart = chartRef.current;
            if (chart) {
                chart.options.plugins.tooltip.external = customTooltip;
                const paddingLeft = chartDivRef.current ? parseInt(getComputedStyle(chartDivRef.current).paddingLeft, 10) : 0;
                setTooltip({
                    x: paddingLeft + chart.scales.x.getPixelForValue(months[highlightIndex]),
                    y: chart.scales.y.getPixelForValue(expensesData[highlightIndex]),
                    month: months[highlightIndex],
                    income: incomeData[highlightIndex],
                    expenses: expensesData[highlightIndex],
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartRef, isMobile, points]);

    if (!points.length) {
        return (
            <div className="w-full h-full flex items-center justify-center text-[#7B7B7A]">
                No cashflow data yet.
            </div>
        );
    }

    const mobileView = (
        <div className="space-y-4 p-4">
            <h1 className="figtree text-[24px] font-[700] mb-4">Cashflow</h1>
            {months.map((month, index) => (
                <div key={month + index} className="bg-white rounded-lg shadow p-4 border">
                    <h3 className="text-lg font-semibold">{month}</h3>
                    <div className="flex justify-between mt-2">
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-600">Income</span>
                            <span className="text-xl font-bold text-green-600">LKR {incomeData[index].toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-600">Expenses</span>
                            <span className="text-xl font-bold text-red-600">LKR {expensesData[index].toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const desktopView = (
        <>
            {/* Custom Legends */}
            <div className="flex flex-row gap-8 items-center mt-7 mb-2 ml-2 px-12">
                <h1 className="figtree text-[24px] font-[700]">Cashflow</h1>
                <div className="ml-auto">
                    <span className="bg-[#F6F8FA] rounded-[8px] px-5 py-2 text-[12px] font-[600] text-[#00000080]">
                        Last 12 months
                    </span>
                </div>
            </div>
            <div className="flex flex-row gap-6 items-center xl:ml-20 mb-2 px-10">
                <div className="flex flex-row gap-2 items-center">
                    <div className="w-[22px] h-[4px] bg-[#0A56AD]" />
                    <span className="figtree text-[20px] font-[600] text-[#00000080]">Income</span>
                </div>
                <div className="flex flex-row gap-2 items-center">
                    <div className="w-[22px] h-[4px] bg-[#000000]" />
                    <span className="figtree text-[20px] font-[600] text-[#00000080]">Expenses</span>
                </div>
            </div>
            <div className="w-full h-[300px] bg-transparent px-10 pb-10 mt-5 overflow-auto xl:overflow-visible" ref={chartDivRef}>
                <div className="min-h-[320px]">
                    <Line ref={chartRef} data={data} options={options} />
                </div>
                {tooltip && (
                    <div
                        className="absolute z-10 bg-[#D8E4F2] rounded-[10px] px-2 py-2 shadow-lg flex flex-col items-center"
                        style={{
                            left: tooltip.x - 20,
                            top: tooltip.y - 20,
                            minWidth: 180,
                            width: 152,
                            height: 73,
                        }}
                    >
                        <div className="figtree text-[14px] font-[600]">{tooltip.month}</div>
                        <div className="flex flex-col">
                            <div className="flex flex-row items-center gap-4">
                                <span className="text-[#000000] text-[10px] font-[500]">Income</span>
                                <span className="text-[#000000] text-[13px] font-[700]">
                                    LKR {tooltip.income.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-row items-center gap-4">
                                <span className="text-[#000000] text-[10px] font-[500]">Expenses</span>
                                <span className="text-[#000000] text-[13px] font-[700]">
                                    LKR {tooltip.expenses.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div className="relative w-full overflow-x-auto h-full">
            {isMobile ? mobileView : desktopView}
        </div>
    );
};

export default CashflowChart;
