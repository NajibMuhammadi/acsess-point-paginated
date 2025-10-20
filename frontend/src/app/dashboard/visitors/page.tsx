"use client";

import { useEffect, useState } from "react";

function getUserToken() {
    return localStorage.getItem("userToken");
}

export default function VisitorsPage() {
    const [visitors, setVisitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 🔹 Hämta alla besökare
    const fetchVisitors = async () => {
        const token = getUserToken();
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/all`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success) setVisitors(data.visitors || []);
        } catch (err) {
            console.error("❌ Error fetching visitors:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisitors();
    }, []);

    if (loading)
        return (
            <div className="flex items-center justify-center h-[70vh] text-gray-500 dark:text-gray-400">
                Laddar besökare...
            </div>
        );

    return (
        <div className="px-6 py-8 md:px-12 lg:px-20 xl:px-32 space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Visitors
            </h1>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Phone
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                UID
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Last Seen
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {visitors.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    Inga besökare hittades.
                                </td>
                            </tr>
                        ) : (
                            visitors.map((v) => (
                                <tr
                                    key={v.visitorId}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                        {v.visitorName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {v.phoneNumber}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {v.uid}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 capitalize">
                                        {v.type}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {v.lastSeen
                                            ? new Date(
                                                  v.lastSeen
                                              ).toLocaleString("sv-SE")
                                            : "Aldrig"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
