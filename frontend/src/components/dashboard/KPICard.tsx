import { LucideIcon } from "lucide-react";

interface KPICardProps {
    icon: LucideIcon;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

export const KPICard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    trend,
}: KPICardProps) => {
    return (
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-background-dark dark:bg-primary/10">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1 truncate dark:text-background-light">
                            {title}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 dark:text-background-light/80">
                            {value}
                        </p>
                        {subtitle && (
                            <div className="flex items-center mt-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                                <p className="text-xs sm:text-sm text-green-600 font-medium truncate">
                                    {subtitle}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                {trend && (
                    <div
                        className={`text-xs sm:text-sm font-semibold flex-shrink-0 ${
                            trend.isPositive ? "text-green-600" : "text-red-600"
                        }`}
                    >
                        {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                    </div>
                )}
            </div>
        </div>
    );
};
