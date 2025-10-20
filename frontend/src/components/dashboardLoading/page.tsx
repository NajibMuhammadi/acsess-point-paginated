function LoadingScreen() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            <p>Laddar dashboard...</p>
        </div>
    );
}

export default LoadingScreen;
