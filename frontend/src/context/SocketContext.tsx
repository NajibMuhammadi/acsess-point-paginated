"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { io, Socket } from "socket.io-client";

// ============================================================
// 🔹 TYPES
// ============================================================
export interface AttendanceRecord {
    attendanceId: string;
    companyId: string;
    visitorId: string;
    visitorName: string;
    uid: string;
    stationId: string;
    buildingId: string;
    checkInTime: string;
    checkOutTime: string | null;
    createdAt: string;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    realtimeAttendance: AttendanceRecord[];
}

const SocketContext = createContext<SocketContextType | null>(null);
export const useSocket = () => useContext(SocketContext)!;

// ============================================================
// 🔹 COMPONENT
// ============================================================
export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [realtimeAttendance, setRealtimeAttendance] = useState<
        AttendanceRecord[]
    >([]);

    const token =
        typeof window !== "undefined"
            ? localStorage.getItem("userToken")
            : null;

    // ============================================================
    // 🔹 Initialize socket
    // ============================================================
    useEffect(() => {
        if (!token || !process.env.NEXT_PUBLIC_API_BASE_URL) return;

        const s = io(process.env.NEXT_PUBLIC_API_BASE_URL, {
            transports: ["websocket"],
            auth: { token },
        });

        setSocket(s);

        s.on("connect", () => {
            console.log("🔌 Socket ansluten:", s.id);
            setIsConnected(true);
        });

        s.on("disconnect", () => {
            console.log("🔌 Socket frånkopplad");
            setIsConnected(false);
        });

        // ============================================================
        // 🟢 REALTIME ATTENDANCE
        // ============================================================
        s.on("attendanceUpdated", (newAttendance: AttendanceRecord) => {
            console.log("📡 attendanceUpdated:", newAttendance);

            setRealtimeAttendance((prev) => {
                const exists = prev.some(
                    (a) => a.attendanceId === newAttendance.attendanceId
                );
                if (exists) {
                    // uppdatera existerande post
                    return prev.map((a) =>
                        a.attendanceId === newAttendance.attendanceId
                            ? newAttendance
                            : a
                    );
                }
                // lägg till ny överst
                return [newAttendance, ...prev];
            });
        });

        return () => {
            s.disconnect();
        };
    }, [token]);

    return (
        <SocketContext.Provider
            value={{ socket, isConnected, realtimeAttendance }}
        >
            {children}
        </SocketContext.Provider>
    );
}
