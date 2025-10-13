"use client";

import { useState, useEffect, useRef } from "react";
import {
    Check,
    CheckCircle,
    IdCard,
    Nfc,
    Phone,
    User,
    UserPlus,
} from "lucide-react";

interface RegistrationResult {
    success: boolean;
    token?: string;
    message?: string;
}

interface AttendanceData {
    uid: string;
    visitorName?: string;
    phoneNumber?: string;
    type?: string;
}

interface SerialPort {
    readable: ReadableStream | null;
    writable: WritableStream | null;
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
}

interface Navigator {
    serial: {
        requestPort(): Promise<SerialPort>;
        getPorts(): Promise<SerialPort[]>;
    };
}

export default function StationRegistrationPage() {
    const [stationId, setStationId] = useState("");
    const [secret, setSecret] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [registrationResult, setRegistrationResult] =
        useState<RegistrationResult | null>(null);
    const [isStationActive, setIsStationActive] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [attendanceData, setAttendanceData] = useState<AttendanceData>({
        uid: "",
        visitorName: "",
        phoneNumber: "",
        type: "personal",
    });
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceMessage, setAttendanceMessage] = useState("");
    const [showNewPersonModal, setShowNewPersonModal] = useState(false);
    const [newPersonUID, setNewPersonUID] = useState("");
    const [newPersonData, setNewPersonData] = useState({
        visitorName: "",
        phoneNumber: "",
        type: "personal",
    });
    const [lastSuccess, setLastSuccess] = useState<{
        uid: string;
        visitorName: string;
        direction: "in" | "out";
    } | null>(null);

    // Serial port states
    const [port, setPort] = useState<SerialPort | null>(null);
    const isProcessingRef = useRef(false);
    const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
    const isOfflineRef = useRef<boolean>(false);

    // Serial heartbeat state
    const [serialHeartbeat, setSerialHeartbeat] = useState<
        "ok" | "error" | "checking"
    >("checking");
    const serialHeartbeatRef = useRef<"ok" | "error" | "checking">("checking");

    const [isOffline, setIsOffline] = useState(false);

    // Combined offline state - true if either API or serial heartbeat fails
    const isSystemOffline = isOffline || serialHeartbeat === "error";

    useEffect(() => {
        const savedToken = localStorage.getItem("stationToken");
        if (savedToken) {
            setIsStationActive(true);
            setRegistrationResult({ success: true, token: savedToken });
        }
        setIsInitializing(false); // Markera att initialiseringen är klar
    }, []);

    // Automatisk anslutning till seriell port när stationen blir aktiv
    useEffect(() => {
        if (!isStationActive) return;

        const reconnectSerial = async () => {
            try {
                const ports = await (navigator as any).serial.getPorts();
                if (ports.length > 0) {
                    await connectToPort(ports[0]);
                }
            } catch (err) {
                // Silent error handling
            }
        };

        reconnectSerial();
    }, [isStationActive]);
    useEffect(() => {
        const checkHeartbeat = async () => {
            try {
                const token = localStorage.getItem("stationToken");
                if (!token) {
                    setIsOffline(true);
                    return;
                }

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/station/heartbeat`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                setIsOffline(!res.ok);
            } catch (err) {
                setIsOffline(true);
            }
        };

        checkHeartbeat();
        const interval = setInterval(checkHeartbeat, 10000);
        return () => clearInterval(interval);
    }, []);

    // keep a ref in sync so long-running loops/readers see the latest value
    useEffect(() => {
        isOfflineRef.current = isOffline;
    }, [isOffline]);

    // keep serial heartbeat ref in sync
    useEffect(() => {
        serialHeartbeatRef.current = serialHeartbeat;
    }, [serialHeartbeat]);

    // Serial port heartbeat - monitors card reader connection
    useEffect(() => {
        if (!isStationActive) return;

        const checkSerialHeartbeat = async () => {
            setSerialHeartbeat("checking");

            try {
                if (!port) {
                    const ports = await (navigator as any).serial.getPorts();
                    if (ports.length > 0) {
                        await connectToPort(ports[0]);
                        setSerialHeartbeat("ok");
                    } else {
                        setSerialHeartbeat("error");
                    }
                    return;
                }

                if (port.readable && port.writable) {
                    setSerialHeartbeat("ok");
                } else {
                    await disconnectSerial();
                    setTimeout(async () => {
                        try {
                            const ports = await (
                                navigator as any
                            ).serial.getPorts();
                            if (ports.length > 0) {
                                await connectToPort(ports[0]);
                                setSerialHeartbeat("ok");
                            } else {
                                setSerialHeartbeat("error");
                            }
                        } catch (err) {
                            setSerialHeartbeat("error");
                        }
                    }, 1000);
                }
            } catch (err) {
                setSerialHeartbeat("error");
            }
        };

        checkSerialHeartbeat();
        const interval = setInterval(checkSerialHeartbeat, 5000);
        return () => clearInterval(interval);
    }, [isStationActive, port]);

    // denna funktion läser kontinuerligt från den seriella porten och hanterar kortläsarens data och uppdaterar state och UI baserat på det
    const startSerialReading = async (serialPort: SerialPort) => {
        const DEBOUNCE_MS = 2000;
        let buffer = "";
        let lastUID = "";
        let lastScanTime = 0;

        try {
            const reader = serialPort.readable?.getReader();
            if (!reader) return;

            readerRef.current = reader;

            while (true) {
                if (isOfflineRef.current) break;

                try {
                    const { value, done } = await reader.read();
                    if (done) break;

                    if (value) {
                        buffer += new TextDecoder().decode(value).trim();

                        const uidMatch = buffer.match(/([0-9A-Fa-f]{8,14})/);

                        if (uidMatch) {
                            const cleanUID = uidMatch[1].toUpperCase();
                            const now = Date.now();

                            if (
                                cleanUID === lastUID &&
                                now - lastScanTime < DEBOUNCE_MS
                            ) {
                                buffer = "";
                                continue;
                            }

                            lastUID = cleanUID;
                            lastScanTime = now;

                            if (
                                !isOfflineRef.current &&
                                serialHeartbeatRef.current === "ok"
                            ) {
                                await submitAttendance(cleanUID);
                            }

                            buffer = "";
                        }

                        if (buffer.length > 100) {
                            buffer = "";
                        }
                    }
                } catch (readError) {
                    break;
                }
            }
        } catch (err) {
            // Silent error handling
        } finally {
            readerRef.current = null;
        }
    };

    // Anslut till en vald seriell port
    const connectToPort = async (selectedPort: SerialPort) => {
        try {
            await selectedPort.open({ baudRate: 9600 });
            setPort(selectedPort);
            setSerialHeartbeat("ok");
            startSerialReading(selectedPort);
        } catch (err) {
            setSerialHeartbeat("error");
        }
    };

    const disconnectSerial = async () => {
        try {
            if (readerRef.current) {
                await readerRef.current.cancel();
                readerRef.current = null;
            }
            if (port) {
                await port.close();
                setPort(null);
            }
        } catch (err) {
            // Silent error handling
        }
        setSerialHeartbeat("error");
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnectSerial();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stationId.trim() || !secret.trim()) {
            setMessage("Både Station ID och Secret Key krävs");
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setMessage("Registrerar station...");

        try {
            setMessage("Registrerar station...");
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/station/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        stationId: stationId.trim(),
                        secret: secret.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                if (data.token) {
                    localStorage.setItem("stationToken", data.token);
                }

                setRegistrationResult(data);
                setIsStationActive(true);
                setMessage("");
                setIsSuccess(true);
            } else {
                setMessage(data.message || "Fel vid registrering av station");
                setIsSuccess(false);
            }
        } catch (error) {
            setMessage("Nätverksfel vid registrering av station");
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        disconnectSerial();
        setStationId("");
        setSecret("");
        setMessage("");
        setIsSuccess(false);
        setRegistrationResult(null);
        setIsStationActive(false);
        localStorage.removeItem("stationToken");
    };

    const submitAttendance = async (uid: string) => {
        if (!uid?.trim()) {
            setAttendanceMessage("UID krävs");
            return;
        }

        if (isOffline) {
            setAttendanceMessage(
                "Station offline — kan inte registrera närvaro"
            );
            return;
        }

        if (serialHeartbeat === "error") {
            setAttendanceMessage(
                "Kortläsare frånkopplad — kan inte registrera närvaro"
            );
            return;
        }

        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        setAttendanceLoading(true);
        setAttendanceMessage("");

        try {
            const token = localStorage.getItem("stationToken");
            if (!token) {
                setAttendanceMessage("Station inte inloggad - registrera igen");
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/attendance/attendance-uid`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ uid: uid.trim() }),
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("stationToken");
                setIsStationActive(false);
                setMessage("Sessionen har gått ut – registrera stationen igen");
                return;
            }

            const data = await response.json();

            if (response.ok && data.success) {
                setAttendanceMessage(`✅ ${data.message}`);
                const direction: "in" | "out" = data.attendance?.checkOutTime
                    ? "out"
                    : "in";

                setLastSuccess({
                    uid: uid.trim(),
                    visitorName: data.attendance.visitorName || "Unknown",
                    direction,
                });
                setAttendanceData({
                    uid: "",
                    visitorName: "",
                    phoneNumber: "",
                    type: "personal",
                });

                setTimeout(() => {
                    setLastSuccess(null);
                }, 3000);

                setTimeout(() => {
                    setAttendanceMessage("");
                }, 3000);
            } else {
                if (data.message && data.message.includes("Ny besökare")) {
                    setNewPersonUID(uid.trim());
                    setShowNewPersonModal(true);
                    setAttendanceMessage("");
                } else {
                    setAttendanceMessage(
                        data.message || "Fel vid närvaroregistrering"
                    );
                }
            }
        } catch (error) {
            setAttendanceMessage("Nätverksfel vid närvaroregistrering");
        } finally {
            setAttendanceLoading(false);
            setTimeout(() => {
                isProcessingRef.current = false;
            }, 1000);
        }
    };

    const handleAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitAttendance(attendanceData.uid);
    };

    const handleNewPersonSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPersonData.visitorName.trim()) {
            setAttendanceMessage("Namn krävs för ny person");
            return;
        }

        if (!newPersonData.phoneNumber.trim()) {
            setAttendanceMessage("Telefonnummer krävs för ny person");
            return;
        }

        setAttendanceLoading(true);
        setAttendanceMessage("");

        try {
            const token = localStorage.getItem("stationToken");
            if (!token) {
                setAttendanceMessage("Station inte inloggad - registrera igen");
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/attendance/attendance-uid`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        uid: newPersonUID,
                        visitorName: newPersonData.visitorName.trim(),
                        phoneNumber: newPersonData.phoneNumber.trim(),
                        type: newPersonData.type,
                    }),
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("stationToken");
                setIsStationActive(false);
                setMessage("Sessionen har gått ut – registrera stationen igen");
                return;
            }

            const data = await response.json();

            if (response.ok && data.success) {
                setAttendanceMessage(`✅ ${data.message}`);
                setShowNewPersonModal(false);
                setNewPersonUID("");
                setNewPersonData({
                    visitorName: "",
                    phoneNumber: "",
                    type: "personal",
                });
                setAttendanceData({
                    uid: "",
                    visitorName: "",
                    phoneNumber: "",
                    type: "personal",
                });

                setTimeout(() => {
                    setAttendanceMessage("");
                }, 3000);
            } else {
                setAttendanceMessage(
                    data.message || "Fel vid registrering av ny person"
                );
            }
        } catch (error) {
            setAttendanceMessage("Nätverksfel vid registrering av ny person");
        } finally {
            setAttendanceLoading(false);
        }
    };

    return (
        <main className="flex-grow flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark font-display text-text-light dark:text-text-dark">
            <div className="w-full max-w-lg mx-auto p-4 sm:p-6 lg:p-8 text-center">
                {isStationActive && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span
                            className={`w-3 h-3 rounded-full ${
                                serialHeartbeat === "ok"
                                    ? "bg-green-500"
                                    : serialHeartbeat === "error"
                                    ? "bg-red-500"
                                    : "bg-yellow-500 animate-pulse"
                            }`}
                        ></span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Kortläsare:{" "}
                            {serialHeartbeat === "ok"
                                ? "Ansluten"
                                : serialHeartbeat === "error"
                                ? "Frånkopplad"
                                : "Kontrollerar..."}
                        </span>
                    </div>
                )}
                <div className="relative bg-white dark:bg-background-dark rounded-xl shadow-lg border border-subtle-light dark:border-subtle-dark/20 p-8 space-y-6">
                    {isInitializing ? (
                        // Visa en loading spinner medan vi kontrollerar localStorage
                        <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            <p className="text-text-light/70 dark:text-text-dark/70">
                                Laddar...
                            </p>
                        </div>
                    ) : lastSuccess ? (
                        <>
                            <div
                                className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ring-4
    ${
        lastSuccess.direction === "in"
            ? "bg-green-100 ring-green-500/30 text-green-700"
            : "bg-red-100 ring-red-500/30 text-red-700"
    }`}
                            >
                                {lastSuccess.direction === "in" ? (
                                    <Check className="w-12 h-12" />
                                ) : (
                                    <CheckCircle className="w-12 h-12" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight">
                                    {lastSuccess.visitorName}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 text-lg">
                                    UID: {lastSuccess.uid}
                                </p>
                            </div>

                            <div
                                className={`flex items-center justify-center gap-2 p-3 rounded-lg
    ${
        lastSuccess.direction === "in"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
    }`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                <span className="text-sm font-medium">
                                    {lastSuccess.direction === "in"
                                        ? "Incheckad!"
                                        : "Utcheckad!"}
                                </span>
                            </div>

                            <p className="text-sm text-gray-400 pt-4">
                                You will be redirected automatically.
                            </p>
                        </>
                    ) : !isStationActive ? (
                        <>
                            <span className="material-symbols-outlined text-7xl text-primary">
                                <Nfc className="h-12 w-12 mx-auto mb-4" />
                            </span>

                            <h2 className="text-2xl font-bold tracking-tight">
                                Register Station
                            </h2>
                            <p className="text-text-light/70 dark:text-text-dark/70">
                                To get started, please register your station by
                                providing the Station ID and Secret Key below.
                            </p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ange Station ID"
                                        value={stationId}
                                        onChange={(e) =>
                                            setStationId(e.target.value)
                                        }
                                        className="form-input w-full h-14 pl-4 pr-4 rounded-lg bg-background-light dark:bg-subtle-dark/20 border-subtle-light dark:border-subtle-dark focus:ring-primary focus:border-primary transition-colors"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type="password"
                                        placeholder="Ange Secret Key"
                                        value={secret}
                                        onChange={(e) =>
                                            setSecret(e.target.value)
                                        }
                                        className="form-input w-full h-14 pl-4 pr-4 rounded-lg bg-background-light dark:bg-subtle-dark/20 border-subtle-light dark:border-subtle-dark focus:ring-primary focus:border-primary transition-colors"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                                >
                                    Registrera Station
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="absolute right-3 top-3 z-50 pointer-events-none">
                                <span
                                    className={`inline-flex items-center gap-2 text-sm font-medium ${
                                        isSystemOffline
                                            ? "text-red-500"
                                            : "text-green-500"
                                    }`}
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            isSystemOffline
                                                ? "bg-red-500"
                                                : "bg-green-500"
                                        }`}
                                    ></span>
                                    {isSystemOffline ? "Offline" : "Online"}
                                </span>
                            </div>
                            <span className="material-symbols-outlined text-7xl text-primary">
                                <Nfc className="h-12 w-12 mx-auto mb-4" />
                            </span>

                            <h2 className="text-2xl font-bold tracking-tight">
                                Scan Card or Enter UID
                            </h2>
                            <p className="text-text-light/70 dark:text-text-dark/70">
                                Place your card near the scanner or manually
                                type in your unique identifier below.
                            </p>

                            <form
                                onSubmit={handleAttendance}
                                className="space-y-4"
                            >
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40">
                                        <IdCard />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder={
                                            isSystemOffline
                                                ? "System offline - kan inte skanna"
                                                : "Skanna kort eller ange UID"
                                        }
                                        value={attendanceData.uid}
                                        onChange={(e) =>
                                            setAttendanceData({
                                                ...attendanceData,
                                                uid: e.target.value,
                                            })
                                        }
                                        className="form-input w-full h-14 pl-12 pr-4 rounded-lg bg-background-light dark:bg-subtle-dark/20 border-subtle-light dark:border-subtle-dark focus:ring-primary focus:border-primary transition-colors"
                                        disabled={
                                            attendanceLoading || isSystemOffline
                                        }
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={
                                        attendanceLoading || isSystemOffline
                                    }
                                    className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                                >
                                    {isSystemOffline
                                        ? "System Offline"
                                        : "Registrera Närvaro"}
                                </button>
                            </form>
                        </>
                    )}

                    {message && !isStationActive && (
                        <div
                            className={`p-3 rounded-lg text-sm ${
                                isSuccess
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-red-500/10 text-red-500"
                            }`}
                        >
                            {message}
                        </div>
                    )}
                </div>
                {showNewPersonModal && (
                    <div className="fixed bg-background-light inset-0 flex items-center justify-center z-50 p-4 ">
                        <div className="bg-white dark:bg-background-dark rounded-xl shadow-lg border border-subtle-light dark:border-subtle-dark/20 p-8 space-y-6 max-w-md w-full">
                            <div className="flex flex-col items-center space-y-2">
                                <div className="bg-primary/10 text-primary p-3 rounded-full">
                                    <UserPlus className="h-10 w-10" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">
                                    Register New Person
                                </h2>
                                <p className="text-text-light/70 dark:text-text-dark/70 text-center">
                                    Please fill in the details for the new
                                    visitor.
                                </p>
                            </div>

                            <form
                                onSubmit={handleNewPersonSubmit}
                                className="space-y-4 text-left"
                            >
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40">
                                        <User className="h-5 w-5" />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={newPersonData.visitorName}
                                        onChange={(e) =>
                                            setNewPersonData({
                                                ...newPersonData,
                                                visitorName: e.target.value,
                                            })
                                        }
                                        className="form-input w-full h-12 pl-12 pr-4 rounded-lg bg-background-light dark:bg-subtle-dark/20 border-subtle-light dark:border-subtle-dark focus:ring-primary focus:border-primary transition-colors"
                                        disabled={attendanceLoading}
                                        /* required */
                                    />
                                </div>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40">
                                        <IdCard className="h-5 w-5" />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="UID"
                                        value={newPersonUID}
                                        disabled
                                        className="form-input w-full h-12 pl-12 pr-4 rounded-lg bg-background-light dark:bg-subtle-dark/20 border-subtle-light dark:border-subtle-dark focus:ring-primary focus:border-primary transition-colors opacity-60"
                                    />
                                </div>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40">
                                        <Phone className="h-5 w-5" />
                                    </span>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={newPersonData.phoneNumber}
                                        onChange={(e) =>
                                            setNewPersonData({
                                                ...newPersonData,
                                                phoneNumber: e.target.value,
                                            })
                                        }
                                        className="form-input w-full h-12 pl-12 pr-4 rounded-lg bg-background-light dark:bg-subtle-dark/20 border-subtle-light dark:border-subtle-dark focus:ring-primary focus:border-primary transition-colors"
                                        disabled={attendanceLoading}
                                        /* required */
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewPersonModal(false);
                                            setNewPersonUID("");
                                            setNewPersonData({
                                                visitorName: "",
                                                phoneNumber: "",
                                                type: "personal",
                                            });
                                        }}
                                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                                        disabled={attendanceLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={attendanceLoading}
                                        className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="h-5 w-5" />
                                        <span>Register</span>
                                    </button>
                                </div>
                            </form>
                            {attendanceMessage && (
                                <div
                                    className={`mt-4 p-3 rounded-lg text-sm ${
                                        attendanceMessage === "success"
                                            ? "bg-green-500/10 text-green-500"
                                            : "bg-red-500/10 text-red-500"
                                    }`}
                                >
                                    {attendanceMessage}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
