"use client";

import { useAdminData } from "./layout";
import { KPICard } from "@/components/dashboard/KPICard";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { BuildingsTable } from "@/components/dashboard/BuildingsTable";
import { Building2, Users, Radio, Network } from "lucide-react";

export default function AdminPage() {
    const { userData, buildings, stations, attendance, visitors } =
        useAdminData();

    const totalBuildings = buildings.length;
    const activeStations = stations.filter((s) => s.buildingId);
    const totalStations = stations.length;
    const totalActiveUsers = attendance.filter((a) => !a.checkOutTime).length;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Hämta nuvarande datum
    const now = new Date();

    // Beräkna start på veckan (måndag)
    const startOfWeek = new Date(now);
    // 6 dagar tillbaks om idag är söndag
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    // Sätta timmar, minuter, sekunder och millisekunder till 0
    startOfWeek.setHours(0, 0, 0, 0);

    // Gruppér check-ins per dag i veckan
    const weeklyData = days.map((day, index) => {
        // Hitta dagens datum
        const dayStart = new Date(startOfWeek);
        // Sätt datum till dagens datum plus index
        dayStart.setDate(startOfWeek.getDate() + index);

        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const checkIns = attendance.filter((a) => {
            const checkInDate = new Date(a.checkInTime || a.timestamp);
            return checkInDate >= dayStart && checkInDate < dayEnd;
        }).length;

        return { day, checkIns };
    });

    const recentActivity = attendance
        .filter((a) => Boolean(a.visitorId))
        .sort((a, b) => {
            const timeA = new Date(
                a.checkOutTime || a.checkInTime || a.timestamp
            ).getTime();
            const timeB = new Date(
                b.checkOutTime || b.checkInTime || b.timestamp
            ).getTime();
            return timeB - timeA;
        })
        .slice(0, 5)
        .map((a) => {
            const building = buildings.find(
                (b) => b.buildingId === a.buildingId
            );
            const visitor = visitors.find((v) => v.visitorId === a.visitorId);

            const type: "in" | "out" = a.checkOutTime ? "out" : "in";
            const displayTime = new Date(
                a.checkOutTime || a.checkInTime || a.timestamp
            ).toLocaleString("sv-SE", {
                dateStyle: "short",
                timeStyle: "short",
            });

            return {
                attendanceId: a.attendanceId,
                time: displayTime,
                building: building?.buildingName || "Okänd byggnad",
                visitor: visitor?.visitorName || "Okänd besökare",
                uid: a.uid,
                station: a.stationId || "Okänd station",
                type,
            };
        });

    return (
        <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <KPICard
                    icon={Building2}
                    title="Total Buildings"
                    value={totalBuildings}
                />
                <KPICard
                    icon={Radio}
                    title="Active Stations"
                    value={activeStations.length}
                />
                <KPICard
                    icon={Network}
                    title="Total Stations"
                    value={totalStations}
                />
                <KPICard
                    icon={Users}
                    title="Total Active Users"
                    value={totalActiveUsers}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2">
                    <AttendanceChart userData={weeklyData} />
                </div>
                <div>
                    <RecentActivity recentActivity={recentActivity} />
                </div>
            </div>

            <BuildingsTable
                buildings={buildings}
                stations={stations}
                attendance={attendance}
                isAdmin={userData?.role === "admin"}
            />
        </div>
    );
}
