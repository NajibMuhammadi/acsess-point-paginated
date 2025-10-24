"use client";

import { useAdminData } from "../layout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Wifi,
    Search,
    Plus,
    Building2,
    Users,
    CheckCircle2,
    XCircle,
    Calendar,
    MoreVertical,
    Trash2,
    Link2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/utils/api";
import { AddStationModal } from "@/components/modals/AddStationModal";
import { MoveStationModal } from "@/components/modals/MoveStationModal";
import { DeleteStationModal } from "@/components/modals/DeleteStationModal";
import { Badge } from "@/components/ui/badge";

export default function StationsPage() {
    const { buildings, stationRefreshKey } = useAdminData();

    const [localStations, setLocalStations] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedStation, setSelectedStation] = useState<any>(null);
    const [stationToDelete, setStationToDelete] = useState<any>(null);

    const token =
        typeof window !== "undefined"
            ? localStorage.getItem("userToken")
            : null;

    // ============================================================
    // 💬 Hämtar stationer med pagination
    // ============================================================
    async function fetchPaginatedStations() {
        if (!token) return;
        const { ok, data } = await apiRequest(
            `/api/station/allpaginated?page=${page}&limit=${limit}&search=${searchQuery}`,
            "GET",
            null,
            token
        );
        if (ok && data.success) {
            setLocalStations(data.stations);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } else {
            console.error("❌ Failed to fetch stations:", data?.message);
        }
    }

    const approveStation = async (stationId: string, isApproved: boolean) => {
        if (!token) return;
        try {
            const { ok, data } = await apiRequest(
                `/api/station/${stationId}/approve`,
                "PUT",
                { isApproved: !isApproved },
                token
            );

            if (ok && data.success) {
                setLocalStations((prev) =>
                    prev.map((s) =>
                        s.stationId === stationId
                            ? { ...s, isApproved: !isApproved }
                            : s
                    )
                );
            }
        } catch (err) {
            console.error("❌ Error approving station:", err);
        }
    };

    useEffect(() => {
        fetchPaginatedStations();
    }, [page, searchQuery, limit, stationRefreshKey]);

    const handleAddSuccess = () => fetchPaginatedStations();
    const handleMoveSuccess = () => fetchPaginatedStations();
    const handleDeleteSuccess = () => fetchPaginatedStations();

    const handleNextPage = () => {
        if (page < totalPages) setPage((prev) => prev + 1);
    };
    const handlePrevPage = () => {
        if (page > 1) setPage((prev) => prev - 1);
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
                        Station Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage, monitor and organize all station units.
                    </p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg"
                >
                    <Plus className="w-4 h-4" />
                    Add Station
                </Button>
            </div>

            {/* Search & Limit */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search stations..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
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
                                Station Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Building
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Today's Check-ins
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Approved
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Created At
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {localStations.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    No stations found.
                                </td>
                            </tr>
                        ) : (
                            localStations.map((station) => (
                                <tr
                                    key={station.stationId}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                                >
                                    {/* Station name */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {station.stationName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {station.stationId}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Building */}
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-400" />
                                            {station.buildingName || "—"}
                                        </div>
                                    </td>

                                    {/* Online status */}
                                    <td className="px-6 py-4">
                                        {station.isOnline ? (
                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                Online
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                Offline
                                            </Badge>
                                        )}
                                    </td>

                                    {/* Today's check-ins */}
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            {station.todayCheckInCount || 0}
                                        </div>
                                    </td>

                                    {/* Approved */}
                                    <td className="px-6 py-4">
                                        {station.isApproved ? (
                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                Approved
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                Pending
                                            </Badge>
                                        )}
                                    </td>

                                    {/* Created */}
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {new Date(
                                                station.createdAt
                                            ).toLocaleString("sv-SE")}
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
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md"
                                            >
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        approveStation(
                                                            station.stationId,
                                                            station.isApproved
                                                        )
                                                    }
                                                    className={`cursor-pointer flex items-center ${
                                                        station.isApproved
                                                            ? "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                                            : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                    }`}
                                                >
                                                    {station.isApproved ? (
                                                        <>
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Unapprove
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                            Approve
                                                        </>
                                                    )}
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSelectedStation(
                                                            station
                                                        );
                                                        setIsMoveModalOpen(
                                                            true
                                                        );
                                                    }}
                                                    className={`cursor-pointer flex items-center transition-colors ${
                                                        station.buildingName
                                                            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    }`}
                                                >
                                                    {station.buildingName ? (
                                                        <>
                                                            <Link2 className="w-4 h-4 mr-2 rotate-45" />
                                                            Disconnect
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Link2 className="w-4 h-4 mr-2" />
                                                            Connect
                                                        </>
                                                    )}
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setStationToDelete(
                                                            station
                                                        );
                                                        setIsDeleteModalOpen(
                                                            true
                                                        );
                                                    }}
                                                    className="cursor-pointer flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
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
                    Page {page} of {totalPages} — {total} stations
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

            {/* Modals */}
            <AddStationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleAddSuccess}
            />

            <MoveStationModal
                isOpen={isMoveModalOpen}
                onClose={() => setIsMoveModalOpen(false)}
                station={selectedStation}
                buildings={buildings}
                onSuccess={handleMoveSuccess}
            />

            <DeleteStationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                station={stationToDelete}
                onSuccess={handleDeleteSuccess}
            />
        </div>
    );
}
