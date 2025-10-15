interface Building {
    buildingId: string;
    buildingName: string;
    address?: string;
}

interface Station {
    stationId: string;
    stationName: string;
    buildingId?: string;
}

interface Attendance {
    attendanceId: string;
    buildingId?: string;
    stationId?: string;
    visitorId: string;
    checkInTime?: string;
    checkOutTime?: string;
}

export const BuildingsTable = ({
    buildings,
    stations,
    attendance,
    isAdmin,
}: {
    buildings: Building[];
    stations: Station[];
    attendance: Attendance[];
    isAdmin: boolean;
}) => {
    return (
        <section className="mt-8 bg-white rounded-xl p-6 shadow-sm dark:bg-primary/10">
            <h2 className="mb-4 text-2xl font-bold text-background-dark dark:text-background-light">
                Buildings Overview
            </h2>
            <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left">
                    <thead className="text-sm font-semibold text-background-dark/80 dark:text-background-light/80">
                        <tr>
                            <th className="p-4">Building Name</th>
                            <th className="p-4">Address</th>
                            <th className="p-4">Occupancy</th>
                            {isAdmin && (
                                <th className="p-4">Active Stations</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                        {buildings.length > 0 ? (
                            buildings.map((building, index) => {
                                const buildingStations = stations.filter(
                                    (s) => s.buildingId === building.buildingId
                                );

                                const buildingAttendance = attendance.filter(
                                    (a) =>
                                        a.buildingId === building.buildingId &&
                                        !a.checkOutTime
                                );

                                const buildingOccupancy =
                                    buildingAttendance.length;
                                const capacity = 100;

                                return (
                                    <tr
                                        key={building.buildingId}
                                        className="text-sm text-background-dark dark:text-background-light"
                                    >
                                        <td className="p-4">
                                            {building.buildingName}
                                        </td>
                                        <td className="p-4">
                                            {building.address || "No address"}
                                        </td>
                                        <td className="p-4">
                                            {buildingOccupancy} / {capacity}
                                        </td>
                                        {isAdmin && (
                                            <td className="p-4">
                                                {buildingStations.length} / 20
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="text-center py-6 text-background-dark/60 dark:text-background-light/60"
                                >
                                    No buildings found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
