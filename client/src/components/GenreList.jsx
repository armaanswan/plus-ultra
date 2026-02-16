import {
    Zap, Smile, Film, Rocket, Ghost, Heart,
    Sparkles, Search,
    Music,
    Compass,
    BookOpen,
    CloudRain,
    Scroll,
    Siren
} from 'lucide-react';

const GENRES = [
    { id: 28, name: 'Action', icon: Zap },
    { id: 12, name: 'Adventure', icon: Compass },
    { id: 16, name: 'Animation', icon: Film },
    { id: 35, name: 'Comedy', icon: Smile },
    { id: 80, name: 'Crime', icon: Siren },
    { id: 9648, name: 'Mystery', icon: Search },
    { id: 18, name: 'Drama', icon: CloudRain },
    { id: 878, name: 'Sci-Fi', icon: Rocket },
    { id: 27, name: 'Horror', icon: Ghost },
    { id: 10749, name: 'Romance', icon: Heart },
    { id: 14, name: 'Fantasy', icon: Sparkles },
    { id: 99, name: 'Documentary', icon: BookOpen },
    { id: 10402, name: 'Music', icon: Music },
    { id: 36, name: 'History', icon: Scroll },
];

export default function GenreList() {
    return (
        <div className="px-8 lg:px-12 py-6 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-3 overflow-x-auto">
                {GENRES.map(genre => (
                    <button
                        key={genre.id}
                        className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 border bg-surface border-border text-textMuted hover:bg-[#E50914] hover:text-white hover:border-[#E50914]"
                    >
                        <genre.icon className="w-4 h-4" />
                        {genre.name}
                    </button>
                ))}
            </div>
        </div>
    );
}