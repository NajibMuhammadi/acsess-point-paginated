"use client";

import { useAdminData } from "./layout";
import { KPICard } from "@/components/dashboard/KPICard";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { BuildingsTable } from "@/components/dashboard/BuildingsTable";
import { Building2, Users, Radio, Network } from "lucide-react";

export default function AdminPage() {
    const {
        userData,
        buildings,
        stations,
        visitors,
        weeklyData,
        recentAttendance,
        dashboardStats,
    } = useAdminData();

    console.log("🕐 Recent Attendance in AdminPage:", dashboardStats);

    const totalBuildings = buildings.length;
    const activeStations = stations.filter((s) => s.buildingId);
    const totalStations = stations.length;

    // 🔹 Omvandla recentAttendance till rätt format för RecentActivity-komponenten
    // 🟢 Transformera attendance till separata check-in och check-out events
    const recentActivity = (recentAttendance || [])
        .filter((a) => Boolean(a.visitorId))
        .flatMap((a) => {
            const building =
                buildings.find(
                    (b) =>
                        b.buildingId === a.buildingId || b._id === a.buildingId
                ) || null;
            const visitor =
                visitors.find((v) => v.visitorId === a.visitorId) || null;

            const visitType =
                a.type === "personal"
                    ? "Personal"
                    : a.type === "business"
                    ? "Business"
                    : visitor?.type === "personal"
                    ? "Personal"
                    : visitor?.type === "business"
                    ? "Business"
                    : "Okänd typ";

            const events = [];

            // 🟢 Lägg alltid till check-in event
            events.push({
                attendanceId: `${a.attendanceId}-in`,
                time: new Date(a.checkInTime).toLocaleString("sv-SE", {
                    dateStyle: "short",
                    timeStyle: "short",
                }),
                timestamp: new Date(a.checkInTime).getTime(),
                building: building?.buildingName || "Okänd byggnad",
                visitor:
                    a.visitorName || visitor?.visitorName || "Okänd besökare",
                uid: a.uid || "-",
                station: a.stationId || "Okänd station",
                type: "in" as const,
                visitType,
            });

            // 🟢 Lägg till check-out event om det finns
            if (a.checkOutTime) {
                events.push({
                    attendanceId: `${a.attendanceId}-out`,
                    time: new Date(a.checkOutTime).toLocaleString("sv-SE", {
                        dateStyle: "short",
                        timeStyle: "short",
                    }),
                    timestamp: new Date(a.checkOutTime).getTime(),
                    building: building?.buildingName || "Okänd byggnad",
                    visitor:
                        a.visitorName ||
                        visitor?.visitorName ||
                        "Okänd besökare",
                    uid: a.uid || "-",
                    station: a.stationId || "Okänd station",
                    type: "out" as const,
                    visitType,
                });
            }

            return events;
        })
        .sort((a, b) => b.timestamp - a.timestamp) // 🟢 Sortera efter senaste först
        .slice(0, 5); // 🟢 Ta bara de 5 senaste

    return (
        <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-8">
            {/* 🔹 KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <KPICard
                    icon={Building2}
                    title="Total Buildings"
                    value={dashboardStats.totalBuildings}
                />
                <KPICard
                    icon={Radio}
                    title="Active Stations"
                    value={dashboardStats.activeStations}
                />
                <KPICard
                    icon={Network}
                    title="Total Stations"
                    value={dashboardStats.totalStations}
                />
                <KPICard
                    icon={Users}
                    title="Total Active Users"
                    value={dashboardStats.currentlyCheckedIn}
                />
            </div>

            {/* 🔹 Attendance chart + recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2">
                    <AttendanceChart userData={weeklyData} />
                </div>
                <div>
                    <RecentActivity recentActivity={recentActivity} />
                </div>
            </div>

            {/* 🔹 (Optional) Building table */}
            <BuildingsTable
                buildings={buildings}
                stations={stations}
                /*  attendance={attendance} */
                isAdmin={userData?.role === "admin"}
            />
        </div>
    );
}
