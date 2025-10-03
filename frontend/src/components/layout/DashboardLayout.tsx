import { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";

interface DashboardLayoutProps {
    children: ReactNode;
    userData?: any;
    handleLogout?: () => void;
}

export const DashboardLayout = ({
    children,
    userData,
    handleLogout,
}: DashboardLayoutProps) => {
    return (
        <div className="flex min-h-screen w-full bg-background">
            <DashboardSidebar />
            <div className="flex-1 flex flex-col">
                <DashboardHeader
                    userData={userData}
                    handleLogout={handleLogout}
                />
                <main className="flex-1 p-2 sm:p-8 bg-[#f6f7f8] dark:bg-background-dark">
                    {children}
                </main>
            </div>
        </div>
    );
};
