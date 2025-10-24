interface Building {
    buildingId: string;
    buildingName: string;
    stationCount: number;
    activeVisitorsCount: number;
    activeVisitorNames?: string[];
    createdAt?: string;
}

export const BuildingsTable = ({
    buildings,
    isAdmin,
}: {
    buildings: Building[];
    isAdmin: boolean;
}) => {
    return (
        <section className="mt-8 bg-white rounded-xl p-6 shadow-sm dark:bg-primary/10">
            <h2 className="mb-4 text-2xl font-bold text-background-dark dark:text-background-light">
                🏢 Latest Buildings
            </h2>
            <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left">
                    <thead className="text-sm font-semibold text-background-dark/80 dark:text-background-light/80">
                        <tr>
                            <th className="p-4">Building Name</th>
                            <th className="p-4">Stations</th>
                            <th className="p-4">Active Visitors</th>
                            <th className="p-4">Visitor Names</th>
                            <th className="p-4">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                        {buildings.length > 0 ? (
                            buildings.map((b) => (
                                <tr
                                    key={b.buildingId}
                                    className="text-sm text-background-dark dark:text-background-light"
                                >
                                    <td className="p-4 font-medium">
                                        {b.buildingName}
                                    </td>
                                    <td className="p-4">{b.stationCount}</td>
                                    <td className="p-4">
                                        {b.activeVisitorsCount}
                                    </td>
                                    <td className="p-4">
                                        {b.activeVisitorNames?.length
                                            ? b.activeVisitorNames.join(", ")
                                            : "—"}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {b.createdAt
                                            ? new Date(
                                                  b.createdAt
                                              ).toLocaleString("sv-SE", {
                                                  dateStyle: "short",
                                                  timeStyle: "short",
                                              })
                                            : "—"}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={5}
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
