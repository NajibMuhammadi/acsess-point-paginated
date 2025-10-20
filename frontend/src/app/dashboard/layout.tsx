"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import { io as clientIO } from "socket.io-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/utils/api";
import AccessDenied from "@/components/accessDenied/page";
import LoadingScreen from "@/components/dashboardLoading/page";

interface UserData {
    userId: string;
    name?: string;
    email?: string;
    role?: string;
    companyName?: string;
    companyId?: string;
    isApproved?: boolean;
    createdAt?: string;
    lastLogin?: string;
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
    alarms: any[];
}
const AdminContext = createContext<AdminContextType | null>(null);
export const useAdminData = () => useContext(AdminContext)!;

function getUserToken() {
    return localStorage.getItem("userToken");
}

function decodeToken(token: string | null): DecodedUser | null {
    if (!token) return null;
    try {
        const decoded = jwtDecode<DecodedUser>(token);
        if (!decoded.exp || decoded.exp * 1000 < Date.now()) return null;
        return decoded;
    } catch {
        return null;
    }
}

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
    const [alarms, setAlarms] = useState<any[]>([]);

    useEffect(() => {
        const token = getUserToken();
        const decoded = decodeToken(token);

        if (!decoded || !token) {
            setLoading(false);
            return;
        }
        setUserData(decoded);
        console.log("User data decoded:", decoded);
        setIsLoggedIn(true);

        async function init() {
            if (!token) return;

            const decoded = decodeToken(token);
            if (!decoded) return;

            await fetchUserProfile(token);
            await fetchAllBuildingData(token);
            await setupSocketConnection(token, decoded.companyId);
        }

        init().finally(() => setLoading(false));

        return () => socket?.disconnect();
    }, []);

    async function fetchAllBuildingData(token: string) {
        try {
            const { ok, data } = await apiRequest(
                "/api/building/all",
                "GET",
                undefined,
                token
            );

            if (ok && data.success) {
                setBuildings(data.buildings || []);
                setStations(data.stations || []);
                setAttendance(data.attendances || []);
                setVisitors(data.visitors || []);
            } else {
                console.error("Failed to fetch building data:", data.message);
            }
        } catch (error) {
            console.error("Error fetching building data:", error);
        }
    }

    async function fetchUserProfile(token: string) {
        try {
            const { ok, data } = await apiRequest(
                "/api/admin/profile",
                "GET",
                undefined,
                token
            );
            if (ok && data.success) {
                console.log("✅ Real user profile fetched:", data.user);
                setUserData(data.user);
            }
        } catch (error) {
            console.error("❌ Error fetching user profile:", error);
        }
    }

    async function setupSocketConnection(token: string, companyId?: string) {
        const decoded = decodeToken(token);
        if (!decoded) return;
        const s = clientIO(process.env.NEXT_PUBLIC_API_BASE_URL!, {
            transports: ["websocket"],
            auth: { token },
        });

        s.on("connect", () => {
            console.log("🔌 Socket ansluten");
            if (companyId) s.emit("joinCompany", { companyId });
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
            console.log("⚡ stationApprovalUpdated:", stationId, isApproved);

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

        s.on("buildingDeleted", (data: { buildingId: string }) => {
            console.log("🏢 Building deleted:", data.buildingId);
            setBuildings((prev) =>
                prev.filter((b) => b.buildingId !== data.buildingId)
            );
        });

        s.on("alarmTriggered", (newAlarm) => {
            console.log("🚨 Nytt larm mottaget:", newAlarm);
            setAlarms((prev) => [
                {
                    ...newAlarm,
                    createdAt: new Date().toISOString(),
                    acknowledged: false,
                },
                ...prev,
            ]);
        });
        s.on("alarmAcknowledged", (data) => {
            console.log("🔔 Larm kvitterades i realtid:", data);

            // Uppdatera lokala larmlistan
            setAlarms((prev) =>
                prev.map((a) =>
                    a.alarmId === data.alarmId
                        ? {
                              ...a,
                              acknowledged: true,
                              acknowledgedAt: data.acknowledgedAt,
                              acknowledgedBy: data.acknowledgedBy,
                          }
                        : a
                )
            );
        });
        s.on("buildingDeleted", (data: { buildingId: string }) => {
            console.log("🏢 Building deleted (realtime):", data.buildingId);

            setBuildings((prev) =>
                prev.filter((b) => b.buildingId !== data.buildingId)
            );

            // Ta även bort alla stationer kopplade till byggnaden
            setStations((prev) =>
                prev.map((s) =>
                    s.buildingId === data.buildingId
                        ? { ...s, buildingId: null }
                        : s
                )
            );
        });
        s.on(
            "stationDeleted",
            (data: { stationId: string; buildingId?: string }) => {
                console.log("🗑️ Station deleted (realtime):", data.stationId);

                setStations((prev) =>
                    prev.filter((s) => s.stationId !== data.stationId)
                );
            }
        );
        setSocket(s);
    }

    // --- Logout ---
    const handleLogout = () => {
        socket?.disconnect();
        localStorage.removeItem("userToken");
        setIsLoggedIn(false);
        window.location.href = "/login";
    };

    if (loading) return <LoadingScreen />;
    if (!isLoggedIn) return <AccessDenied />;

    return (
        <AdminContext.Provider
            value={{
                userData,
                buildings,
                stations,
                attendance,
                visitors,
                alarms,
            }}
        >
            <DashboardLayout userData={userData} handleLogout={handleLogout}>
                {children}
            </DashboardLayout>
        </AdminContext.Provider>
    );
}
