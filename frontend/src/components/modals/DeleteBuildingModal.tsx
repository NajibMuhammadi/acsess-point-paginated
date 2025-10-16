"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Building2, Check } from "lucide-react";

interface DeleteBuildingModalProps {
    isOpen: boolean;
    onClose: () => void;
    building: any;
    onSuccess: () => void;
}

export function DeleteBuildingModal({
    isOpen,
    onClose,
    building,
    onSuccess,
}: DeleteBuildingModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsSuccess(false);
            setIsDeleting(false);
            setError("");
        }
    }, [isOpen, building]);

    const handleDelete = async () => {
        if (!building) return;

        setIsDeleting(true);
        setIsSuccess(false);
        setError("");

        try {
            const token = localStorage.getItem("userToken");
            if (!token) {
                setError("Admin-token saknas. Logga in igen.");
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/building/${building.buildingId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                onSuccess();
                onClose();
                setIsSuccess(true);
            } else {
                setError(data.message || "Fel vid borttagning av byggnad");
            }
        } catch (error) {
            console.error("Error deleting building:", error);
            setError("Nätverksfel vid borttagning av byggnad");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!building) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 gap-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
                {isSuccess ? (
                    // Success State
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Deleting {building.buildingName} skapad
                            framgångsrikt!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {building.buildingName} har tagits bort.
                        </p>
                        <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                            <Check className="w-4 h-4 mr-2" />
                            Building Deleted
                        </div>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="p-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-red-600 dark:bg-red-500 rounded-xl flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                            Remove Building
                                        </DialogTitle>
                                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                                            This action cannot be undone
                                        </DialogDescription>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {building.buildingName}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                ID: {building.buildingId}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                                        Are you sure you want to permanently
                                        remove this building? This action cannot
                                        be undone and will delete all associated
                                        data.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-4 rounded-lg border text-sm flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={isDeleting}
                                    className="flex-1 h-12 rounded-lg border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Avbryt
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg font-medium"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                            Tar bort...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Ta bort byggnad
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
