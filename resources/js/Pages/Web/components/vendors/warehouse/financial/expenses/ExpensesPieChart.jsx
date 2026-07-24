import React, { useRef, useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell } from "recharts";
import miniArrow from "../../../../../assets/financial/expenses/miniArrow.svg";

const PALETTE = ["#344B8E", "#3DD0FF", "#0955AC", "#8CA9E6", "#50AE31", "#F0BB0D", "#FF8888"];

// `categories` is an array of { name, value } for the current month's
// expenses, supplied by the real /vendors/warehouse/api/expenses/stats endpoint.
const ExpensesPieChart = ({ categories = [] }) => {
    const containerRef = useRef(null);
    const [chartSize, setChartSize] = useState(140);
    const [isMobile, setIsMobile] = useState(false);

    const total = useMemo(() => categories.reduce((sum, item) => sum + item.value, 0), [categories]);

    const data = useMemo(
        () =>
            categories.map((item, idx) => ({
                ...item,
                percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
                color: PALETTE[idx % PALETTE.length],
            })),
        [categories, total]
    );

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                if (width < 400) {
                    setChartSize(100);
                } else if (width < 600) {
                    setChartSize(120);
                } else {
                    setChartSize(140);
                }
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    if (!data.length) {
        return (
            <div className="flex items-center justify-center w-full h-full text-[#7B7B7A] text-[14px]">
                No expenses recorded this month.
            </div>
        );
    }

    const mobileView = (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <div className="text-[12px] font-[500] text-[#00000080] w-[100px] h-[30px] gap-2 bg-[#D9D9D94F] flex justify-center items-center rounded-[6px] px-2 py-1 mb-4">
                This Month
                <img src={miniArrow} className="w-3 h-3" />
            </div>
            <div className="text-[12px] font-[500] text-[#00000080] mb-1">Total Expenses</div>
            <div className="text-[20px] font-[700] text-[#000000] mb-6">LKR {total.toLocaleString()}</div>
            <div className="w-full h-[0.8px] bg-[#00000080] mb-4" />
            <div className="flex flex-col w-full space-y-2">
                {data.map((item) => (
                    <div key={item.name} className="bg-white rounded-lg shadow p-4 border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span
                                    className="w-[28px] h-[18px] rounded-[4px] mr-3 flex items-center justify-center"
                                    style={{ backgroundColor: item.color }}
                                >
                                    <span className="text-[8px] font-[700] text-[#FFFFFF]">{item.percent}%</span>
                                </span>
                                <span className="text-[14px] font-[600] text-[#00000080]">{item.name}</span>
                            </div>
                            <span className="text-[15px] font-[600] text-[#000000]">
                                LKR {item.value.toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const desktopView = (
        <div ref={containerRef} className="flex flex-col items-center justify-center w-full h-full">
            <div className="flex flex-col xl:flex-row items-center justify-center w-full mb-2 gap-4 sm:gap-0">
                <PieChart width={chartSize} height={chartSize}>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={chartSize * 0.32}
                        outerRadius={chartSize * 0.46}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                </PieChart>
                <div className="flex flex-col items-center justify-center w-full px-2 sm:px-5">
                    <div className="text-[12px] sm:text-[14px] font-[500] text-[#00000080] w-[100px] sm:w-[114px] h-[30px] sm:h-[33px] gap-2 sm:gap-3 bg-[#D9D9D94F] flex justify-center items-center rounded-[6px] px-2 sm:px-3 py-1">
                        This Month
                        <img src={miniArrow} className="w-3 h-3 sm:w-auto sm:h-auto" />
                    </div>
                    <div className="text-[12px] sm:text-[14px] font-[500] text-[#00000080] mt-1">Total Expenses</div>
                    <div className="text-[20px] sm:text-[26px] font-[700] text-[#000000] w-full text-center pr-2 leading-tight">
                        LKR {total.toLocaleString()}
                    </div>
                </div>
            </div>
            <div className="min-w-[200px] sm:min-w-[287px] w-full h-[0.8px] bg-[#00000080] mt-6 sm:mt-10" />
            <div className="flex flex-col w-full mt-4 px-2 sm:px-0">
                {data.map((item, idx) => (
                    <div
                        className={`flex flex-row items-center justify-between w-full py-1 ${
                            idx !== data.length - 1 ? "mb-1" : ""
                        }`}
                        key={item.name + "-row"}
                    >
                        <div className="flex flex-row items-center">
                            <span
                                className="w-[28px] sm:w-[32px] h-[18px] sm:h-[20px] rounded-[4px] mr-2 sm:mr-3 flex items-center justify-center"
                                style={{ backgroundColor: item.color }}
                            >
                                <span className="text-[8px] sm:text-[10px] font-[700] text-[#FFFFFF]">
                                    {item.percent}%
                                </span>
                            </span>
                            <span className="text-[14px] sm:text-[16px] font-[600] text-[#00000080]">
                                {item.name}
                            </span>
                        </div>
                        <span className="text-[13px] sm:text-[15px] font-[600] text-[#000000]">
                            LKR {item.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    return isMobile ? mobileView : desktopView;
};

export default ExpensesPieChart;
