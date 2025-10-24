"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import { io as clientIO } from "socket.io-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/utils/api";
import AccessDenied from "@/components/accessDenied/page";
import LoadingScreen from "@/components/dashboardLoading/page";
import { SocketProvider } from "@/context/SocketContext";

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

interface AdminContextType {
    userData: UserData | null;
    socket: any | null;
    buildings: any[];
    stations: any[];
    visitors: any[];
    alarms: any[];
    stationRefreshKey: number;
    alarmRefreshKey: number;
    weeklyData: any[];
    recentAttendance: any[];
    dashboardStats: {
        totalBuildings: number;
        totalStations: number;
        activeStations: number;
        onlineStations: number;
        currentlyCheckedIn: number;
    };
    lastestBuildings: any[];
}

const AdminContext = createContext<AdminContextType | null>(null);
export const useAdminData = () => useContext(AdminContext)!;

function getUserToken() {
    return typeof window !== "undefined"
        ? localStorage.getItem("userToken")
        : null;
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
    const [visitors, setVisitors] = useState<any[]>([]);
    const [alarms, setAlarms] = useState<any[]>([]);
    const [socket, setSocket] = useState<any | null>(null);
    const [stationRefreshKey, setStationRefreshKey] = useState(0);
    const [alarmRefreshKey, setAlarmRefreshKey] = useState(0);
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
    const [lastestBuildings, setLastestBuildings] = useState<any[]>([]);

    const [dashboardStats, setDashboardStats] = useState({
        totalBuildings: 0,
        totalStations: 0,
        activeStations: 0,
        onlineStations: 0,
        currentlyCheckedIn: 0,
    });

    useEffect(() => {
        const token = getUserToken();
        const decoded = decodeToken(token);
        if (!decoded || !token) {
            setLoading(false);
            return;
        }
        setUserData(decoded);
        setIsLoggedIn(true);
        let s: any;

        async function init() {
            try {
                if (!token || !decoded) return;
                await Promise.all([
                    fetchUserProfile(token),
                    fetchAllBuildings(token),
                    fetchDashboardData(token), // 🟢 Hämtar ALLT dashboard-relaterat i en query
                    fetchAllStations(token),
                    fetchAllAlarms(token),
                ]);
                s = await setupSocketConnection(token, decoded.companyId);
                setSocket(s);
            } catch (err) {
                console.error("❌ Init error:", err);
            } finally {
                setLoading(false);
            }
        }
        init();

        return () => {
            if (s) s.disconnect();
        };
    }, []);

    async function fetchUserProfile(token: string) {
        const { ok, data } = await apiRequest(
            "/api/admin/profile",
            "GET",
            undefined,
            token
        );
        if (ok && data.success) setUserData(data.user);
    }

    async function fetchAllBuildings(token: string) {
        const { ok, data } = await apiRequest(
            "/api/building/unpaginated",
            "GET",
            undefined,
            token
        );
        if (ok && data.success) setBuildings(data.buildings || []);
    }

    async function fetchAllStations(token: string) {
        const { ok, data } = await apiRequest(
            "/api/station/allunpaginated",
            "GET",
            undefined,
            token
        );
        if (ok && data.success) setStations(data.stations || []);
    }

    async function fetchAllAlarms(token: string) {
        const { ok, data } = await apiRequest(
            "/api/alarm/paginated?page=1&limit=25",
            "GET",
            undefined,
            token
        );
        if (ok && data.success) setAlarms(data.alarms || []);
    }

    // 🟢 EN ENDA REQUEST för all dashboard-data
    async function fetchDashboardData(token: string) {
        const { ok, data } = await apiRequest(
            "/api/attendance/today",
            "GET",
            undefined,
            token
        );
        if (ok && data.success) {
            setWeeklyData(data.data || []);
            setRecentAttendance(data.recentAttendance || []);
            setLastestBuildings(data.latestBuildings || []);
            setDashboardStats(
                data.stats || {
                    totalBuildings: 0,
                    totalStations: 0,
                    activeStations: 0,
                    onlineStations: 0,
                    currentlyCheckedIn: 0,
                }
            );
            console.log("📊 Dashboard data hämtad", data);
        }
    }

    async function setupSocketConnection(token: string, companyId?: string) {
        if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
            console.error("❌ NEXT_PUBLIC_API_BASE_URL saknas i .env");
            return null;
        }

        const s = clientIO(process.env.NEXT_PUBLIC_API_BASE_URL!, {
            transports: ["websocket"],
            auth: { token },
        });

        s.on("connect", () => {
            console.log("🔌 Socket ansluten:", s.id);
            if (companyId) s.emit("joinCompany", { companyId });
        });

        // 🏢 Building events
        s.on("buildingCreated", (b: any) => {
            console.log("🏢 Building created:", b);
            setBuildings((prev) => [...prev, b]);
        });
        s.on("buildingCapacityUpdated", (update: any) => {
            console.log("🏢 Building capacity updated:", update);

            // 🔹 Uppdatera senaste byggnader (dashboard)
            setLastestBuildings((prev) =>
                prev.map((b) =>
                    b.buildingId === update.buildingId
                        ? {
                              ...b,
                              activeVisitorsCount: update.activeVisitorsCount,
                          }
                        : b
                )
            );

            // 🔹 Uppdatera hela byggnadslistan (för BuildingPage)
            setBuildings((prev) =>
                prev.map((b) =>
                    b.buildingId === update.buildingId
                        ? {
                              ...b,
                              activeVisitorsCount: update.activeVisitorsCount,
                          }
                        : b
                )
            );
        });

        s.on("buildingDeleted", ({ buildingId }: any) => {
            console.log("🗑️ Building deleted:", buildingId);
            setBuildings((prev) =>
                prev.filter((b) => b.buildingId !== buildingId)
            );
            setStations((prev) =>
                prev.map((st) =>
                    st.buildingId === buildingId
                        ? { ...st, buildingId: null }
                        : st
                )
            );
            setLastestBuildings((prev) =>
                prev.filter((b) => b.buildingId !== buildingId)
            );
        });

        // 📡 Station events
        s.on("stationCreated", (st: any) => {
            console.log("📡 Station created:", st);
            setStations((prev) => [...prev, st]);
            setStationRefreshKey((x) => x + 1);
        });

        s.on("stationDeleted", ({ stationId }: any) => {
            console.log("🗑️ Station deleted:", stationId);
            setStations((prev) =>
                prev.filter((st) => st.stationId !== stationId)
            );
            setStationRefreshKey((x) => x + 1);
        });

        s.on("stationMoved", ({ stationId, buildingId, buildingName }: any) => {
            console.log("🔁 Station moved:", { stationId, buildingId });
            setStations((prev) =>
                prev.map((st) =>
                    st.stationId === stationId
                        ? {
                              ...st,
                              buildingId: buildingId || null,
                              buildingName,
                          }
                        : st
                )
            );
            setStationRefreshKey((x) => x + 1);
        });

        s.on("stationApprovalUpdated", ({ stationId, isApproved }: any) => {
            console.log("✅ Station approval updated:", {
                stationId,
                isApproved,
            });
            setStations((prev) =>
                prev.map((st) =>
                    st.stationId === stationId ? { ...st, isApproved } : st
                )
            );
            setStationRefreshKey((x) => x + 1);
        });

        s.on("stationStatusUpdated", (data: any) => {
            console.log("💓 Station status updated:", data);
            setStations((prev) =>
                prev.map((st) =>
                    st.stationId === data.stationId
                        ? {
                              ...st,
                              isOnline: data.isOnline,
                              lastPing: data.lastPing,
                          }
                        : st
                )
            );
            setStationRefreshKey((x) => x + 1);
        });

        s.on("stationStatsUpdated", (update: any) => {
            console.log("📊 Station stats updated:", update);
            // Station-specifika stats uppdateras här om du visar dem någonstans
        });

        // 🚨 Alarm events
        s.on("alarmTriggered", (alarm: any) => {
            console.log("🚨 Alarm triggered:", alarm);
            setAlarms((prev) => [alarm, ...prev]);
            setAlarmRefreshKey((x) => x + 1);
        });

        s.on("alarmAcknowledged", (data: any) => {
            console.log("✅ Alarm acknowledged:", data);
            setAlarms((prev) =>
                prev.map((a) =>
                    a.alarmId === data.alarmId
                        ? {
                              ...a,
                              acknowledged: true,
                              acknowledgedBy: data.acknowledgedBy,
                              acknowledgedAt: data.acknowledgedAt,
                          }
                        : a
                )
            );
            setAlarmRefreshKey((x) => x + 1);
        });

        // 📊 Dashboard stats events (LÄTTA UPDATES)
        s.on("weeklyTrendsUpdated", (data: any[]) => {
            console.log("📈 Weekly trends updated (full refresh)");
            setWeeklyData(data);
        });

        s.on("recentAttendanceUpdated", (recent: any[]) => {
            console.log("📋 Recent attendance updated");
            setRecentAttendance(recent);
        });

        s.on("latestBuildingsUpdated", (buildings: any[]) => {
            console.log("🏢 Latest buildings updated");
            setLastestBuildings(buildings);
        });

        s.on("currentlyCheckedInUpdated", (count: number) => {
            console.log("👥 Currently checked in updated:", count);
            setDashboardStats((prev) => ({
                ...prev,
                currentlyCheckedIn: count,
            }));
        });

        s.on("dashboardStatsUpdated", (stats: any) => {
            console.log("📊 Dashboard stats updated (lightweight):", stats);
            setDashboardStats(stats);
        });

        s.on("attendanceUpdated", (attendance: any) => {
            console.log("✅ Attendance record updated:", attendance);
            // Om du vill visa senaste attendance i realtid kan du uppdatera här
        });

        return s;
    }

    const handleLogout = () => {
        socket?.disconnect();
        localStorage.removeItem("userToken");
        setIsLoggedIn(false);
        window.location.href = "/login";
    };

    if (loading) return <LoadingScreen />;
    if (!isLoggedIn) return <AccessDenied />;

    return (
        <SocketProvider>
            <AdminContext.Provider
                value={{
                    userData,
                    socket,
                    buildings,
                    stations,
                    visitors,
                    alarms,
                    stationRefreshKey,
                    alarmRefreshKey,
                    weeklyData,
                    recentAttendance,
                    dashboardStats,
                    lastestBuildings,
                }}
            >
                <DashboardLayout
                    userData={userData}
                    handleLogout={handleLogout}
                >
                    {children}
                </DashboardLayout>
            </AdminContext.Provider>
        </SocketProvider>
    );
}
