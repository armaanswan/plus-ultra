import { Search, SlidersHorizontal } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSettings }) {
    return (
        <nav className="w-full h-16 bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center gap-2 font-medium text-[33px] tracking-tighter text-textMain cursor-pointer" style={{ fontFamily: 'Apfel Grotezk, sans-serif' }}>
                +ultra
            </div>

            <div className="hidden md:flex items-center gap-6">
                {['Home', 'Anime', 'My List', 'Watched'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase().replace(' ', ''))}
                        className={`text-sm transition-colors ${activeTab === tab.toLowerCase().replace(' ', '')
                            ? 'py-1 border-b-2 font-semibold nav-active cursor-pointer'
                            : 'pt-1 pb-1.5 text-textMuted hover:text-textMain font-medium cursor-pointer'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 max-w-xl relative flex items-center mx-8">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search titles, people, or #tags"
                        className="w-full bg-surfaceHighlight border border-border rounded-lg py-2 pl-10 pr-12 text-sm text-textMain focus:outline-none focus:ring-1 focus:ring-textMuted transition-all placeholder:text-textMuted/60 cursor-pointer focus:cursor-text"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 border border-border bg-surfaceHighlight rounded px-1.5 py-0.5 text-[10px] font-bold text-textMuted pointer-events-none">/</div>
                </div>
            </div>

            <button onClick={onOpenSettings} className="p-2 text-textMain hover:text-primary transition-colors cursor-pointer">
                <SlidersHorizontal className="w-6 h-6" />
            </button>
        </nav>
    );
}
