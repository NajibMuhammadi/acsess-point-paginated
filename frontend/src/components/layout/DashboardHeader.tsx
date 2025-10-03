"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

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
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-50 bg-white dark:bg-primary/10 border-b border-gray-200 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between h-16 px-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        Admin Dashboard – Attendance Overview
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <button
                            onClick={() =>
                                setTheme(theme === "dark" ? "light" : "dark")
                            }
                            className="p-2 rounded-lg border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-primary/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5" />
                            ) : (
                                <Moon className="h-5 w-5" />
                            )}
                        </button>
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
