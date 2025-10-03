"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Building2,
    Wifi,
    FileText,
    Settings,
    ChevronLeft,
} from "lucide-react";
import { useAdminData } from "@/app/admin/layout";

const navItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { title: "Buildings", icon: Building2, path: "/admin/buildings" },
    {
        title: "Stations",
        icon: Wifi,
        path: "/admin/stations",
        userRole: "admin",
    },
    { title: "Attendance Logs", icon: FileText, path: "/logs" },
    { title: "Settings", icon: Settings, path: "/settings" },
];

export const DashboardSidebar = () => {
    const { userData } = useAdminData();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            {/* Sidebar */}
            <aside
                className={`
                    bg-white dark:bg-primary/10 border-r border-gray-200 dark:border-slate-700/50 flex flex-col
                    transition-all duration-300 ease-in-out shadow-sm
                    
                    /* Mobile: Bottom navigation bar */
                    fixed lg:sticky bottom-0 lg:top-0 left-0 right-0 z-40
                    h-20 lg:h-screen
                    
                    /* Desktop: Normal sidebar */
                    ${isCollapsed ? "lg:w-20" : "lg:w-64"}
                `}
            >
                {/* Header - Hidden on mobile */}
                <div className="hidden lg:block p-6 border-b border-gray-200 dark:border-slate-700/50">
                    <div
                        className={`flex items-center ${
                            isCollapsed ? "justify-center" : "gap-3"
                        }`}
                    >
                        <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <h2 className="font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
                                    AttendFlow
                                </h2>
                                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    Building Management
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto lg:block">
                    {/* Desktop: Vertical list */}
                    <ul className="hidden lg:block space-y-1">
                        {navItems
                            .filter(
                                (item) =>
                                    !item.userRole ||
                                    item.userRole === userData?.role
                            )
                            .map((item) => {
                                const isActive =
                                    item.path === "/admin"
                                        ? pathname === "/admin"
                                        : pathname.startsWith(item.path);

                                return (
                                    <li key={item.path}>
                                        <Link
                                            href={item.path}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                                isActive
                                                    ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold border-l-4 border-blue-600 dark:border-blue-400"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary/20 hover:text-gray-900 dark:hover:text-white"
                                            } ${
                                                isCollapsed
                                                    ? "justify-center"
                                                    : ""
                                            }`}
                                            title={
                                                isCollapsed
                                                    ? item.title
                                                    : undefined
                                            }
                                        >
                                            <item.icon className="w-5 h-5 flex-shrink-0" />
                                            {!isCollapsed && (
                                                <span className="whitespace-nowrap">
                                                    {item.title}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                    </ul>

                    {/* Mobile: Horizontal list */}
                    <ul className="lg:hidden flex items-center justify-around h-full px-2">
                        {navItems.map((item) => {
                            const isActive =
                                item.path === "/admin"
                                    ? pathname === "/admin"
                                    : pathname.startsWith(item.path);

                            return (
                                <li key={item.path}>
                                    <Link
                                        href={item.path}
                                        className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
                                            isActive
                                                ? "text-blue-700 dark:text-blue-300"
                                                : "text-gray-600 dark:text-gray-400"
                                        }`}
                                    >
                                        <item.icon
                                            className={`w-6 h-6 ${
                                                isActive
                                                    ? "text-blue-600 dark:text-blue-400"
                                                    : ""
                                            }`}
                                        />
                                        <span className="text-xs whitespace-nowrap">
                                            {item.title}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer - Desktop only */}
                <div className="hidden lg:block p-4 border-t border-gray-200 dark:border-slate-700/50">
                    {!isCollapsed && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 text-center mb-3">
                            © 2025 AttendFlow. All rights reserved.
                        </p>
                    )}
                    {/* Desktop Collapse Button */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary/20 transition-colors"
                        aria-label={
                            isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                        }
                    >
                        <ChevronLeft
                            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                                isCollapsed ? "rotate-180" : ""
                            }`}
                        />
                    </button>
                </div>
            </aside>
        </>
    );
};
