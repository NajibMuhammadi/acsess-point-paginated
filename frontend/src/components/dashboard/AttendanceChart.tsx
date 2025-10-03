import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export const AttendanceChart = ({
    userData,
}: {
    userData: { day: string; checkIns: number }[];
}) => {
    return (
        <div className="bg-white rounded-xl p-6 shadow-sm dark:bg-primary/10">
            <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                    Attendance Trends
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                    Weekly check-in overview
                </p>
            </div>

            <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ">
                <div className="min-w-[300px]">
                    <ResponsiveContainer
                        width="100%"
                        height={450}
                        className="sm:h-[450px]"
                    >
                        <AreaChart
                            data={userData}
                            margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id="colorCheckIns"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#3B82F6"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="#93C5FD"
                                        stopOpacity={0.1}
                                    />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                stroke="#E5E7EB"
                                strokeDasharray="3 3"
                                vertical={false}
                                opacity={0.4}
                            />

                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fill: "#6B7280",
                                    fontSize: 12,
                                    fontWeight: 500,
                                }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fill: "#6B7280",
                                    fontSize: 12,
                                    fontWeight: 500,
                                }}
                                width={35}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#FFFFFF",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: "0.5rem",
                                    boxShadow:
                                        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                    padding: "0.75rem",
                                }}
                                labelStyle={{
                                    color: "#6B7280",
                                    fontSize: "0.875rem",
                                    fontWeight: 500,
                                }}
                                itemStyle={{
                                    color: "#3B82F6",
                                    fontWeight: 600,
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="checkIns"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorCheckIns)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
