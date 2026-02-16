import React from 'react';

export default function SplashScreen() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090b] text-white select-none">
            <div className="relative flex flex-col items-center">
                {/* Logo Animation */}
                <div className="text-6xl md:text-8xl font-black tracking-tighter mb-8 animate-in fade-in zoom-in duration-500" style={{ fontFamily: 'Apfel Grotezk, sans-serif' }}>
                    +ultra
                </div>

                {/* Loading Indicator */}
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#E50914] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-3 h-3 bg-[#E50914] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-[#E50914] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
            </div>
        </div>
    );
}