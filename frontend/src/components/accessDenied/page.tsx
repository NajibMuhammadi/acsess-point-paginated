import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
function AccessDenied() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="w-full max-w-md shadow-xl border-0 rounded-3xl">
                <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Åtkomst nekad</h1>
                    <p className="text-gray-600 mb-6">
                        Du måste logga in för att komma åt admin dashboard
                    </p>
                    <Button
                        onClick={() => (window.location.href = "/login")}
                        className="w-full bg-black hover:bg-gray-800 text-white rounded-2xl py-3"
                    >
                        Logga in
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default AccessDenied;
