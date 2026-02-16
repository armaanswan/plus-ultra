export default function LoadingOverlay({ message }) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-mono animate-pulse text-white">{message}</p>
        </div>
    );
}
