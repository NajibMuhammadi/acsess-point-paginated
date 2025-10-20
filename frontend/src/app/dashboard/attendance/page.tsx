"use client";

import { useEffect, useState } from "react";
import { Search, Clock, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

function getUserToken() {
    return localStorage.getItem("userToken");
}

export default function AttendancePage() {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // 🔹 Hämta attendance från API
    const fetchAttendance = async () => {
        const token = getUserToken();
        console.log("Token:", token);
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/attendance/all`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success) setAttendance(data.attendance || []);
        } catch (err) {
            console.error("❌ Error fetching attendance:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, []);

    // 🔍 Filtrera baserat på söksträng
    const filtered = attendance.filter(
        (a) =>
            a.visitorName?.toLowerCase().includes(search.toLowerCase()) ||
            a.uid?.toLowerCase().includes(search.toLowerCase()) ||
            a.buildingId?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="px-6 py-8 md:px-12 lg:px-20 xl:px-32 space-y-8">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Attendance
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Visa och spåra in- och utcheckningar i realtid.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    placeholder="Sök på namn, UID eller byggnad..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Visitor
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                UID
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Building
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Check-In
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Check-Out
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    Laddar attendance...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    Inga poster hittades.
                                </td>
                            </tr>
                        ) : (
                            filtered
                                .sort(
                                    (a, b) =>
                                        new Date(b.timestamp).getTime() -
                                        new Date(a.timestamp).getTime()
                                )
                                .map((a) => (
                                    <tr
                                        key={a.attendanceId}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {a.visitorName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {a.uid}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {a.buildingId || "–"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {a.checkInTime
                                                ? new Date(
                                                      a.checkInTime
                                                  ).toLocaleString("sv-SE")
                                                : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {a.checkOutTime
                                                ? new Date(
                                                      a.checkOutTime
                                                  ).toLocaleString("sv-SE")
                                                : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {a.checkOutTime ? (
                                                <div className="flex items-center text-green-600 dark:text-green-400">
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Checked Out
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Active
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
