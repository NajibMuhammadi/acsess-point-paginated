"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function getUserToken() {
    return localStorage.getItem("userToken");
}

export default function AlarmDetailsPage() {
    const { alarmId } = useParams();
    const router = useRouter();
    const [alarm, setAlarm] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchAlarm = async () => {
        const token = getUserToken();
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/alarm/${alarmId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success) setAlarm(data.alarm);
            console.log("✅ Fetched alarm:", data.alarm);
        } catch (err) {
            console.error("❌ Error fetching alarm:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (alarmId) fetchAlarm();
    }, [alarmId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[80vh]">
                <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div>
            </div>
        );
    }

    if (!alarm) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-gray-400">
                <p>Alarm not found.</p>
                <Button
                    onClick={() => router.push("/dashboard/alarm")}
                    className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                >
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {alarm.alarmType === 1
                            ? "⚠️ General Alarm"
                            : alarm.alarmType === 2
                            ? "🔥 Fire Alarm"
                            : alarm.alarmType === 3
                            ? "☣️ Gas Alarm"
                            : "🚨 Alarm Details"}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Building: {alarm.buildingName}
                    </p>
                </div>
                <Button
                    onClick={() => router.push("/dashboard/alarm")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">
                        <ArrowLeft />
                    </span>
                    Back to Alarms
                </Button>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left side */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Alarm Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Alarm Information
                            </h2>
                            <span
                                className={`px-3 py-1 text-xs font-medium rounded-full ${
                                    alarm.acknowledged
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                                }`}
                            >
                                {alarm.acknowledged ? "Acknowledged" : "Active"}
                            </span>
                        </div>

                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            <div className="py-3 flex justify-between text-sm">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Building
                                </p>
                                <p className="text-gray-900 dark:text-white">
                                    {alarm.buildingName}
                                </p>
                            </div>
                            <div className="py-3 flex justify-between text-sm">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Message
                                </p>
                                <p className="text-gray-900 dark:text-white text-right">
                                    {alarm.message}
                                </p>
                            </div>
                            <div className="py-3 flex justify-between text-sm">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Created At
                                </p>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(alarm.createdAt).toLocaleString(
                                        "sv-SE"
                                    )}
                                </p>
                            </div>

                            {alarm.acknowledged && (
                                <div className="py-3 flex justify-between text-sm">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Acknowledged At
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {new Date(
                                            alarm.acknowledgedAt
                                        ).toLocaleString("sv-SE")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* People in building */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            People Affected ({alarm.totalPeople})
                        </h2>
                        {alarm.people && alarm.people.length > 0 ? (
                            <ul className="space-y-2">
                                {alarm.people.map((p: any, idx: number) => (
                                    <li
                                        key={idx}
                                        className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2"
                                    >
                                        <span className="text-gray-900 dark:text-white">
                                            {p.visitorName}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {p.phoneNumber}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                No people recorded for this alarm.
                            </p>
                        )}
                    </div>
                </div>

                {/* Right side */}
                <div className="space-y-6">
                    {/* Timeline */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Timeline
                        </h2>

                        <div className="relative border-l border-gray-300 dark:border-gray-700 pl-5 space-y-5">
                            <div>
                                <div className="absolute -left-3.5 w-3 h-3 rounded-full bg-red-500"></div>
                                <p className="text-sm text-gray-900 dark:text-white font-medium">
                                    Alarm Created
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(alarm.createdAt).toLocaleString(
                                        "sv-SE"
                                    )}
                                </p>
                            </div>

                            {alarm.acknowledged && (
                                <div>
                                    <div className="absolute -left-3.5 w-3 h-3 rounded-full bg-green-500 mt-8"></div>
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                                        Acknowledged
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(
                                            alarm.acknowledgedAt
                                        ).toLocaleString("sv-SE")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Notes
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-900 dark:text-white">
                                    Security team dispatched.
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Admin –{" "}
                                    {new Date(
                                        alarm.createdAt
                                    ).toLocaleTimeString("sv-SE")}
                                </p>
                            </div>

                            <div>
                                <textarea
                                    placeholder="Add a note..."
                                    rows={3}
                                    className="w-full bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                />
                                <Button className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
                                    Add Note
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
