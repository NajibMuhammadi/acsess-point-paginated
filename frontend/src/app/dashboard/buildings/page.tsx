"use client";

import { useAdminData } from "../layout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Building2,
    Search,
    Plus,
    Users,
    Wifi,
    MoreVertical,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Calendar,
} from "lucide-react";
import { AddBuildingModal } from "@/components/modals/AddBuildingModal";
import { BuildingDetailsModal } from "@/components/modals/BuildingDetailsModal";
import { DeleteBuildingModal } from "@/components/modals/DeleteBuildingModal";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/utils/api";

export default function BuildingsPage() {
    const { buildings, stations, userData } = useAdminData();

    const [localBuildings, setLocalBuildings] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<any>(null);

    const token =
        typeof window !== "undefined"
            ? localStorage.getItem("userToken")
            : null;

    // ============================================================
    // 🧩 Fetch paginated buildings (initial + search + pagination)
    // ============================================================
    async function fetchPaginatedBuildings() {
        if (!token) return;
        const { ok, data } = await apiRequest(
            `/api/building/paginated?page=${page}&limit=${limit}&search=${searchQuery}`,
            "GET",
            null,
            token
        );
        if (ok && data.success) {
            setLocalBuildings(data.buildings);
            console.log("🏢 Paginated buildings data:", data.buildings);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        }
    }

    // 🔁 Ladda om vid sidbyte, sökning, ändrat antal rader eller attendance-ändring (NYTT)
    useEffect(() => {
        fetchPaginatedBuildings();
    }, [page, searchQuery, limit]);

    // 🔁 Ladda om om nya byggnader tillkommer
    useEffect(() => {
        fetchPaginatedBuildings();
    }, [buildings.length]);

    // 🔁 Synka global byggnadslista med lokal pagination
    useEffect(() => {
        if (!localBuildings.length || !buildings.length) return;
        setLocalBuildings((prev) =>
            prev.map((lb) => {
                const updated = buildings.find(
                    (b) => b.buildingId === lb.buildingId
                );
                return updated ? { ...lb, ...updated } : lb;
            })
        );
    }, [buildings]);

    // ============================================================
    // ✨ Handlers
    // ============================================================
    const handleBuildingAdded = () => fetchPaginatedBuildings();
    const handleDeleteSuccess = () => fetchPaginatedBuildings();

    const handleViewDetails = (building: any) => {
        setSelectedBuilding(building);
        setIsDetailsModalOpen(true);
    };

    const handleDeleteBuilding = (building: any) => {
        setSelectedBuilding(building);
        setIsDeleteModalOpen(true);
    };

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
                        Building Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Monitor and manage all building locations.
                    </p>
                </div>

                {userData?.role === "admin" && (
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg"
                    >
                        <Plus className="w-4 h-4" />
                        Add Building
                    </Button>
                )}
            </div>

            {/* Search + Limit */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search buildings..."
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
                                Building Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Capacity
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Status
                            </th>
                            {userData?.role === "admin" && (
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Stations
                                </th>
                            )}
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Created At
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {localBuildings.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    No buildings found.
                                </td>
                            </tr>
                        ) : (
                            localBuildings.map((building) => {
                                const buildingStations = stations.filter(
                                    (s) => s.buildingId === building.buildingId
                                ); // 👈 live beräkning

                                return (
                                    <tr
                                        key={building.buildingId}
                                        onClick={() =>
                                            handleViewDetails(building)
                                        }
                                        title="Click to view details"
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors cursor-pointer"
                                    >
                                        {/* Building */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {building.buildingName}
                                                    </p>
                                                    {userData?.role ===
                                                        "admin" && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {
                                                                building.buildingId
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Capacity */}
                                        {/*    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                {buildingOccupancy}
                                            </div>
                                        </td> */}

                                        {/* Capacity */}
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                {building.activeVisitorsCount}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            {buildingStations.length > 0 ? (
                                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </td>

                                        {/* Stations count */}
                                        {userData?.role === "admin" && (
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                <div className="flex items-center gap-2">
                                                    <Wifi className="w-4 h-4 text-gray-400" />
                                                    {buildingStations.length}{" "}
                                                    stations
                                                </div>
                                            </td>
                                        )}

                                        {/* Created */}
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(
                                                    building.createdAt
                                                ).toLocaleString("sv-SE")}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td
                                            className="px-6 py-4 text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
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
                                                    {userData?.role ===
                                                        "admin" && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDeleteBuilding(
                                                                    building
                                                                )
                                                            }
                                                            className="cursor-pointer flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
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
                    Page {page} of {totalPages} — {total} buildings
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
            <AddBuildingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleBuildingAdded}
            />
            {/* 
            {selectedBuilding && (
                <BuildingDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => {
                        setIsDetailsModalOpen(false);
                        setSelectedBuilding(null);
                    }}
                    building={selectedBuilding}
                    stations={stations}
                    attendance={attendance}
                    visitors={visitors}
                />
            )} */}

            <DeleteBuildingModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedBuilding(null);
                }}
                building={selectedBuilding}
                onSuccess={handleDeleteSuccess}
            />
        </div>
    );
}
