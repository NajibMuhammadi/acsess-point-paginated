"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAdminData } from "@/app/dashboard/layout";

export default function UserProfilePage() {
    const { userData } = useAdminData();

    if (!userData) {
        return (
            <div className="flex items-center justify-center h-[80vh] text-gray-400">
                <p>No user data found.</p>
            </div>
        );
    }

    console.log("Rendering UserProfilePage with userData:", userData);

    const handleResetPassword = () => {
        alert("Password reset link sent!");
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            User Profile
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            View and edit your user information.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleResetPassword}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                        >
                            Reset Password
                        </Button>
                    </div>
                </div>

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                        <div className="relative mb-4">
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
                                alt="Avatar"
                                className="w-24 h-24 rounded-full"
                            />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {userData.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                            {userData.role}
                        </p>
                    </div>

                    {/* Right Side */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Personal Information
                            </h3>

                            <form className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Field
                                    label="User ID"
                                    value={userData.userId}
                                />
                                <Field label="Name" value={userData.name} />
                                <Field label="Email" value={userData.email} />
                                <Field label="Role" value={userData.role} />
                                <Field
                                    label="Account Status"
                                    value={
                                        userData.isApproved
                                            ? "Approved ✅"
                                            : "Pending ⏳"
                                    }
                                />
                                <Field
                                    label="Created At"
                                    value={
                                        userData.createdAt
                                            ? new Date(
                                                  userData.createdAt
                                              ).toLocaleString("sv-SE")
                                            : "-"
                                    }
                                />
                                <Field
                                    label="Last Login"
                                    value={
                                        userData.lastLogin
                                            ? new Date(
                                                  userData.lastLogin
                                              ).toLocaleString("sv-SE")
                                            : "-"
                                    }
                                />
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 🔹 Liten hjälpfunktion för att hålla koden ren
function Field({ label, value }: { label: string; value?: string }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <input
                type="text"
                value={value || "-"}
                disabled
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-2 opacity-70"
            />
        </div>
    );
}
