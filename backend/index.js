import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";

const MONGODB_URI = "mongodb://serima:serima@mongodb.serima.se:27017";
const DB_NAME = "stations_db";
const COMPANY_ID = "3fe1097c-b663-48e6-953d-19cfe9f7af8a";

async function seed() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);

        const buildingsCol = db.collection("buildings");
        const stationsCol = db.collection("stations");
        const visitorsCol = db.collection("visitors");
        const attendanceCol = db.collection("attendance");

        console.log("✅ Connected to MongoDB");

        // --- Hämta redan skapade data (så vi återanvänder)
        const buildings = await buildingsCol
            .find({ companyId: COMPANY_ID })
            .toArray();
        const stations = await stationsCol
            .find({ companyId: COMPANY_ID })
            .toArray();
        const visitors = await visitorsCol
            .find({ companyId: COMPANY_ID })
            .toArray();

        if (!buildings.length || !stations.length || !visitors.length) {
            console.error(
                "⚠️ Du måste först ha buildings, stations och visitors skapade!"
            );
            return;
        }

        console.log("🕒 Skapar 100,000 attendance i batchar...");

        const total = 100000;
        const batchSize = 10000;
        let inserted = 0;

        for (let i = 0; i < total; i += batchSize) {
            const batch = Array.from({ length: batchSize }).map(() => {
                const visitor =
                    visitors[Math.floor(Math.random() * visitors.length)];
                const station =
                    stations[Math.floor(Math.random() * stations.length)];
                const building =
                    buildings[Math.floor(Math.random() * buildings.length)];
                return {
                    companyId: COMPANY_ID,
                    attendanceId: randomUUID(),
                    visitorId: visitor.visitorId,
                    visitorName: visitor.visitorName,
                    uid: visitor.uid,
                    stationId: station.stationId,
                    buildingId: building.buildingId,
                    checkInTime: new Date(),
                    checkOutTime: new Date(),
                    timestamp: new Date(),
                };
            });

            await attendanceCol.insertMany(batch);
            inserted += batch.length;
            console.log(`✅ Inserted ${inserted}/${total}`);
        }

        console.log("🎉 Done! 100,000 attendance inserted successfully.");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
        console.log("🔒 Connection closed");
    }
}

seed();
