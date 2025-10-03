"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function AdminRegisterPage() {
    const [formData, setFormData] = useState({
        registrationKey: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
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

        if (!formData.name.trim()) {
            setMessage("Namn krävs");
            setIsError(true);
            return false;
        }

        if (!formData.email.trim()) {
            setMessage("E-post krävs");
            setIsError(true);
            return false;
        }

        if (formData.password.length < 6) {
            setMessage("Lösenord måste vara minst 6 tecken");
            setIsError(true);
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setMessage("Lösenorden matchar inte");
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

        // Namn validering (endast bokstäver och mellanslag)
        const nameRegex = /^[a-zA-ZåäöÅÄÖ\s]+$/;
        if (!nameRegex.test(formData.name.trim())) {
            setMessage("Namnet får endast innehålla bokstäver och mellanslag");
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
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/registeradmin`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        registrationKey: formData.registrationKey,
                        name: formData.name,
                        email: formData.email,
                        password: formData.password,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                setMessage(
                    "Admin registrerad framgångsrikt! Omdirigerar till inloggning..."
                );
                setIsError(false);

                // Rensa formuläret
                setFormData({
                    registrationKey: "",
                    name: "",
                    email: "",
                    password: "",
                    confirmPassword: "",
                });

                // Omdirigera till inloggningssidan efter 2 sekunder
                setTimeout(() => {
                    window.location.href = "/login";
                }, 2000);
            } else {
                setMessage(data.message || "Ett fel uppstod vid registrering");
                console.error("Registration error:", data.message);
                setIsError(true);
            }
        } catch (error) {
            console.error("Registration error:", error);
            console.log(error);
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
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Registrera Admin
                    </h1>
                    <p className="text-gray-600">
                        Skapa ett nytt administratörskonto
                    </p>
                </div>

                {/* Registreringsformulär */}
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
                                placeholder="Ange företagets registreringsnyckel"
                                value={formData.registrationKey}
                                onChange={handleInputChange}
                                className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="name"
                                className="text-sm font-medium text-gray-700"
                            >
                                Fullständigt Namn
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="Ange ditt fullständiga namn"
                                value={formData.name}
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
                                placeholder="Minst 6 tecken"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="confirmPassword"
                                className="text-sm font-medium text-gray-700"
                            >
                                Bekräfta Lösenord
                            </Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="Upprepa lösenordet"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                                required
                                minLength={6}
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
                            {loading ? "Registrerar..." : "Registrera Admin"}
                        </Button>
                    </form>

                    {/* Navigation Links */}
                    <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
                        <p className="text-sm text-gray-600">
                            Har du redan ett konto?{" "}
                            <button
                                onClick={() =>
                                    (window.location.href = "/login")
                                }
                                className="text-black font-medium hover:underline"
                            >
                                Logga in här
                            </button>
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
