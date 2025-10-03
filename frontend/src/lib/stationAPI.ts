// Station API helper functions
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://172.20.20.47:5000/api";

// Get permanent token from localStorage
export function getPermanentToken(): string | null {
    if (typeof window !== "undefined") {
        return localStorage.getItem("permanentToken");
    }
    return null;
}

// Get station info from localStorage
export function getStationInfo() {
    if (typeof window !== "undefined") {
        return {
            stationId: localStorage.getItem("stationId"),
            companyId: localStorage.getItem("companyId"),
            buildingName: localStorage.getItem("buildingName"),
            permanentToken: localStorage.getItem("permanentToken"),
            RegistrationKey: localStorage.getItem("RegistrationKey"),
        };
    }
    return null;
}

// Check if station is registered and has a permanent token
export function isStationRegistered(): boolean {
    const token = getPermanentToken();
    const stationId =
        typeof window !== "undefined"
            ? localStorage.getItem("stationId")
            : null;
    return !!(token && stationId);
}

// Create authorized headers for API requests
export function getAuthHeaders(): Record<string, string> {
    const token = getPermanentToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

// Station API endpoints with authentication
export const stationAPI = {
    // Get station information
    async getStationInfo() {
        const response = await fetch(`${API_BASE_URL}/api/station/me`, {
            method: "GET",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // Send heartbeat
    async sendHeartbeat() {
        const response = await fetch(`${API_BASE_URL}/api/station/heartbeat`, {
            method: "POST",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // Update station status
    async updateStatus(status: "active" | "maintenance" | "offline") {
        const response = await fetch(`${API_BASE_URL}/station/status`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },
};

// Attendance API endpoints
export const attendanceAPI = {
    // Check card and register attendance
    async checkCard(cardNumber: string) {
        const stationInfo = getStationInfo();
        const response = await fetch(`${API_BASE_URL}/api/attendance`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                cardNumber,
                stationId: stationInfo?.stationId,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // Register new employee
    async registerEmployee(data: {
        cardNumber: string;
        name: string;
        personalId: string;
    }) {
        const stationInfo = getStationInfo();
        const response = await fetch(
            `${API_BASE_URL}/api/attendance/register-employee`,
            {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...data,
                    stationId: stationInfo?.stationId,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // Register new visitor/company
    async registerVisitor(data: {
        cardNumber: string;
        companyName: string;
        cardId: string;
        contactPerson: string;
        email: string;
        phone?: string;
    }) {
        const stationInfo = getStationInfo();
        const response = await fetch(
            `${API_BASE_URL}/api/attendance/register-visitor`,
            {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...data,
                    stationId: stationInfo?.stationId,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // Get attendance records
    async getAttendanceRecords(limit = 50, skip = 0) {
        const stationInfo = getStationInfo();
        const response = await fetch(
            `${API_BASE_URL}/api/attendance/records/${stationInfo?.stationId}?limit=${limit}&skip=${skip}`,
            {
                method: "GET",
                headers: getAuthHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },
};

// Live attendance API endpoints (no authentication required)
export const liveAPI = {
    // Get live building attendance overview
    async getBuildingAttendance(
        buildingName: string,
        since?: string,
        companyId?: string
    ) {
        const queryParams = new URLSearchParams();
        if (since) queryParams.append("since", since);
        if (companyId) queryParams.append("companyId", companyId);

        const queryString = queryParams.toString();
        const response = await fetch(
            `${API_BASE_URL}/api/attendance/live/building/${encodeURIComponent(
                buildingName
            )}${queryString ? `?${queryString}` : ""}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // Get live activity feed for building
    async getActivityFeed(
        buildingName: string,
        since?: string,
        limit = 20,
        companyId?: string
    ) {
        const queryParams = new URLSearchParams();
        if (since) queryParams.append("since", since);
        queryParams.append("limit", limit.toString());
        if (companyId) queryParams.append("companyId", companyId);

        const response = await fetch(
            `${API_BASE_URL}/api/attendance/live/activity/${encodeURIComponent(
                buildingName
            )}?${queryParams}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },
};

// Clear station data (for logout/reset)
export function clearStationData() {
    if (typeof window !== "undefined") {
        localStorage.removeItem("stationId");
        localStorage.removeItem("companyId");
        localStorage.removeItem("buildingName");
        localStorage.removeItem("permanentToken");
    }
}
