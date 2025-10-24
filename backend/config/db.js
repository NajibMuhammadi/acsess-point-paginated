import { MongoClient } from "mongodb";

let client;
let db;

// Collections
let companiesCol;
let usersCol;
let buildingsCol;
let stationsCol;
let visitorsCol;
let attendanceCol;
let alarmsCol;

export async function connectDB() {
    try {
        const MONGODB_URI =
            process.env.MONGODB_URI ||
            "mongodb://serima:serima@mongodb.serima.se:27017";

        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log("✅ Connected to MongoDB");

        db = client.db("stations_db");

        // --- Collections ---
        companiesCol = db.collection("companies");
        usersCol = db.collection("users");
        buildingsCol = db.collection("buildings");
        stationsCol = db.collection("stations");
        visitorsCol = db.collection("visitors");
        attendanceCol = db.collection("attendance");
        alarmsCol = db.collection("alarms");
        usersCol = db.collection("users");

        // --- Indexer ---
        await Promise.all([
            // Companies
            companiesCol.createIndex({ companyName: 1 }),
            companiesCol.createIndex({ registrationKey: 1 }),

            // Users
            usersCol.createIndex({ companyId: 1 }),
            usersCol.createIndex({ email: 1 }),

            // Buildings
            buildingsCol.createIndex({ companyId: 1 }),
            buildingsCol.createIndex({ buildingName: 1 }),

            // Stations
            stationsCol.createIndex({ companyId: 1 }),
            stationsCol.createIndex({ buildingId: 1 }),
            stationsCol.createIndex({ stationName: 1 }),

            // Visitors
            visitorsCol.createIndex({ companyId: 1 }),
            visitorsCol.createIndex({ visitorId: 1 }),
            visitorsCol.createIndex({ uid: 1 }),

            // Attendance
            attendanceCol.createIndex({ companyId: 1 }),
            attendanceCol.createIndex({ visitorId: 1 }),
            attendanceCol.createIndex({ buildingId: 1 }),
            attendanceCol.createIndex({ stationId: 1 }),

            // Alarms
            alarmsCol.createIndex({ companyId: 1 }),
            alarmsCol.createIndex({ buildingId: 1 }),
            alarmsCol.createIndex({ alarmCode: 1 }),

            //Users
            usersCol.createIndex({ companyId: 1 }),
            usersCol.createIndex({ email: 1 }),
        ]);

        return {
            db,
            companiesCol,
            usersCol,
            buildingsCol,
            stationsCol,
            visitorsCol,
            attendanceCol,
            alarmsCol,
            usersCol,
        };
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw error;
    }
}

// --- Helpers ---
export function getDB() {
    if (!db) throw new Error("Database not connected");
    return db;
}

export function getCompaniesCollection() {
    if (!companiesCol) throw new Error("Database not connected");
    return companiesCol;
}

export function getUsersCollection() {
    if (!usersCol) throw new Error("Database not connected");
    return usersCol;
}

export function getBuildingsCollection() {
    if (!buildingsCol) throw new Error("Database not connected");
    return buildingsCol;
}

export function getStationsCollection() {
    if (!stationsCol) throw new Error("Database not connected");
    return stationsCol;
}

export function getVisitorsCollection() {
    if (!visitorsCol) throw new Error("Database not connected");
    return visitorsCol;
}

export function getAttendanceCollection() {
    if (!attendanceCol) throw new Error("Database not connected");
    return attendanceCol;
}

export function getAlarmsCollection() {
    if (!alarmsCol) throw new Error("Database not connected");
    return alarmsCol;
}

export function getUsersColletion() {
    if (!usersCol) throw new Error("Database not connected");
    return usersCol;
}
