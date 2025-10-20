"use client";

import { useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import io from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/utils/api";
import { useAdminData } from "@/app/dashboard/layout";

interface UserData {
    name: string;
    role: string;
}

export const DashboardHeader = ({
    userData,
    handleLogout,
}: {
    userData?: UserData;
    handleLogout?: () => void;
}) => {
    const { alarms } = useAdminData();
    const { theme, setTheme } = useTheme();
    const [unread, setUnread] = useState<any[]>([]);

    // Hämtar olästa larm från backend
    const fetchUnread = async () => {
        const token = localStorage.getItem("userToken");
        if (!token) return;

        try {
            const { ok, data } = await apiRequest(
                "/api/alarm/all",
                "GET",
                undefined,
                token
            );
            if (ok && data.success) {
                const unseen = data.alarms.filter((a: any) => !a.acknowledged);
                console.log("Olästa larm hämtade:", unseen);
                setUnread(unseen.reverse());
            }
        } catch (error) {
            console.error("Fel vid hämtning av larm:", error);
        }
    };

    useEffect(() => {
        fetchUnread();
        if (alarms?.length > 0) {
            const unseen = alarms.filter((a) => !a.acknowledged);
            setUnread(unseen);
        }
    }, [alarms]);

    const acknowledge = async (alarmId: string) => {
        const token = localStorage.getItem("userToken");
        if (!token) return console.error("Ingen token hittades");

        const { ok, data } = await apiRequest(
            "/api/alarm/acknowledge",
            "PUT",
            { alarmId },
            token
        );

        if (ok && data.success) {
            setUnread((prev) => prev.filter((a) => a.alarmId !== alarmId));
            console.log("✅ Larm markerat som läst:", alarmId);
        } else {
            console.error("❌ Kunde inte markera som läst:", data?.message);
        }
    };

    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    return (
        <header className="sticky top-0 z-50 bg-white dark:bg-primary/10 border-b border-gray-200 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between h-16 px-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        Dashboard
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* 🔔 Notifikationer */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="relative p-2 rounded-lg border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-primary/10 hover:opacity-80 transition outline-none">
                            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            {unread.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                                    {unread.length}
                                </span>
                            )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-80 bg-white dark:bg-primary/10 border border-gray-200 dark:border-slate-700/50 shadow-lg rounded-xl max-h-96 overflow-y-auto"
                        >
                            <DropdownMenuLabel className="text-gray-900 dark:text-white">
                                Notiser ({unread.length})
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700/50" />
                            {unread.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                    Inga nya larm.
                                </div>
                            ) : (
                                unread.map((alarm) => (
                                    <DropdownMenuItem
                                        key={alarm.alarmId}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            acknowledge(alarm.alarmId);
                                        }}
                                        className="flex flex-col items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-primary/20 p-3"
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                {alarm.buildingName}
                                            </p>
                                            <Badge
                                                className={
                                                    alarm.alarmType === 2
                                                        ? "bg-red-600 text-white"
                                                        : alarm.alarmType === 3
                                                        ? "bg-green-600 text-white"
                                                        : "bg-yellow-500 text-white"
                                                }
                                            >
                                                {alarm.alarmType === 2
                                                    ? "Brand"
                                                    : alarm.alarmType === 3
                                                    ? "Gas"
                                                    : "Allmänt"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {alarm.message}
                                        </p>
                                        <div className="flex items-center justify-between w-full mt-1">
                                            <span className="text-[11px] text-gray-400">
                                                {new Date(
                                                    alarm.createdAt
                                                ).toLocaleString("sv-SE")}
                                            </span>
                                            <span className="text-[11px] text-blue-500">
                                                Klicka för att markera som läst
                                            </span>
                                        </div>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* 🌗 Dark/Light knapp */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-primary/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        {theme === "dark" ? (
                            <Sun className="h-5 w-5" />
                        ) : (
                            <Moon className="h-5 w-5" />
                        )}
                    </button>

                    {/* 👤 Profilmeny */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-3 hover:opacity-80 transition-all outline-none">
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {userData?.name || "User"}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {userData?.role || "Administrator"}
                                </p>
                            </div>
                            <Avatar className="w-10 h-10 border-2 border-gray-200 dark:border-slate-700/50">
                                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" />
                                <AvatarFallback className="bg-gray-100 text-gray-600 dark:bg-primary/20 dark:text-gray-300">
                                    SJ
                                </AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-56 bg-white dark:bg-primary/10 border border-gray-200 dark:border-slate-700/50 shadow-lg rounded-xl"
                        >
                            <DropdownMenuLabel className="text-gray-900 dark:text-white">
                                My Account
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700/50" />
                            <DropdownMenuItem className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-primary/20 hover:text-gray-900 dark:hover:text-white">
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-primary/20 hover:text-gray-900 dark:hover:text-white">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700/50" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
};
