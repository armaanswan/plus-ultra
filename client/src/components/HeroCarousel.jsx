import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Info, ChevronLeft, ChevronRight, Clock, Pause } from 'lucide-react';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';
const BACKEND_URL = 'http://localhost:3001';

export default function HeroCarousel({ items, onPlay, onInfo }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [detailsCache, setDetailsCache] = useState({});
    const pauseMode = localStorage.getItem('settings_carouselPauseMode') || 'anywhere';

    // Reset index when items change
    useEffect(() => {
        setCurrentIndex(0);
    }, [items]);

    // Fetch details for ALL items (for smooth transitions)
    useEffect(() => {
        if (!items || items.length === 0) return;

        async function fetchAllDetails() {
            const cache = {};
            await Promise.all(items.map(async (item) => {
                try {
                    const res = await axios.get(`${BACKEND_URL}/api/details/${item.media_type}/${item.id}`);
                    cache[item.id] = res.data;
                } catch (err) { console.error(err); }
            }));
            setDetailsCache(cache);
        }
        fetchAllDetails();
    }, [items]);

    const handleNext = (e) => {
        if (e) e.stopPropagation();
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setTimeout(() => setIsAnimating(false), 500);
    };

    const handlePrev = (e) => {
        if (e) e.stopPropagation();
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
        setTimeout(() => setIsAnimating(false), 500);
    };

    // Auto-slide
    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            handleNext();
        }, 6000);
        return () => clearInterval(timer);
    }, [currentIndex, items.length, isAnimating, isPaused]);

    if (!items || items.length === 0) return null;

    return (
        <header
            className="relative w-full h-[65vh] group overflow-hidden shrink-0 cursor-pointer"
            onMouseEnter={() => pauseMode === 'anywhere' && setIsPaused(true)}
            onMouseLeave={() => pauseMode === 'anywhere' && setIsPaused(false)}
            onClick={() => onInfo && onInfo(items[currentIndex])}
        >
            <style>{`
                @keyframes carousel-progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .progress-bar {
                    animation: carousel-progress 6s linear;
                }
            `}</style>
            {/* Background Image & Gradients */}
            <div className="absolute inset-0 bg-[#09090b]">
                {items.map((img, idx) => (
                    <img
                        key={img.id}
                        src={img.backdrop_path ? `${TMDB_IMAGE_BASE}${img.backdrop_path}` : ''}
                        alt={img.title || img.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-70' : 'opacity-0'}`}
                    />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/20 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/40 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-8 lg:p-12 w-full max-w-5xl z-10 flex flex-col items-start pb-12">
                <div className="relative w-full">
                    {items.map((item, idx) => {
                        const isActive = idx === currentIndex;
                        const details = detailsCache[item.id];

                        // Metadata Logic
                        const title = item.title || item.name;
                        const year = (item.release_date || item.first_air_date || '????').split('-')[0];
                        const type = item.media_type === 'tv' ? 'TV Series' : 'Movie';
                        const status = details?.status || 'Unknown';
                        const genre = details?.genres?.[1]?.name || details?.genres?.[0]?.name;
                        const statusColor = (status === 'Ended' || status === 'Released')
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400';

                        return (
                            <div
                                key={item.id}
                                className={`flex flex-col items-start transition-opacity duration-700 ease-in-out w-full ${isActive ? 'opacity-100 relative z-10' : 'opacity-0 absolute bottom-0 left-0 z-0 pointer-events-none'}`}
                            >
                                <h1 className="text-3xl lg:text-6xl font-bold text-white mb-3 leading-none tracking-tight drop-shadow-2xl">
                                    {title}
                                </h1>

                                {/* Metadata Row */}
                                <div className="flex flex-col gap-3 mb-6 drop-shadow-md">
                                    <div className="flex items-center gap-4">
                                        {/* Rating */}
                                        <div className="flex items-center gap-2 text-[#46d369] font-bold text-lg">
                                            <span>{item.vote_average?.toFixed(1)}/10</span>
                                        </div>
                                        {/* Status */}
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${statusColor}`}>
                                            <Clock className="w-3 h-3" />
                                            {status}
                                        </div>
                                    </div>

                                    {/* Info Line */}
                                    <div className="flex items-center gap-3 text-gray-200 text-sm font-medium">
                                        <span className="font-bold text-white">{year}</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="font-bold text-white">{type}</span>
                                        {genre && <span className="text-gray-500">•</span>}
                                        {genre && <span className="font-bold text-white">{genre}</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6"
                                    onMouseEnter={() => pauseMode === 'buttons' && setIsPaused(true)}
                                    onMouseLeave={() => pauseMode === 'buttons' && setIsPaused(false)}
                                >
                                    <div className="flex gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPlay(item);
                                            }}
                                            className="bg-[#E50914] hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/30 hover:scale-[1.02] cursor-pointer"
                                        >
                                            <Play className="w-5 h-5 fill-current" /> Play Now
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onInfo && onInfo(item);
                                            }}
                                            className="bg-white/10 backdrop-blur-md border border-white/10 text-white px-8 py-3 rounded-lg font-bold hover:bg-white/20 transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            <Info className="w-4 h-4" /> More Info
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePrev}
                                            className="w-10 h-10 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-md cursor-pointer"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            className="w-10 h-10 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-md cursor-pointer"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Indicators */}
                <div className="flex items-center gap-2 mt-8 h-1">
                    {items.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 rounded-full transition-all duration-300 relative overflow-hidden ${idx === currentIndex ? 'w-8 bg-white/20' : 'w-4 bg-white/20'}`}
                        >
                            {idx === currentIndex && (
                                <div
                                    className="absolute inset-0 bg-[#E50914] progress-bar"
                                    style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Pause Indicator */}
            {isPaused && (
                <div className="absolute bottom-8 right-8 z-50 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/80 text-xs font-bold animate-in fade-in">
                    <Pause className="w-3 h-3 fill-current" />
                    <span>PAUSED</span>
                </div>
            )}
        </header>
    );
}