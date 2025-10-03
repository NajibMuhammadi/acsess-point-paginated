"use client";

import { CheckCircle, XCircle } from "lucide-react";

interface BuildingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    building: {
        buildingId: string;
        buildingName: string;
        address: string;
        floors: number;
        area: string;
        isActive: boolean;
    };
    stations: Array<{
        _id: string;
        stationName: string;
        buildingId: string;
        isApproved: boolean;
    }>;
    attendance: Array<{
        userId: string;
        userName: string;
        userEmail?: string;
        userPhone?: string;
        stationId: string;
        buildingId?: string;
        checkInTime: string;
        checkOutTime?: string;
        visitorId?: string;
    }>;
    visitors: Array<{
        visitorId: string;
        visitorName: string;
        type: string;
        phoneNumber: string;
        uid: string;
    }>;
}

export const BuildingDetailsModal = ({
    isOpen,
    onClose,
    building,
    stations,
    attendance,
    visitors,
}: BuildingDetailsModalProps) => {
    // hämta stationer för denna byggnad
    const buildingStations = stations.filter(
        (s) => s.buildingId === building.buildingId
    );

    // Hämta station IDs för denna byggnad
    const stationIds = buildingStations.map((s) => s._id);

    // filtera attendees till denna byggnad (antingen direkt via buildingId eller via stationId)
    const currentAttendees = attendance.filter(
        (a) =>
            !a.checkOutTime &&
            (a.buildingId === building.buildingId ||
                stationIds.includes(a.stationId))
    );

    // Lägg till besökarens namn och typ till varje deltagare om möjligt
    const attendeesWithNames = currentAttendees.map((a) => {
        const visitor = visitors.find((v) => v.visitorId === a.visitorId);
        console.log("Debug visitor data:", visitor?.type);
        return {
            ...a,
            visitorName: visitor ? visitor.visitorName : "Okänd besökare",
            type: visitor ? visitor.type : "Staff",
            phoneNumber: visitor ? visitor.phoneNumber : "Okänd telefonnummer",
            uid: visitor ? visitor.uid : "Okänd uid",
        };
    });

    console.log("Debug building data:", attendeesWithNames);
    console.log("Debug attendance data:", {
        building: building.buildingId,
        totalAttendance: attendance.length,
        buildingStations: buildingStations.length,
        stationIds,
        currentAttendees: currentAttendees.length,
        attendanceFiltered: currentAttendees,
    });

    // Hjälpfunktion för att formatera tid och datum
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Hjälpfunktion för att formatera datum
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {building.buildingName} Details
                    </h3>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">
                                Building Name
                            </label>
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {building.buildingName}
                            </p>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">
                                Address
                            </label>
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {building.address}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">
                                Current Occupancy
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-xl text-primary">
                                    group
                                </span>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {currentAttendees.length} /{" "}
                                    {buildingStations.length} stations
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">
                                Status
                            </label>
                            {buildingStations.length > 0 ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                    <span className="material-symbols-outlined mr-1.5 text-base">
                                        {<CheckCircle className="h-5 w-5" />}
                                    </span>
                                    Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/50 dark:text-red-300">
                                    <span className="material-symbols-outlined mr-1.5 text-base">
                                        {<XCircle className="h-5 w-5" />}
                                    </span>
                                    Inactive
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
                        <h4 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                            Currently Present ({currentAttendees.length})
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/70">
                                    <tr className="text-left text-gray-500 dark:text-gray-400">
                                        <th className="px-4 py-3 font-medium">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Phone Number
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            UID
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Type
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Check-in Time
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {attendeesWithNames.length > 0 ? (
                                        attendeesWithNames.map(
                                            (person, index) => (
                                                <tr
                                                    key={`${person.userId}-${index}`}
                                                    className="text-gray-700 dark:text-gray-300"
                                                >
                                                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                        {person.visitorName ||
                                                            person.userName}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        {person.phoneNumber ||
                                                            "Okänd telefonnummer"}
                                                    </td>
                                                    <td>
                                                        {person.uid ||
                                                            "Okänd UID"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        {person.type ||
                                                            "Okänd type"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        {formatTime(
                                                            person.checkInTime
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                                            >
                                                No people currently inside this
                                                building
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 flex justify-end rounded-b-xl bg-gray-50 p-6 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
