import axios from "axios";

// Create axios instance with base URL
const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// Admin API calls
export const adminAPI = {
    createCompany: async (data: { companyName: string }) => {
        const response = await api.post("/admin/createcompanyadmin", data);
        return response.data;
    },

    verifyCompany: async (data: { registrationKey: string }) => {
        const response = await api.post("/admin/verifycompany", data);
        return response.data;
    },

    moveStation: async (stationId: string, buildingId: string) => {
        const response = await api.put(`/stations/${stationId}/move`, {
            buildingId,
        });
        return response.data;
    },
};

// Attendance API calls
export const attendanceAPI = {
    recordAttendance: async (data: {
        uid: string;
        userId: string;
        action?: string;
    }) => {
        const response = await api.post("/attendance/attendance", data);
        return response.data;
    },
};

// Building API calls
export const buildingAPI = {
    createBuilding: async (data: {
        name: string;
        address: string;
        description?: string;
        capacity?: string;
    }) => {
        const response = await api.post("/building/create-building", data);
        return response.data;
    },
};

// Station API calls
export const stationAPI = {
    createStation: async (data: {
        name: string;
        location: string;
        buildingId: string;
        type: string;
        description?: string;
    }) => {
        const response = await api.post("/station/create-station", data);
        return response.data;
    },
};

// Visitor API calls
export const visitorAPI = {
    createVisitor: async (data: {
        name: string;
        email?: string;
        phone?: string;
        company?: string;
        purpose: string;
        hostName: string;
        expectedDuration?: string;
        idNumber?: string;
    }) => {
        const response = await api.post("/visitor/create-visitor", data);
        return response.data;
    },
};

export default api;
