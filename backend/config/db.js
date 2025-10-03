import { MongoClient } from "mongodb";

let client;
let db;
let companiesCol;

export async function connectDB() {
    try {
        const MONGODB_URI =
            process.env.MONGODB_URI ||
            "mongodb://serima:serima@mongodb.serima.se:27017";
        client = new MongoClient(MONGODB_URI);

        await client.connect();
        console.log("✅ Connected to MongoDB");

        db = client.db("kioskDB");
        companiesCol = db.collection("companies");

        return { db, companiesCol };
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw error;
    }
}

export function getDB() {
    if (!db) {
        throw new Error("Database not connected");
    }
    return db;
}

export function getCompaniesCollection() {
    if (!companiesCol) {
        throw new Error("Database not connected");
    }
    return companiesCol;
}
