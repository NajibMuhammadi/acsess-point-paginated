"use client";

import { useEffect, useState } from "react";
import {
    Search,
    MoreVertical,
    CheckCircle,
    Trash2,
    ShieldCheck,
    UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

function getUserToken() {
    return localStorage.getItem("userToken");
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // 🔹 Hämta alla användare
    const fetchUsers = async () => {
        const token = getUserToken();
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success) setUsers(data.users || []);
        } catch (err) {
            console.error("❌ Error fetching users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // ✅ Approve user
    const approveUser = async (userId: string) => {
        const token = getUserToken();
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/approve-user`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId }),
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success) {
                setUsers((prev) =>
                    prev.map((u) =>
                        u.userId === userId ? { ...u, isApproved: true } : u
                    )
                );
            }
        } catch (err) {
            console.error("❌ Error approving user:", err);
        }
    };

    // 🛠️ Ändra roll
    const changeUserRole = async (userId: string, role: string) => {
        const token = getUserToken();
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/change-role`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId, role }),
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success) {
                setUsers((prev) =>
                    prev.map((u) => (u.userId === userId ? { ...u, role } : u))
                );
            }
        } catch (err) {
            console.error("❌ Error changing role:", err);
        }
    };

    // ❌ Ta bort användare
    const deleteUser = async (userId: string) => {
        const token = getUserToken();
        if (!token) return;
        if (!confirm("Är du säker på att du vill ta bort denna användare?"))
            return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/delete-user/${userId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success) {
                setUsers((prev) => prev.filter((u) => u.userId !== userId));
            }
        } catch (err) {
            console.error("❌ Error deleting user:", err);
        }
    };

    const filteredUsers = users.filter(
        (u) =>
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="px-6 py-8 md:px-12 lg:px-20 xl:px-32 space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        User Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage users, roles, and access permissions.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Approved
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Last Login
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    Loading users...
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                                >
                                    No users found.
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr
                                    key={user.userId}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                        {user.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                user.role === "admin"
                                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                                    : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                            }`}
                                        >
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {user.isApproved ? (
                                            <span className="text-green-600 dark:text-green-400 font-medium">
                                                Approved
                                            </span>
                                        ) : (
                                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {user.lastLogin
                                            ? new Date(
                                                  user.lastLogin
                                              ).toLocaleString("sv-SE")
                                            : "Never"}
                                    </td>

                                    {/* 🔹 3-pricksmenyn */}
                                    <td className="px-6 py-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md"
                                            >
                                                {!user.isApproved && (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            approveUser(
                                                                user.userId
                                                            )
                                                        }
                                                        className="text-blue-600 dark:text-blue-400 cursor-pointer flex items-center hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    >
                                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                                        Approve
                                                    </DropdownMenuItem>
                                                )}

                                                {/* 🔹 Change Role submenu */}
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger className="flex items-center text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/20">
                                                        <UserCog className="w-4 h-4 mr-2" />
                                                        Change Role
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                changeUserRole(
                                                                    user.userId,
                                                                    "admin"
                                                                )
                                                            }
                                                            className="text-blue-600 dark:text-blue-400 cursor-pointer"
                                                        >
                                                            Admin
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                changeUserRole(
                                                                    user.userId,
                                                                    "firestation"
                                                                )
                                                            }
                                                            className="text-green-600 dark:text-green-400 cursor-pointer"
                                                        >
                                                            Firestation
                                                        </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        deleteUser(user.userId)
                                                    }
                                                    className="text-red-600 dark:text-red-400 cursor-pointer flex items-center hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
