"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Building2,
    Plus,
    MapPin,
    X,
    Check,
    AlertCircle,
    Loader2,
} from "lucide-react";

interface AddBuildingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (building: any) => void;
}

export const AddBuildingModal = ({
    isOpen,
    onClose,
    onSuccess,
}: AddBuildingModalProps) => {
    const [buildingName, setBuildingName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const resetForm = () => {
        setBuildingName("");
        setMessage("");
        setIsSuccess(false);
        setShowSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!buildingName.trim()) {
            setMessage("Byggnadsnamn krävs");
            setIsSuccess(false);
            return;
        }

        const token = localStorage.getItem("userToken");
        if (!token) {
            setMessage("Admin-token saknas. Logga in igen.");
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/building/create-building`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ buildingName }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                setIsSuccess(true);
                setShowSuccess(true);
                setMessage(
                    `Byggnad "${data.building.buildingName}" skapad framgångsrikt!`
                );

                // Call success callback if provided
                if (onSuccess) {
                    onSuccess(data.building);
                }

                // Auto-close after 2 seconds
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else {
                setMessage(data.message || "Fel vid skapande av byggnad");
                setIsSuccess(false);
            }
        } catch (error) {
            setMessage("Nätverksfel vid skapande av byggnad");
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

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
                            Byggnad skapad framgångsrikt!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {buildingName} har lagts till i systemet
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
                                        <Building2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                            Lägg till ny byggnad
                                        </DialogTitle>
                                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                                            Skapa en ny byggnadsplats i ditt
                                            system
                                        </DialogDescription>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-5">
                                {/* Building Name - Required */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Byggnadsnamn *
                                    </label>
                                    <Input
                                        value={buildingName}
                                        onChange={(e) =>
                                            setBuildingName(e.target.value)
                                        }
                                        placeholder="Ange byggnadsnamn"
                                        className="h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-gray-900 dark:text-white"
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Error/Success Message */}
                                {message && (
                                    <div
                                        className={`p-4 rounded-lg border text-sm flex items-center space-x-2 ${
                                            isSuccess
                                                ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
                                                : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                                        }`}
                                    >
                                        {isSuccess ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4" />
                                        )}
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
                                    type="submit"
                                    disabled={isLoading || !buildingName.trim()}
                                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Skapar...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Skapa byggnad
                                        </>
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
