"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/app/dashboard/layout";
import { Input } from "@/components/ui/input";
import {
    AlertTriangle,
    Search,
    MessageCircleWarning,
    FlameKindling,
    FlaskConical,
} from "lucide-react";

function getUserToken() {
    return localStorage.getItem("userToken");
}

export default function AlarmCenterPage() {
    const { alarms } = useAdminData(); // 👈 Realtidsdata via AdminLayout
    const [localAlarms, setLocalAlarms] = useState<any[]>([]); // 👈 Första laddning
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // 🔹 Hämta alla larm från backend (initialt)
    useEffect(() => {
        const fetchAlarms = async () => {
            const token = getUserToken();
            if (!token) return console.warn("Ingen token hittad");

            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/alarm/all`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        credentials: "include",
                    }
                );
                const data = await res.json();
                if (data.success) {
                    const sorted = data.alarms.sort(
                        (a: any, b: any) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                    );
                    setLocalAlarms(sorted);
                }
            } catch (err) {
                console.error("❌ Error fetching alarms:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAlarms();
    }, []);

    // 🧠 Kombinera initial data + realtidsdata
    const mergedAlarms = [...alarms, ...localAlarms].reduce((acc, alarm) => {
        if (!acc.some((a: any) => a.alarmId === alarm.alarmId)) acc.push(alarm);
        return acc;
    }, [] as any[]);

    // 🔍 Filtrera efter sökning
    const filteredAlarms = mergedAlarms.filter(
        (a: any) =>
            a.buildingName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.message?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 📊 Statistik
    const activeAlarms = mergedAlarms.filter(
        (a: any) => !a.acknowledged
    ).length;
    const totalAlarms = mergedAlarms.length;

    // 🔔 Ikoner
    const getAlarmIcon = (type: number) => {
        switch (type) {
            case 1:
                return (
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <MessageCircleWarning className="w-5 h-5 text-amber-500" />
                    </div>
                );
            case 2:
                return (
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <FlameKindling className="w-5 h-5 text-red-500" />
                    </div>
                );
            case 3:
                return (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <FlaskConical className="w-5 h-5 text-green-500" />
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 rounded-full bg-gray-300/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-gray-500" />
                    </div>
                );
        }
    };

    // 🖼️ UI
    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        Alarm Center
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Monitor and manage all alarms in real time
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col gap-1 rounded-lg p-4 bg-white dark:bg-gray-800/50 shadow-sm min-w-[130px]">
                        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                            Total Alarms
                        </p>
                        <p className="text-gray-900 dark:text-white text-xl font-semibold">
                            {totalAlarms}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg p-4 bg-white dark:bg-gray-800/50 shadow-sm min-w-[130px]">
                        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                            Active Alarms
                        </p>
                        <p className="text-red-600 dark:text-red-400 text-xl font-semibold">
                            {activeAlarms}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sökfält */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Search alarms by building or message..."
                            className="pl-10 h-11 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Larmkort */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAlarms.map((alarm: any) => (
                    <div
                        key={alarm.alarmId}
                        className="flex flex-col gap-3 rounded-lg p-4 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                        onClick={() =>
                            router.push(`/dashboard/larm/${alarm.alarmId}`)
                        }
                    >
                        <div className="flex items-center gap-3">
                            {getAlarmIcon(alarm.alarmType)}
                            <p className="text-base font-semibold text-gray-900 dark:text-white">
                                {alarm.buildingName}
                            </p>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                            {alarm.message}
                        </p>

                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>
                                {new Date(alarm.createdAt).toLocaleString(
                                    "sv-SE"
                                )}
                            </span>
                            <span>
                                {alarm.totalPeople ?? 0}{" "}
                                {alarm.totalPeople === 1 ? "person" : "people"}{" "}
                                affected
                            </span>
                        </div>

                        <div className="flex justify-between items-center mt-1">
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    alarm.acknowledged
                                        ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200"
                                        : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200"
                                }`}
                            >
                                {alarm.acknowledged ? "Acknowledged" : "Active"}
                            </span>

                            <button className="text-primary font-semibold text-sm hover:underline">
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
