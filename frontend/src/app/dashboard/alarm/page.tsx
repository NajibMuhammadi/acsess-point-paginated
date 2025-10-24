"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/app/dashboard/layout";
import { apiRequest } from "@/utils/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search,
    FlameKindling,
    MessageCircleWarning,
    FlaskConical,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Eye,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function getUserToken() {
    return localStorage.getItem("userToken");
}

export default function AlarmCenterPage() {
    const { socket } = useAdminData();
    const router = useRouter();
    const [alarms, setAlarms] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const token = typeof window !== "undefined" ? getUserToken() : null;

    // ============================================================
    // 🔹 Hämta alarm med pagination
    // ============================================================
    const fetchAlarms = async () => {
        if (!token) return;
        setLoading(true);

        const { ok, data } = await apiRequest(
            `/api/alarm/paginated?page=${page}&limit=${limit}&search=${encodeURIComponent(
                search
            )}`,
            "GET",
            null,
            token
        );

        if (ok && data.success) {
            setAlarms(data.alarms || []);
            setTotalPages(data.totalPages || 1);
            setTotal(data.total || 0);
        } else {
            console.error("❌ Failed to fetch alarms:", data?.message);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchAlarms();
    }, [page, limit, search]);

    // ============================================================
    // ⚡ Realtidsuppdateringar
    // ============================================================
    useEffect(() => {
        if (!socket) return;

        const handleAlarmTriggered = (newAlarm: any) => {
            setAlarms((prev) => [newAlarm, ...prev]);
        };

        const handleAlarmAcknowledged = (updated: any) => {
            setAlarms((prev) =>
                prev.map((a) =>
                    a.alarmId === updated.alarmId
                        ? {
                              ...a,
                              acknowledged: true,
                              acknowledgedAt: updated.acknowledgedAt,
                              acknowledgedBy: updated.acknowledgedBy,
                          }
                        : a
                )
            );
        };

        socket.on("alarmTriggered", handleAlarmTriggered);
        socket.on("alarmAcknowledged", handleAlarmAcknowledged);

        return () => {
            socket.off("alarmTriggered", handleAlarmTriggered);
            socket.off("alarmAcknowledged", handleAlarmAcknowledged);
        };
    }, [socket]);

    // ============================================================
    // 🔥 Hjälpfunktion för ikon
    // ============================================================
    const getAlarmIcon = (type: number) => {
        switch (type) {
            case 1:
                return (
                    <MessageCircleWarning className="w-5 h-5 text-amber-500" />
                );
            case 2:
                return <FlameKindling className="w-5 h-5 text-red-500" />;
            case 3:
                return <FlaskConical className="w-5 h-5 text-green-500" />;
            default:
                return <AlertTriangle className="w-5 h-5 text-gray-500" />;
        }
    };

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
                        Alarm Center
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Monitor and manage all alarms in real-time.
                    </p>
                </div>
            </div>

            {/* Search & Limit */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search by building or message..."
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
                                Type
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Building
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Message
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Created At
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                People
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
                                    colSpan={6}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    Loading alarms...
                                </td>
                            </tr>
                        ) : alarms.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    No alarms found.
                                </td>
                            </tr>
                        ) : (
                            alarms.map((alarm) => (
                                <tr
                                    key={alarm.alarmId}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            {getAlarmIcon(alarm.alarmType)}
                                            <span>
                                                {alarm.alarmType === 1
                                                    ? "General"
                                                    : alarm.alarmType === 2
                                                    ? "Fire"
                                                    : alarm.alarmType === 3
                                                    ? "Gas"
                                                    : "Unknown"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                        {alarm.buildingName || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                                        {alarm.message || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {new Date(
                                            alarm.createdAt
                                        ).toLocaleString("sv-SE")}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {alarm.totalPeople ?? 0}
                                    </td>

                                    {/* 🔹 3-pricksmenyn */}
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
                                                        router.push(
                                                            `/dashboard/alarm/${alarm.alarmId}`
                                                        )
                                                    }
                                                    className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/20 flex items-center"
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page} of {totalPages} — {total} alarms
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={handlePrevPage}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={handleNextPage}
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
