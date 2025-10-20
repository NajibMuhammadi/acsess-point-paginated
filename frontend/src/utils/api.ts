export async function apiRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: any,
    token?: string
) {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`,
        {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        }
    );

    const data = await response.json().catch(() => ({}));

    return { ok: response.ok, status: response.status, data };
}
