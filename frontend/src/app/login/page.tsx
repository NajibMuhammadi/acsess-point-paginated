"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function AdminLoginPage() {
    const [formData, setFormData] = useState({
        registrationKey: "",
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
        setMessage(""); // Rensa meddelanden när användaren skriver
    };

    const validateForm = () => {
        if (!formData.registrationKey.trim()) {
            setMessage("Registreringsnyckel krävs");
            setIsError(true);
            return false;
        }

        if (!formData.email.trim()) {
            setMessage("E-post krävs");
            setIsError(true);
            return false;
        }

        if (!formData.password) {
            setMessage("Lösenord krävs");
            setIsError(true);
            return false;
        }

        // E-post validering
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setMessage("Ogiltig e-postadress");
            setIsError(true);
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/loginadmin`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                }
            );

            const data = await response.json();

            if (data.success) {
                // ✅ Spara token
                localStorage.setItem("userToken", data.token);

                setMessage(`${data.message} Omdirigerar...`);
                setIsError(false);

                setFormData({
                    registrationKey: "",
                    email: "",
                    password: "",
                });

                // ✅ Dirigera baserat på roll
                setTimeout(() => {
                    if (data.user.role === "admin") {
                        window.location.href = "/";
                    } else if (data.user.role === "firestation") {
                        window.location.href = "/station/dashboard";
                    } else {
                        window.location.href = "/login";
                    }
                }, 1000);
            } else {
                setMessage(data.message || "Ett fel uppstod vid inloggning");
                setIsError(true);
            }
        } catch (err) {
            console.error("Login error:", err);
            setMessage("Kunde inte ansluta till servern");
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4">
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Admin Inloggning
                    </h1>
                    <p className="text-gray-600">
                        Logga in på ditt administratörskonto
                    </p>
                </div>

                {/* Inloggningsformulär */}
                <Card className="bg-white shadow-xl border-0 rounded-3xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label
                                htmlFor="registrationKey"
                                className="text-sm font-medium text-gray-700"
                            >
                                Registreringsnyckel
                            </Label>
                            <Input
                                id="registrationKey"
                                name="registrationKey"
                                type="text"
                                placeholder="Företagets registreringsnyckel"
                                value={formData.registrationKey}
                                onChange={handleInputChange}
                                className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="text-sm font-medium text-gray-700"
                            >
                                E-postadress
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="admin@företag.se"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="password"
                                className="text-sm font-medium text-gray-700"
                            >
                                Lösenord
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Ditt lösenord"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                                required
                            />
                        </div>

                        {/* Meddelande */}
                        {message && (
                            <div
                                className={`p-4 rounded-xl text-center ${
                                    isError
                                        ? "bg-red-50 text-red-700 border border-red-200"
                                        : "bg-green-50 text-green-700 border border-green-200"
                                }`}
                            >
                                {message}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black hover:bg-gray-800 text-white rounded-xl py-3 text-base font-medium transition-colors"
                        >
                            {loading ? "Loggar in..." : "Logga In"}
                        </Button>
                    </form>

                    {/* Navigation Links */}
                    <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
                        <p className="text-sm text-gray-600">
                            Har du inget konto än?{" "}
                            <button
                                onClick={() =>
                                    (window.location.href = "/register")
                                }
                                className="text-black font-medium hover:underline"
                            >
                                Registrera dig här
                            </button>
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
