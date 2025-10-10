"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import { io as clientIO } from "socket.io-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserData {
    userId: string;
    name?: string;
    email?: string;
    role?: string;
    companyName?: string;
    companyId?: string;
}
interface DecodedUser extends UserData {
    exp: number;
}

// 👇 Context för att alla undersidor ska kunna läsa buildings, stations, attendance
interface AdminContextType {
    userData: UserData | null;
    buildings: any[];
    stations: any[];
    attendance: any[];
    visitors: any[];
}
const AdminContext = createContext<AdminContextType | null>(null);
export const useAdminData = () => useContext(AdminContext)!;

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    const [buildings, setBuildings] = useState<any[]>([]);
    const [stations, setStations] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [visitors, setVisitors] = useState<any[]>([]);
    const [socket, setSocket] = useState<any | null>(null);

    const getUserToken = () => localStorage.getItem("userToken");

    const checkToken = (token: string | null): DecodedUser | null => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<DecodedUser>(token);
            if (!decoded.exp || decoded.exp * 1000 < Date.now()) return null;
            return decoded;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const token = getUserToken();
        const decoded = checkToken(token);

        if (!decoded || !token) {
            setLoading(false);
            return;
        }

        setUserData(decoded);
        setIsLoggedIn(true);

        const start = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/building/all`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const data = await res.json();
                if (res.ok) {
                    setBuildings(data.buildings || []);
                    setStations(data.stations || []);
                    setAttendance(data.attendances || []);
                    setVisitors(data.visitors || []);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            }

            const s = clientIO(process.env.NEXT_PUBLIC_API_BASE_URL!, {
                transports: ["websocket"],
                auth: { token },
            });

            s.on("connect", () => {
                console.log("🔌 Socket ansluten");
                if (decoded.companyId) s.emit("joinCompany", decoded.companyId);
            });

            s.on("buildingCreated", (building: any) => {
                setBuildings((prev) => [...prev, building]);
            });

            s.on("stationCreated", (station: any) => {
                setStations((prev) => [...prev, station]);
            });

            s.on("stationMoved", ({ stationId, buildingId }: any) => {
                setStations((prev) =>
                    prev.map((s) =>
                        s.stationId === stationId ? { ...s, buildingId } : s
                    )
                );
            });
            s.on("stationApprovalUpdated", ({ stationId, isApproved }: any) => {
                console.log(
                    "⚡ stationApprovalUpdated:",
                    stationId,
                    isApproved
                );

                setStations((prev) =>
                    prev.map((station) =>
                        station.stationId === stationId
                            ? { ...station, isApproved }
                            : station
                    )
                );
            });

            s.on("visitorCreated", (visitor: any) => {
                setVisitors((prev) => [...prev, visitor]);
            });

            s.on("attendanceUpdated", (newAttendance: any) => {
                setAttendance((prev) => {
                    const exists = prev.some(
                        (a) => a.attendanceId === newAttendance.attendanceId
                    );
                    if (exists) {
                        return prev.map((a) =>
                            a.attendanceId === newAttendance.attendanceId
                                ? newAttendance
                                : a
                        );
                    }
                    return [newAttendance, ...prev];
                });
            });

            s.on("stationStatusUpdated", (data: any) => {
                setStations((prev) =>
                    prev.map((s) =>
                        s.stationId === data.stationId
                            ? {
                                  ...s,
                                  isOnline: data.isOnline,
                                  lastPing: data.lastPing,
                              }
                            : s
                    )
                );
            });

            setSocket(s);
            return () => s.disconnect();
        };

        start().finally(() => setLoading(false));
    }, []);

    // --- Logout ---
    const handleLogout = () => {
        socket?.disconnect();
        localStorage.removeItem("userToken");
        setIsLoggedIn(false);
        window.location.href = "/login";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Laddar dashboard...</p>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-white shadow-xl border-0 rounded-3xl">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg
                                className="w-8 h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Åtkomst Nekad
                        </h1>
                        <p className="text-gray-600 mb-6">
                            Du måste logga in för att komma åt admin dashboard
                        </p>
                        <Button
                            onClick={() => (window.location.href = "/login")}
                            className="w-full bg-black hover:bg-gray-800 text-white rounded-2xl py-3"
                        >
                            Logga In
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <AdminContext.Provider
            value={{ userData, buildings, stations, attendance, visitors }}
        >
            <DashboardLayout userData={userData} handleLogout={handleLogout}>
                {children}
            </DashboardLayout>
        </AdminContext.Provider>
    );
}
