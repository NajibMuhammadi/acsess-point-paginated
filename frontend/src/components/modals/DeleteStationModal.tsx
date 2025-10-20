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
import { AlertTriangle, Loader2, Trash2, Check } from "lucide-react";

interface DeleteStationModalProps {
    isOpen: boolean;
    onClose: () => void;
    station: {
        stationId: string;
        stationName: string;
        buildingId?: string;
    } | null;
    onSuccess?: (deletedId: string) => void;
}

export const DeleteStationModal = ({
    isOpen,
    onClose,
    station,
    onSuccess,
}: DeleteStationModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMessage("");
            setIsSuccess(false);
        }
    }, [isOpen]);

    const handleDelete = async () => {
        if (!station) return;
        const token = localStorage.getItem("userToken");
        if (!token) {
            setMessage("Admin-token saknas. Logga in igen.");
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/station/${station.stationId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await res.json();

            if (data.success) {
                setIsSuccess(true);
                setMessage("Stationen har raderats framgångsrikt ✅");
                if (onSuccess) onSuccess(station.stationId);
                setTimeout(() => onClose(), 1500);
            } else {
                setMessage(data.message || "Kunde inte radera stationen");
            }
        } catch (err) {
            console.error(err);
            setMessage("Nätverksfel – försök igen senare");
        } finally {
            setIsLoading(false);
        }
    };

    if (!station) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-0">
                {isSuccess ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Station raderad!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {message}
                        </p>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="p-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                                        Radera station
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                                        Bekräfta att du vill ta bort denna
                                        station permanent.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>Namn:</strong> {station.stationName}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>ID:</strong> {station.stationId}
                                </p>
                                {station.buildingId ? (
                                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                                        ⚠️ Denna station är kopplad till en
                                        byggnad och kopplingen tas bort vid
                                        radering.
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500">
                                        Ingen byggnadskoppling hittad.
                                    </p>
                                )}
                            </div>

                            {message && (
                                <div className="text-sm text-red-600 dark:text-red-400">
                                    {message}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isLoading}
                                onClick={onClose}
                                className="flex-1 rounded-lg"
                            >
                                Avbryt
                            </Button>
                            <Button
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Raderar...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Radera
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
