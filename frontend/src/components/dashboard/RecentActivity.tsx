import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface RecentActivityProps {
    attendanceId: string;
    time: string;
    building: string;
    visitor: string;
    uid: string;
    station: string;
    type: "in" | "out";
}

export const RecentActivity = ({
    recentActivity,
}: {
    recentActivity: RecentActivityProps[];
}) => {
    const getAvatarColor = (index: number) => {
        const colors = [
            "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
            "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
            "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
            "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
            "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="bg-white dark:bg-primary/10 rounded-xl p-6 border border-gray-200 dark:border-slate-700/50">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Recent Activity
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Latest check-ins and check-outs
                </p>
            </div>
            <div className="space-y-4 divide-y divide-primary/10 dark:divide-primary/20">
                {recentActivity.map((activity, index) => (
                    <div
                        key={activity.attendanceId}
                        className="flex items-center gap-4 p-4"
                    >
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm ${getAvatarColor(
                                index
                            )}`}
                        >
                            {activity.visitor &&
                                activity.visitor
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                        </div>
                        <div className="flex-grow">
                            <p className="font-medium text-gray-900 dark:text-white">
                                {activity.visitor}{" "}
                                {activity.type === "in"
                                    ? "checked-in"
                                    : "checked-out"}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {activity.building} - {activity.time}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
