"use client";

import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";

interface HourlyData {
    hour: string;
    checkIns: number;
    checkOuts: number;
}

export default function AttendanceTrends() {
    const [data, setData] = useState<HourlyData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem("userToken");
                const res = await fetch(
                    "http://localhost:5001/api/attendance/today",
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const json = await res.json();

                if (json.success) setData(json.hourlyData || []);
            } catch (err) {
                console.error("Error loading trends:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading)
        return (
            <p className="text-center text-sm text-muted-foreground">
                Laddar trenddata...
            </p>
        );

    return (
        <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">
                📊 Attendance Trends (idag)
            </h2>
            {data.length > 0 ? (
                <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="checkIns"
                                stroke="#22c55e"
                                strokeWidth={2}
                                name="Check-ins"
                            />
                            <Line
                                type="monotone"
                                dataKey="checkOuts"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Check-outs"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="text-center text-sm text-muted-foreground">
                    Ingen aktivitet idag
                </p>
            )}
        </Card>
    );
}
