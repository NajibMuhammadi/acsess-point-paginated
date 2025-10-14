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

/** ======= Typer ======= */
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
    // vissa implementationer har ondisconnect; vi sätter den dynamiskt via (as any)
}

interface Navigator {
    serial: {
        requestPort(): Promise<SerialPort>;
        getPorts(): Promise<SerialPort[]>;
        addEventListener?: (
            type: "connect" | "disconnect",
            cb: (ev: any) => void
        ) => void;
        removeEventListener?: (
            type: "connect" | "disconnect",
            cb: (ev: any) => void
        ) => void;
    };
}

/** ======= Komponent ======= */
export default function StationRegistrationPage() {
    /** ===== UI state ===== */
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

    /** ===== Serial/heartbeat state ===== */
    const [serialHeartbeat, setSerialHeartbeat] = useState<
        "ok" | "error" | "checking"
    >("checking");
    const [isOffline, setIsOffline] = useState(false);

    // Sammanlagd OFFLINE (API eller SERIAL)
    const isSystemOffline = isOffline || serialHeartbeat === "error";

    /** ===== Refs (för att undvika stale state i async-loops) ===== */
    const portRef = useRef<SerialPort | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
    const isProcessingRef = useRef(false);
    const isOfflineRef = useRef<boolean>(false);
    const serialHeartbeatRef = useRef<"ok" | "error" | "checking">("checking");

    /** ===== Init: kolla token ===== */
    useEffect(() => {
        const savedToken = localStorage.getItem("stationToken");
        if (savedToken) {
            console.log("💾 Token hittad i localStorage");
            setIsStationActive(true);
            setRegistrationResult({ success: true, token: savedToken });
        }
        setIsInitializing(false);
    }, []);

    /** ===== Sync ref-värden ===== */
    useEffect(() => {
        isOfflineRef.current = isOffline;
    }, [isOffline]);
    useEffect(() => {
        serialHeartbeatRef.current = serialHeartbeat;
    }, [serialHeartbeat]);

    /** ===== Auto-reconnect av tidigare godkänd port när station blir aktiv ===== */
    useEffect(() => {
        if (!isStationActive) return;

        const reconnectSerial = async () => {
            try {
                console.log("🔍 Letar efter tidigare godkända portar...");
                const ports = await (navigator as any).serial.getPorts();
                /* if (ports.length > 0) {
                    console.log(
                        "✅ Tidigare port hittad – ansluter automatiskt"
                    );
                    await connectToPort(ports[4]);
                } else {
                    console.warn("⚠️ Ingen tidigare port hittad");
                } */

                if (ports.length > 0) {
                    console.log("✅ Tillgängliga portar:", ports);

                    // Filtrera rätt port baserat på din kortläsare (ändra ID:n efter behov)
                    const validPort = ports.find((p: any) => {
                        const info = p.getInfo?.();
                        console.log("🔧 Port info:", info);
                        // Sätt dessa till din kortläsares ID-värden
                        return (
                            info?.usbVendorId === 1659 &&
                            info?.usbProductId === 8963
                        );
                    });

                    if (validPort) {
                        console.log("✅ Rätt port hittad – ansluter...");
                        await connectToPort(validPort);
                    } else {
                        console.warn(
                            "⚠️ Ingen giltig kortläsare hittad bland portar"
                        );
                    }
                } else {
                    console.warn("⚠️ Ingen tidigare port hittad");
                }
            } catch (err) {
                console.error("💥 Fel vid automatisk återanslutning:", err);
            }
        };

        reconnectSerial();
    }, [isStationActive]);

    // ska raderas pushar upp för test den från dagens datum och tid. 2025-10-14 08:30
    useEffect(() => {
        async function listPorts() {
            const ports = await (navigator as any).serial.getPorts();
            console.log("🧩 Tillgängliga portar:", ports);

            ports.forEach(async (p: any, i: number) => {
                try {
                    const info = p.getInfo?.();
                    console.log(`Port [${i}] info:`, info);
                } catch {
                    console.log(`Port [${i}] har ingen info`);
                }
            });
        }

        listPorts();
    }, []);

    /** ===== Lyssna på OS-nivåns connect/disconnect events (om stöd finns) ===== */
    useEffect(() => {
        const navSerial = (navigator as any).serial;
        if (!navSerial?.addEventListener) return;
        const onConnect = async (event: any) => {
            console.log("🔌 [event] serial.connect:", event?.port || "(okänd)");
            try {
                // Om vi inte redan har en port — försök ansluta den som anslöts
                if (!portRef.current && event?.port) {
                    await connectToPort(event.port);
                }
            } catch (err) {
                console.error("💥 Fel i onConnect:", err);
            }
        };
        const onDisconnect = async (event: any) => {
            console.warn(
                "🔌 [event] serial.disconnect:",
                event?.port || "(okänd)"
            );
            await disconnectSerial();
        };

        navSerial.addEventListener("connect", onConnect);
        navSerial.addEventListener("disconnect", onDisconnect);

        return () => {
            try {
                navSerial.removeEventListener("connect", onConnect);
                navSerial.removeEventListener("disconnect", onDisconnect);
            } catch {
                /* ignore */
            }
        };
    }, []);

    /** ===== Backend heartbeat ===== */
    useEffect(() => {
        if (!isStationActive) return;

        const checkHeartbeat = async () => {
            const token = localStorage.getItem("stationToken");
            if (!token) return;

            try {
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

                if (res.ok) {
                    if (isOfflineRef.current)
                        console.log("💚 Station online igen!");
                    setIsOffline(false);
                    isOfflineRef.current = false;
                } else {
                    console.warn("🚨 Station offline (felstatus):", res.status);
                    setIsOffline(true);
                    isOfflineRef.current = true;
                }
            } catch (err) {
                console.error("❌ Nätverksfel i heartbeat:", err);
                setIsOffline(true);
                isOfflineRef.current = true;
            }
        };

        checkHeartbeat();
        const interval = setInterval(checkHeartbeat, 10000);
        return () => clearInterval(interval);
    }, [isStationActive]);

    /** ===== Serial heartbeat (kollar portläge; försöker återansluta) ===== */
    useEffect(() => {
        if (!isStationActive) return;

        const checkSerialHeartbeat = async () => {
            try {
                const port = portRef.current;
                if (!port) {
                    console.warn("⚠️ Ingen port – söker efter tidigare...");
                    const ports = await (navigator as any).serial.getPorts();
                    /*  if (ports.length > 0) {
                        console.log("✅ Port hittad – ansluter igen");
                        await connectToPort(ports[4]);
                        setSerialHeartbeat("ok");
                        serialHeartbeatRef.current = "ok";
                    } else {
                        console.warn("❌ Ingen kortläsare hittad");
                        setSerialHeartbeat("error");
                        serialHeartbeatRef.current = "error";
                    } */

                    if (ports.length > 0) {
                        console.log("✅ Tillgängliga portar:", ports);

                        const validPort = ports.find((p: any) => {
                            const info = p.getInfo?.();
                            console.log("🔧 Port info:", info);
                            // Ändra till din kortläsare
                            return (
                                info?.usbVendorId === 1659 &&
                                info?.usbProductId === 8963
                            );
                        });

                        if (validPort) {
                            console.log("✅ Rätt port hittad – ansluter igen");
                            await connectToPort(validPort);
                            setSerialHeartbeat("ok");
                            serialHeartbeatRef.current = "ok";
                        } else {
                            console.warn("❌ Ingen giltig kortläsare hittad");
                            setSerialHeartbeat("error");
                            serialHeartbeatRef.current = "error";
                        }
                    } else {
                        console.warn("❌ Ingen port hittad");
                        setSerialHeartbeat("error");
                        serialHeartbeatRef.current = "error";
                    }
                    return;
                }

                if (!port.readable || !port.writable) {
                    console.warn(
                        "⚠️ Port läs/skriv saknas – försöker öppna igen"
                    );
                    setSerialHeartbeat("error");
                    serialHeartbeatRef.current = "error";
                    await disconnectSerial();
                    const ports = await (navigator as any).serial.getPorts();
                    if (ports.length > 0) await connectToPort(ports[4]);
                } else {
                    if (serialHeartbeatRef.current !== "ok") {
                        console.log("💚 Kortläsare återansluten");
                    }
                    setSerialHeartbeat("ok");
                    serialHeartbeatRef.current = "ok";
                }
            } catch (err) {
                console.error("💥 Fel i checkSerialHeartbeat:", err);
                setSerialHeartbeat("error");
                serialHeartbeatRef.current = "error";
            }
        };

        checkSerialHeartbeat();
        const interval = setInterval(checkSerialHeartbeat, 5000);
        return () => clearInterval(interval);
    }, [isStationActive]);

    /** ===== Anslut till port ===== */
    const connectToPort = async (selectedPort: SerialPort) => {
        console.log("🔌 connectToPort() anropad:", selectedPort);
        try {
            await selectedPort.open({ baudRate: 9600 });
            console.log("✅ Port öppnad (9600 baud)");
            portRef.current = selectedPort;
            setSerialHeartbeat("ok");
            serialHeartbeatRef.current = "ok";

            // En del drivrutiner stödjer ondisconnect direkt på portobjektet
            (selectedPort as any).ondisconnect = async () => {
                console.warn("⚠️ Porten kopplades bort (ondisconnect)");
                await disconnectSerial();
            };

            // Starta läsningen
            startSerialReading(selectedPort).catch((err) =>
                console.error("💥 startSerialReading() toppnivåfel:", err)
            );
        } catch (err) {
            console.error("❌ Kunde inte öppna port:", err);
            setSerialHeartbeat("error");
            serialHeartbeatRef.current = "error";
        }
    };

    /** ===== Koppla från port ===== */
    const disconnectSerial = async () => {
        console.log("🔌 Stänger port...");
        try {
            if (readerRef.current) {
                await readerRef.current.cancel();
                readerRef.current = null;
            }
            if (portRef.current) {
                try {
                    await portRef.current.close();
                } catch (e) {
                    // vissa implementationer kastar redan-stängd fel
                }
                console.log("✅ Port stängd");
                portRef.current = null;
            }
        } catch (err) {
            console.error("⚠️ Fel vid portstängning:", err);
        }
        setSerialHeartbeat("error");
        serialHeartbeatRef.current = "error";
    };

    /** ===== Läs från port (kontinuerlig loop) ===== */
    const startSerialReading = async (serialPort: SerialPort) => {
        console.log("🟦 startSerialReading() initieras...");
        const DEBOUNCE_MS = 2000;
        let buffer = "";
        let lastUID = "";
        let lastScanTime = 0;

        try {
            const reader = serialPort.readable?.getReader();
            if (!reader) {
                console.warn("⚠️ Ingen readable stream tillgänglig.");
                return;
            }
            readerRef.current = reader;
            console.log("🟩 Börjar läsa data från porten...");

            while (true) {
                if (isOfflineRef.current) {
                    console.warn(
                        "🚫 Backend offline – stoppar läsloop tillfälligt"
                    );
                    break;
                }

                try {
                    const { value, done } = await reader.read();
                    if (done) {
                        console.warn("🔚 Läsning avslutad (done=true)");
                        break;
                    }

                    if (value) {
                        const decoded = new TextDecoder().decode(value).trim();
                        console.log("📥 Mottaget data:", decoded);
                        buffer += decoded;

                        const uidMatch = buffer.match(/([0-9A-Fa-f]{8,14})/);
                        if (uidMatch) {
                            const cleanUID = uidMatch[1].toUpperCase();
                            console.log("💳 UID hittat:", cleanUID);

                            const now = Date.now();
                            if (
                                cleanUID === lastUID &&
                                now - lastScanTime < DEBOUNCE_MS
                            ) {
                                console.log("⏱️ Dubblett UID – ignoreras");
                                buffer = "";
                                continue;
                            }

                            lastUID = cleanUID;
                            lastScanTime = now;

                            if (
                                !isOfflineRef.current &&
                                serialHeartbeatRef.current === "ok"
                            ) {
                                console.log(
                                    "📡 Skickar UID till backend:",
                                    cleanUID
                                );
                                // Kör asynkront – blockera inte läsloopen
                                submitAttendance(cleanUID).catch((err) =>
                                    console.error(
                                        "❌ submitAttendance fel:",
                                        err
                                    )
                                );
                            } else {
                                console.warn(
                                    "⚠️ Offline eller portfel – UID ej skickad"
                                );
                            }

                            buffer = "";
                        }

                        if (buffer.length > 100) {
                            console.warn("🧹 Buffern för lång – rensar");
                            buffer = "";
                        }
                    }
                } catch (readError: any) {
                    console.error("💥 Fel i reader.read():", readError);
                    // “device lost”/kabelfel → bryt loopen; heartbeat kommer försöka återansluta
                    break;
                }
            }
        } catch (err) {
            console.error("💥 startSerialReading() fel:", err);
        } finally {
            console.log("🔚 Avslutar startSerialReading()");
            readerRef.current = null;
        }
    };

    /** ===== Registrera station ===== */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("🟦 handleSubmit() startar...");

        if (!stationId.trim() || !secret.trim()) {
            setMessage("Både Station ID och Secret Key krävs");
            setIsSuccess(false);
            return;
        }

        let selectedPort: SerialPort | undefined;
        try {
            console.log("📡 Begär portåtkomst...");
            selectedPort = await (navigator as any).serial.requestPort();
            console.log("✅ Port vald:", selectedPort);
        } catch (err) {
            console.error("❌ Användaren avbröt portval:", err);
            return;
        }

        setIsLoading(true);
        setMessage("Registrerar station...");

        try {
            console.log("📨 Skickar registrering till backend...");
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/station/register`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        stationId: stationId.trim(),
                        secret: secret.trim(),
                    }),
                }
            );

            console.log("📥 Backend-svar status:", response.status);
            const data = await response.json().catch(() => ({}));
            console.log("📦 Backend-svar data:", data);

            if (response.ok && data.success) {
                if (data.token) {
                    console.log("💾 Sparar token i localStorage");
                    localStorage.setItem("stationToken", data.token);
                }

                setRegistrationResult(data);
                setIsStationActive(true);
                setMessage("");
                setIsSuccess(true);

                if (selectedPort) {
                    console.log("🔌 Ansluter vald port...");
                    await connectToPort(selectedPort);
                }

                // Kör initial heartbeat direkt
                try {
                    console.log("💓 Kör initial heartbeat direkt...");
                    const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/station/heartbeat`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${data.token}`,
                            },
                        }
                    );
                    if (res.ok) {
                        console.log("💚 Första heartbeat OK – station online");
                        setIsOffline(false);
                        isOfflineRef.current = false;
                    } else {
                        console.warn(
                            "💛 Första heartbeat misslyckades:",
                            res.status
                        );
                    }
                } catch (hbErr) {
                    console.error("❤️‍🔥 Heartbeat fel:", hbErr);
                }
            } else {
                console.error("❌ Fel vid registrering:", data?.message);
                setMessage(data?.message || "Fel vid registrering av station");
                setIsSuccess(false);
            }
        } catch (error) {
            console.error("🔥 Nätverksfel vid registrering:", error);
            setMessage("Nätverksfel vid registrering av station");
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
            console.log("🟩 handleSubmit() klar");
        }
    };

    /** ===== Närvaro (UID) ===== */
    const submitAttendance = async (uid: string) => {
        console.log("📤 submitAttendance() STARTAR med UID:", uid);

        if (!uid?.trim()) {
            console.warn("⚠️ UID saknas");
            setAttendanceMessage("UID krävs");
            return;
        }
        if (isOfflineRef.current) {
            console.warn("🚫 Station offline, avbryter attendance");
            setAttendanceMessage(
                "Station offline — kan inte registrera närvaro"
            );
            return;
        }
        if (serialHeartbeatRef.current === "error") {
            console.warn("🚫 Kortläsare frånkopplad");
            setAttendanceMessage(
                "Kortläsare frånkopplad — kan inte registrera närvaro"
            );
            return;
        }
        if (isProcessingRef.current) {
            console.log("⏳ Pågående inläsning – avvaktar");
            return;
        }

        isProcessingRef.current = true;
        setAttendanceLoading(true);
        setAttendanceMessage("");

        try {
            const token = localStorage.getItem("stationToken");
            if (!token) {
                console.error("❌ Ingen token hittad – station ej registrerad");
                setAttendanceMessage("Station inte inloggad - registrera igen");
                return;
            }

            const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/attendance/attendance-uid`;
            console.log("📡 POST till:", url);
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ uid: uid.trim() }),
            });

            console.log("📥 Attendance-svar status:", response.status);

            if (response.status === 401) {
                localStorage.removeItem("stationToken");
                setIsStationActive(false);
                setMessage("Sessionen har gått ut – registrera stationen igen");
                return;
            }

            const data = await response.json().catch(() => ({}));
            console.log("📦 Attendance JSON:", data);

            if (response.ok && data.success) {
                setAttendanceMessage(`✅ ${data.message}`);
                const direction: "in" | "out" = data.attendance?.checkOutTime
                    ? "out"
                    : "in";

                setLastSuccess({
                    uid: uid.trim(),
                    visitorName: data.attendance?.visitorName || "Unknown",
                    direction,
                });
                setAttendanceData({
                    uid: "",
                    visitorName: "",
                    phoneNumber: "",
                    type: "personal",
                });

                setTimeout(() => setLastSuccess(null), 3000);
                setTimeout(() => setAttendanceMessage(""), 3000);
            } else {
                if (
                    data?.message &&
                    String(data.message).includes("Ny besökare")
                ) {
                    setNewPersonUID(uid.trim());
                    setShowNewPersonModal(true);
                    setAttendanceMessage("");
                } else {
                    setAttendanceMessage(
                        data?.message || "Fel vid närvaroregistrering"
                    );
                }
            }
        } catch (error) {
            console.error("🔥 Nätverksfel vid närvaroregistrering:", error);
            setAttendanceMessage("Nätverksfel vid närvaroregistrering");
        } finally {
            setAttendanceLoading(false);
            setTimeout(() => {
                isProcessingRef.current = false;
            }, 1000);
            console.log("🟩 submitAttendance() klar");
        }
    };

    const handleAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitAttendance(attendanceData.uid);
    };

    /** ===== Ny person (modal) ===== */
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

            const data = await response.json().catch(() => ({}));

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

                setTimeout(() => setAttendanceMessage(""), 3000);
            } else {
                setAttendanceMessage(
                    data?.message || "Fel vid registrering av ny person"
                );
            }
        } catch (error) {
            console.error(
                "🔥 Nätverksfel vid registrering av ny person:",
                error
            );
            setAttendanceMessage("Nätverksfel vid registrering av ny person");
        } finally {
            setAttendanceLoading(false);
        }
    };

    /** ===== Reset / Logga ut station ===== */
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

    /** ======= UI ======= */
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

                            {message && (
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
