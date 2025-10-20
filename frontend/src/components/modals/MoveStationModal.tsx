"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Building2,
    Wifi,
    X,
    Check,
    AlertCircle,
    Loader2,
    Link2,
} from "lucide-react";

interface Station {
    stationId: string;
    stationName: string;
    buildingId?: string;
}

interface Building {
    buildingId: string;
    buildingName: string;
}

interface MoveStationModalProps {
    isOpen: boolean;
    onClose: () => void;
    station: Station | null;
    buildings: Building[];
    onSuccess?: () => void;
}

export const MoveStationModal = ({
    isOpen,
    onClose,
    station,
    buildings,
    onSuccess,
}: MoveStationModalProps) => {
    const [selectedBuildingId, setSelectedBuildingId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalAction, setModalAction] = useState<"assign" | "unassign">(
        "assign"
    );
    const [showModal, setShowModal] = useState(false);

    // När modalen öppnas, initiera staten baserat på stationen
    useEffect(() => {
        if (isOpen && station) {
            // Kontrollera om stationen redan finns kopplad till en byggnad
            const isCurrentlyConnected = !!station.buildingId;
            // Bestäm modal action baserat på om stationen är kopplad
            //            const isCurrentlyConnected = !!station.buildingId;
            setModalAction(isCurrentlyConnected ? "unassign" : "assign");
            setSelectedBuildingId(station.buildingId || "");
            setMessage("");
            setIsSuccess(false);
            setShowSuccess(false);
            setShowModal(true);
        } else {
            setShowModal(false);
        }
    }, [isOpen, station]);

    const resetForm = () => {
        setSelectedBuildingId("");
        setMessage("");
        setIsSuccess(false);
        setShowSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Hjälpfunktion för att få byggnadsnamn från ID och returnera "Okänd byggnad" om ID inte hittas
    const getBuildingName = (buildingId?: string) => {
        if (!buildingId) return null;
        const building = buildings.find((b) => b.buildingId === buildingId);
        return building?.buildingName || "Okänd byggnad";
    };

    const moveStation = async () => {
        if (!station) return;

        const token = localStorage.getItem("userToken");
        if (!token) {
            setMessage("Admin-token saknas. Logga in igen.");
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            const buildingId =
                modalAction === "assign" ? selectedBuildingId : null;

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/station/${station.stationId}/move`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ buildingId }),
                }
            );

            const data = await response.json();

            if (data.success) {
                setShowModal(false);
                setShowSuccess(true);
                setSelectedBuildingId("");

                // Call success callback if provided
                if (onSuccess) {
                    onSuccess();
                }

                setMessage("✅ " + data.message);

                // Auto-close after 2 seconds
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else {
                setMessage(
                    "❌ " + (data.message || "Kunde inte uppdatera stationen")
                );
                setIsSuccess(false);
            }
        } catch (error) {
            console.error(error);
            setMessage("❌ Nätverksfel");
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        moveStation();
    };

    if (!station) return null;

    const currentBuilding = station.buildingId
        ? getBuildingName(station.buildingId)
        : "Ej kopplad";
    const isCurrentlyConnected = !!station.buildingId;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md p-0 gap-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
                {showSuccess ? (
                    // Success State
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Station uppdaterad!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {message}
                        </p>
                        <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                            <Check className="w-4 h-4 mr-2" />
                            Framgång
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <DialogHeader className="p-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
                                        <Link2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                            {modalAction === "assign"
                                                ? "Koppla Station till Byggnad"
                                                : "Koppla Bort Station"}
                                        </DialogTitle>
                                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                                            {modalAction === "assign"
                                                ? "Välj en byggnad att koppla stationen till"
                                                : "Bekräfta att du vill koppla bort stationen"}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-5">
                                {/* Current Station Info */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                            <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                                {station.stationName}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {currentBuilding}
                                            </p>
                                        </div>
                                        <div
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                isCurrentlyConnected
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                                    : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                                            }`}
                                        >
                                            {isCurrentlyConnected
                                                ? "Kopplad"
                                                : "Ej kopplad"}
                                        </div>
                                    </div>
                                </div>

                                {modalAction === "assign" && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Välj byggnad
                                        </label>
                                        <Select
                                            value={selectedBuildingId}
                                            onValueChange={
                                                setSelectedBuildingId
                                            }
                                        >
                                            <SelectTrigger className="h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                                                <SelectValue placeholder="Välj en byggnad..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                                                {buildings.map((building) => (
                                                    <SelectItem
                                                        key={
                                                            building.buildingId
                                                        }
                                                        value={
                                                            building.buildingId
                                                        }
                                                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                                            <span>
                                                                {
                                                                    building.buildingName
                                                                }
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {modalAction === "unassign" && (
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                                        <p className="text-orange-800 dark:text-orange-300">
                                            Är du säker på att du vill koppla
                                            bort denna station från{" "}
                                            {getBuildingName(
                                                station.buildingId
                                            )}
                                            ?
                                        </p>
                                    </div>
                                )}

                                {/* Error Message */}
                                {message && !isSuccess && (
                                    <div className="p-4 rounded-lg border text-sm flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{message}</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <DialogFooter className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                    className="flex-1 h-12 rounded-lg border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Avbryt
                                </Button>
                                <Button
                                    onClick={moveStation}
                                    disabled={
                                        isLoading ||
                                        (modalAction === "assign" &&
                                            !selectedBuildingId)
                                    }
                                    className={`flex-1 h-12 rounded-lg font-medium ${
                                        modalAction === "assign"
                                            ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                                            : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white"
                                    }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Uppdaterar...
                                        </>
                                    ) : modalAction === "assign" ? (
                                        "Koppla till"
                                    ) : (
                                        "Koppla bort"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
