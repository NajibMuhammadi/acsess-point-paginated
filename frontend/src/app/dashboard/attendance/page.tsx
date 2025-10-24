"use client";

import { useEffect, useState } from "react";
import { useAdminData } from "../layout";
import { apiRequest } from "@/utils/api";
import {
    Search,
    MoreVertical,
    User,
    Clock,
    IdCard,
    Building2,
    Wifi,
    LogOut,
    LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function AttendancePage() {
    const { socket } = useAdminData();

    const [attendance, setAttendance] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const token =
        typeof window !== "undefined"
            ? localStorage.getItem("userToken")
            : null;

    // ============================================================
    // 🔹 Hämta attendance (API + pagination)
    // ============================================================
    const fetchAttendance = async () => {
        if (!token) return;
        setLoading(true);

        const { ok, data } = await apiRequest(
            `/api/attendance/all?page=${page}&limit=${limit}&search=${encodeURIComponent(
                search
            )}`,
            "GET",
            null,
            token
        );

        if (ok && data.success) {
            setAttendance(data.attendance || []);
            setTotalPages(data.totalPages || 1);
            setTotal(data.total || 0);
        } else {
            console.error("❌ Failed to fetch attendance:", data?.message);
        }

        setLoading(false);
    };

    // 🟢 Kör vid ändring av page, limit, search
    useEffect(() => {
        fetchAttendance();
    }, [page, limit, search]);

    // ============================================================
    // 🧩 Realtidsuppdateringar via Socket.io
    // ============================================================
    useEffect(() => {
        if (!socket) return;

        const handleAttendanceUpdate = (newAttendance: any) => {
            console.log(
                "🔄 Real-time attendance update received:",
                newAttendance
            );

            setAttendance((prev) => {
                const existingIndex = prev.findIndex(
                    (a) => a.attendanceId === newAttendance.attendanceId
                );

                if (existingIndex !== -1) {
                    // 🟢 Uppdatera befintlig post (check-out)
                    const updated = [...prev];
                    updated[existingIndex] = newAttendance;
                    console.log(
                        "✅ Updated existing attendance record (CHECK-OUT):",
                        {
                            attendanceId: newAttendance.attendanceId,
                            visitorName: newAttendance.visitorName,
                            checkOutTime: newAttendance.checkOutTime,
                        }
                    );
                    return updated;
                } else {
                    // 🟢 Lägg till ny post (check-in)
                    console.log("✅ Added new attendance record (CHECK-IN):", {
                        attendanceId: newAttendance.attendanceId,
                        visitorName: newAttendance.visitorName,
                        checkInTime: newAttendance.checkInTime,
                    });
                    return [newAttendance, ...prev];
                }
            });
        };

        socket.on("attendanceUpdated", handleAttendanceUpdate);

        return () => {
            socket.off("attendanceUpdated", handleAttendanceUpdate);
        };
    }, [socket]);

    // ============================================================
    // Pagination
    // ============================================================
    const handleNextPage = () => {
        if (page < totalPages) setPage(page + 1);
    };
    const handlePrevPage = () => {
        if (page > 1) setPage(page - 1);
    };

    // ============================================================
    // 💻 UI
    // ============================================================
    return (
        <div className="px-6 py-8 md:px-12 lg:px-20 xl:px-32 space-y-8">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Attendance
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        View all check-ins and check-outs for visitors in
                        real-time.
                    </p>
                </div>
            </div>

            {/* Search & Limit */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search by name, UID, or station..."
                        value={search}
                        onChange={(e) => {
                            setPage(1);
                            setSearch(e.target.value);
                        }}
                        className="pl-10 h-11 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                        Rows per page:
                    </label>
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                        }}
                        className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                    >
                        {[25, 50, 100, 1000].map((val) => (
                            <option key={val} value={val}>
                                {val}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Visitor
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                UID
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Station
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
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    Loading attendance...
                                </td>
                            </tr>
                        ) : attendance.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    No attendance records found.
                                </td>
                            </tr>
                        ) : (
                            attendance.map((a) => {
                                const isCheckedIn = !a.checkOutTime;
                                return (
                                    <tr
                                        key={a.attendanceId}
                                        className={`hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all duration-300 ${
                                            isCheckedIn
                                                ? "bg-green-50 dark:bg-green-900/10"
                                                : ""
                                        }`}
                                    >
                                        {/* Status kolumn */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {isCheckedIn ? (
                                                    <>
                                                        <LogIn className="w-4 h-4 text-green-500" />
                                                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                                            Checked In
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <LogOut className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                            Checked Out
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            <div className="flex items-center gap-1">
                                                <User className="w-4 h-4 text-gray-400" />
                                                {a.visitorName}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <IdCard className="w-4 h-4 text-gray-400" />
                                                {a.uid}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Wifi className="w-4 h-4 text-gray-400" />
                                                {a.stationId || "—"}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                {a.buildingId || "—"}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4 text-green-500" />
                                                {a.checkInTime
                                                    ? new Date(
                                                          a.checkInTime
                                                      ).toLocaleString("sv-SE")
                                                    : "—"}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <LogOut
                                                    className={`w-4 h-4 ${
                                                        a.checkOutTime
                                                            ? "text-red-500"
                                                            : "text-gray-300"
                                                    }`}
                                                />
                                                {a.checkOutTime ? (
                                                    <span className="text-gray-900 dark:text-white font-medium">
                                                        {new Date(
                                                            a.checkOutTime
                                                        ).toLocaleString(
                                                            "sv-SE"
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">
                                                        Still inside
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md"
                                                >
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            alert(
                                                                `Attendance ID: ${a.attendanceId}`
                                                            )
                                                        }
                                                        className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/20"
                                                    >
                                                        View Details
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page} of {totalPages} — {total} records
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={handlePrevPage}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={handleNextPage}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
