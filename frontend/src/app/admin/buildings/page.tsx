"use client";

import { useAdminData } from "../layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Plus, MapPin, Users, Wifi } from "lucide-react";
import { AddBuildingModal } from "@/components/modals/AddBuildingModal";
import { BuildingDetailsModal } from "@/components/modals/BuildingDetailsModal";
import { DeleteBuildingModal } from "@/components/modals/DeleteBuildingModal";

export default function BuildingsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
    const { buildings, stations, attendance, userData, visitors } =
        useAdminData();

    const handleBuildingAdded = (newBuilding: any) => {
        console.log("Ny byggnad tillagd:", newBuilding);
        // Här kan du lägga till logik för att uppdatera buildings data
        // eller trigga en refresh av data
    };

    const handleViewDetails = (building: any) => {
        setSelectedBuilding(building);
        setIsDetailsModalOpen(true);
    };

    const handleDeleteBuilding = (building: any) => {
        setSelectedBuilding(building);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteSuccess = () => {
        console.log("Building deleted successfully");
        // Refresh data or update state
    };

    const filteredBuildings = buildings.filter((building) =>
        building.buildingName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Building Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Monitor and manage all building locations
                    </p>
                </div>
                {userData?.role === "admin" && (
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Building
                    </Button>
                )}
            </div>

            {/* Filter Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search buildings..."
                        className="pl-10 h-11 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Building Name
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Address
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Capacity
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                {userData?.role === "admin" && (
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Stations
                                    </th>
                                )}
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredBuildings.map((building) => {
                                const buildingStations = stations.filter(
                                    (s) => s.buildingId === building.buildingId
                                );

                                const buildingAttendance = attendance.filter(
                                    (a) =>
                                        a.buildingId === building.buildingId &&
                                        !a.checkOutTime
                                );

                                const buildingOccupancy =
                                    buildingAttendance.length;
                                const capacity = 100;

                                return (
                                    <tr
                                        key={building.buildingId}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                        {building.buildingName}
                                                    </p>
                                                    {userData?.role ===
                                                        "admin" && (
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                            {
                                                                building.buildingId
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {building.address}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {buildingOccupancy}/
                                                    {capacity}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {buildingStations.length > 0 ? (
                                                <Badge className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 inline-flex items-center gap-1.5 px-2.5 py-1 font-medium border-0">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 inline-flex items-center gap-1.5 px-2.5 py-1 font-medium border-0">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </td>
                                        {userData?.role === "admin" && (
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Wifi className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        {
                                                            buildingStations.length
                                                        }{" "}
                                                        stations
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleViewDetails(
                                                            building
                                                        )
                                                    }
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20 dark:text-blue-400 rounded-lg"
                                                >
                                                    View Details
                                                </Button>
                                                {userData?.role === "admin" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleDeleteBuilding(
                                                                building
                                                            )
                                                        }
                                                        className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 dark:text-red-400 rounded-lg"
                                                    >
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <AddBuildingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleBuildingAdded}
            />

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
            )}

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
