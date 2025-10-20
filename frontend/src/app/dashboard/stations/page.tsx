"use client";

import { useAdminData } from "../layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Building2,
    Search,
    Plus,
    Wifi,
    CheckCircle2,
    XCircle,
    Calendar,
    Users,
    MoreVertical,
    Link2,
    Trash2,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddStationModal } from "@/components/modals/AddStationModal";
import { MoveStationModal } from "@/components/modals/MoveStationModal";
import { DeleteStationModal } from "@/components/modals/DeleteStationModal";

export default function StationsPage() {
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [selectedStation, setSelectedStation] = useState(null);
    const { buildings, stations, attendance, userData } = useAdminData();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [stationToDelete, setStationToDelete] = useState(null);

    if (userData?.role !== "admin") {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Access Denied
                    </h1>
                    <p className="text-muted-foreground">
                        You do not have permission to view this page.
                    </p>
                </div>
            </div>
        );
    }

    const handleBuildingAdded = (newBuilding: any) => {
        console.log("Ny station tillagd:", newBuilding);
    };

    const handleMoveStation = (station: any) => {
        setSelectedStation(station);
        setIsMoveModalOpen(true);
    };

    const handleMoveSuccess = () => {
        console.log("Station moved successfully");
    };

    const handleApprovalChange = async (
        stationId: string,
        newApprovalStatus: string
    ) => {
        const isApproved = newApprovalStatus === "approved";
        const token = localStorage.getItem("userToken");

        if (!token) {
            alert("Admin-token saknas. Logga in igen.");
            return;
        }

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/station/${stationId}/approval`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ isApproved }),
                }
            );

            const data = await response.json();
            if (response.ok) {
                console.log("Approval status updated:", data.message);
            } else {
                alert(
                    data.message || "Fel vid uppdatering av godkännandestatus"
                );
            }
        } catch (error) {
            alert("Nätverksfel vid uppdatering av status");
            console.error("Error:", error);
        }
    };

    const filteredStations = stations.filter((station) => {
        const matchesSearch = station.stationName
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "online" && station.isApproved) ||
            (statusFilter === "offline" && !station.isApproved);
        return matchesSearch && matchesStatus;
    });

    const getBuildingName = (buildingId: string) => {
        const b = buildings.find((b) => b.buildingId === buildingId);
        return b ? b.buildingName : "—";
    };

    const normalDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("sv-SE", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const getTodayCheckInsByStation = (stationId: string) => {
        const today = new Date().toISOString().split("T")[0];
        return attendance.filter((a) => {
            if (!a.checkInTime) return false;
            const checkInDate = new Date(a.checkInTime)
                .toISOString()
                .split("T")[0];
            return a.stationId === stationId && checkInDate === today;
        }).length;
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Station Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Monitor and manage all station locations
                    </p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Station
                </Button>
            </div>

            {/* Filter Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Search stations by name or building..."
                            className="pl-10 h-11  dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                    >
                        <SelectTrigger className="h-11 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg">
                            <SelectItem value="all">All Stations</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Station Name
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Building
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Building Status
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Today's Check-Ins
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Created At
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Last activity
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Station Approval
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredStations.map((station) => (
                                <tr
                                    key={station.stationId}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                                <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                    {station.stationName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {station.stationId}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {getBuildingName(
                                                    station.buildingId
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        {station.buildingId ? (
                                            <Badge className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 inline-flex items-center gap-1.5 px-2.5 py-1 font-medium border-0">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Connected
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 inline-flex items-center gap-1.5 px-2.5 py-1 font-medium border-0">
                                                <XCircle className="w-3.5 h-3.5" />
                                                Not Connected
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {getTodayCheckInsByStation(
                                                    station.stationId
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {normalDate(station.createdAt)}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    station.isOnline
                                                        ? "bg-green-500"
                                                        : "bg-red-500"
                                                }`}
                                            />
                                            <div className="text-sm">
                                                {station.isOnline
                                                    ? "Online"
                                                    : "Offline"}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {station.lastPing
                                                    ? new Date(
                                                          station.lastPing
                                                      ).toLocaleTimeString()
                                                    : ""}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <Select
                                            value={
                                                station.isApproved
                                                    ? "approved"
                                                    : "not-approved"
                                            }
                                            onValueChange={(value) =>
                                                handleApprovalChange(
                                                    station.stationId,
                                                    value
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-40 h-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium">
                                                <SelectValue placeholder="Välj status" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg">
                                                <SelectItem value="approved">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                        <span>Activ</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="not-approved">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                        <span>Inactiv</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="end"
                                                className="w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md"
                                            >
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleMoveStation(
                                                            station
                                                        )
                                                    }
                                                    className={`cursor-pointer flex items-center ${
                                                        station.buildingId
                                                            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    }`}
                                                >
                                                    <Link2 className="w-4 h-4 mr-2" />
                                                    {station.buildingId
                                                        ? "Disconnect"
                                                        : "Connect to building"}
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <AddStationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleBuildingAdded}
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
                onSuccess={(deletedId) => {
                    console.log("Deleted:", deletedId);
                }}
            />
        </div>
    );
}
