import { useState, useEffect } from 'react';
import { X, Monitor, Play, Download, Moon, Sun, Laptop, Folder, Check } from 'lucide-react';

// Helper for safe storage access
const getStorage = (key, defaultValue) => {
    try {
        const item = localStorage.getItem(key);
        return item !== null ? item : defaultValue;
    } catch (error) {
        return defaultValue;
    }
};

const setStorage = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error("Failed to save setting:", key, error);
    }
};

const formatSeekTime = (seconds) => {
    if (seconds > 60) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    return `${seconds}s`;
};

export default function Settings({ onClose, theme, setTheme, defaultPage, setDefaultPage, initialTab }) {
    const [activeTab, setActiveTab] = useState(initialTab || 'general');

    // Persistent Settings State
    const [seekDuration, setSeekDuration] = useState(() => Number(getStorage('settings_seekDuration', '10')));
    const [superSeekDuration, setSuperSeekDuration] = useState(() => Number(getStorage('settings_superSeekDuration', '60')));
    const [streamQuality, setStreamQuality] = useState(() => getStorage('settings_streamQuality', '1080p'));
    const [downloadQuality, setDownloadQuality] = useState(() => getStorage('settings_downloadQuality', '1080p'));
    const [downloadVideoStrict, setDownloadVideoStrict] = useState(() => getStorage('settings_downloadVideoStrict', 'false') === 'true');
    const [downloadAudioStrict, setDownloadAudioStrict] = useState(() => getStorage('settings_downloadAudioStrict', 'false') === 'true');
    const [audioLang, setAudioLang] = useState(() => getStorage('settings_audioLang', 'dub'));
    const [downloadAudio, setDownloadAudio] = useState(() => getStorage('settings_downloadAudio', 'dub'));
    const [downloadPath, setDownloadPath] = useState(() => getStorage('settings_downloadPath', '/Users/armaanswan/Downloads/PlusUltra'));
    const [downloadSubs, setDownloadSubs] = useState(() => getStorage('settings_downloadSubs', 'true') === 'true');
    const [showSingleSeason, setShowSingleSeason] = useState(() => getStorage('settings_showSingleSeason', 'true') === 'true');
    const [carouselPauseMode, setCarouselPauseMode] = useState(() => getStorage('settings_carouselPauseMode', 'anywhere'));

    const handleBrowse = async () => {
        if ('showDirectoryPicker' in window) {
            try {
                const handle = await window.showDirectoryPicker();
                setDownloadPath(handle.name);
            } catch (err) {
                console.error(err);
            }
        } else {
            alert("Folder selection is not supported in this browser.");
        }
    };

    // Save to LocalStorage on Change
    useEffect(() => {
        setStorage('settings_seekDuration', seekDuration);
        setStorage('settings_superSeekDuration', superSeekDuration);
        setStorage('settings_streamQuality', streamQuality);
        setStorage('settings_downloadQuality', downloadQuality);
        setStorage('settings_downloadVideoStrict', downloadVideoStrict);
        setStorage('settings_downloadAudioStrict', downloadAudioStrict);
        setStorage('settings_audioLang', audioLang);
        setStorage('settings_downloadAudio', downloadAudio);
        setStorage('settings_downloadSubs', downloadSubs);
        setStorage('settings_downloadPath', downloadPath);
        setStorage('settings_showSingleSeason', showSingleSeason);
        setStorage('settings_carouselPauseMode', carouselPauseMode);
    }, [seekDuration, superSeekDuration, streamQuality, downloadQuality, downloadVideoStrict, downloadAudioStrict, audioLang, downloadAudio, downloadSubs, downloadPath, showSingleSeason, carouselPauseMode]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const tabs = [
        { id: 'general', label: 'General', icon: Monitor, desc: 'Appearance & Defaults' },
        { id: 'player', label: 'Playback', icon: Play, desc: 'Seek & Autoplay' },
        { id: 'downloads', label: 'Downloads', icon: Download, desc: 'Quality & Location' },
    ];

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-5xl h-[80vh] bg-surface border border-border rounded-2xl shadow-2xl flex overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-textMuted hover:text-textMain transition-all cursor-pointer select-none"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Sidebar */}
                <div className="w-64 bg-surface border-r border-border p-6 flex flex-col gap-8">
                    <div className="px-2">
                        <h2 className="text-2xl font-bold text-textMain tracking-tight mb-1">Settings</h2>
                        <p className="text-textMuted text-xs font-medium">Manage your preferences</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all group cursor-pointer select-none ${activeTab === tab.id
                                    ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/20'
                                    : 'text-textMuted hover:bg-gray-200 dark:hover:bg-white/10 hover:text-textMain'
                                    }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-textMuted group-hover:text-textMain'}`} />
                                <div className="font-bold text-sm">{tab.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-surface">
                    <div className="p-8 max-w-3xl mx-auto space-y-8">

                        {activeTab === 'general' && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                                <Section title="Appearance" description="Customize how Plus Ultra looks on your device.">
                                    <div className="grid grid-cols-3 gap-3">
                                        <ThemeCard
                                            active={theme === 'light'}
                                            onClick={() => setTheme('light')}
                                            icon={Sun}
                                            label="Light"
                                        />
                                        <ThemeCard
                                            active={theme === 'dark'}
                                            onClick={() => setTheme('dark')}
                                            icon={Moon}
                                            label="Dark"
                                        />
                                        <ThemeCard
                                            active={theme === 'system'}
                                            onClick={() => setTheme('system')}
                                            icon={Laptop}
                                            label="System"
                                        />
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <Section title="Start Page" description="Choose which page loads when you open the app.">
                                    <div className="flex gap-3">
                                        {['Home', 'Anime'].map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setDefaultPage(page.toLowerCase())}
                                                className={`flex-1 py-3 rounded-lg border font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer select-none ${defaultPage === page.toLowerCase()
                                                    ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                    : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain hover:bg-gray-200 dark:hover:bg-white/10'
                                                    }`}
                                            >
                                                {page}
                                                {defaultPage === page.toLowerCase() && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <Section title="Interface" description="Customize UI elements and behavior.">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-textMain">Single Season Cards</h3>
                                            <p className="text-xs text-textMuted">Show season selector for shows with only one season.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowSingleSeason(!showSingleSeason)}
                                            className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer select-none flex items-center ${showSingleSeason ? 'bg-[#E50914] hover:bg-[#E50914]' : 'bg-surfaceHighlight border border-border hover:border-textMuted'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${showSingleSeason ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <Section title="Carousel Autoplay" description="When to pause the hero carousel slides.">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'anywhere', label: 'Hover Anywhere' },
                                                { id: 'buttons', label: 'Hover Buttons' },
                                                { id: 'never', label: 'Never' }
                                            ].map(mode => (
                                                <button
                                                    key={mode.id}
                                                    onClick={() => setCarouselPauseMode(mode.id)}
                                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border cursor-pointer select-none ${carouselPauseMode === mode.id
                                                        ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                        : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain hover:bg-gray-200 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === 'player' && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                                <Section title="Seek Duration" description="How many seconds to skip when using arrow keys.">
                                    <div className="flex items-center gap-4 px-1">
                                        <span className="text-sm font-bold text-textMuted w-16 text-right font-mono">{formatSeekTime(seekDuration)}</span>
                                        <input
                                            type="range"
                                            min="1"
                                            max="180"
                                            value={seekDuration}
                                            onChange={(e) => setSeekDuration(Number(e.target.value))}
                                            className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E50914] hover:accent-red-600 transition-all"
                                        />
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <Section title="Super Seek" description="How many seconds to skip when using Ctrl/Option + Arrow keys.">
                                    <div className="flex items-center gap-4 px-1">
                                        <span className="text-sm font-bold text-textMuted w-16 text-right font-mono">{formatSeekTime(superSeekDuration)}</span>
                                        <input
                                            type="range"
                                            min="1"
                                            max="180"
                                            value={superSeekDuration}
                                            onChange={(e) => setSuperSeekDuration(Number(e.target.value))}
                                            className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E50914] hover:accent-red-600 transition-all"
                                        />
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Section title="Streaming Quality" description="Preferred resolution for online playback.">
                                        <div className="flex flex-wrap gap-3">
                                            {['1080p', '720p', '360p'].map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => setStreamQuality(q)}
                                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border cursor-pointer select-none ${streamQuality === q
                                                        ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                        : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain hover:bg-gray-200 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </Section>

                                    <Section title="Preferred Audio" description="Default audio track for anime content.">
                                        <div className="flex flex-wrap gap-3">
                                            {['sub', 'dub'].map(a => (
                                                <button
                                                    key={a}
                                                    onClick={() => setAudioLang(a)}
                                                    className={`px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all border cursor-pointer select-none ${audioLang === a
                                                        ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                        : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain hover:bg-gray-200 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    {a}
                                                </button>
                                            ))}
                                        </div>
                                    </Section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'downloads' && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                                <Section title="Download Location" description="Where your offline content is stored.">
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                                            <input
                                                type="text"
                                                value={downloadPath || ''}
                                                readOnly
                                                className="w-full bg-surfaceHighlight border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-textMain font-mono focus:outline-none cursor-not-allowed opacity-70"
                                            />
                                        </div>
                                        <button
                                            onClick={handleBrowse}
                                            className="px-4 py-2 bg-surfaceHighlight border border-border rounded-lg font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer select-none whitespace-nowrap text-textMain"
                                        >
                                            Change
                                        </button>
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Section title="Video Quality" description="Preferred resolution for downloads.">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-wrap gap-3">
                                                {['1080p', '720p', '360p'].map(q => (
                                                    <button
                                                        key={q}
                                                        onClick={() => setDownloadQuality(q)}
                                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border cursor-pointer select-none ${downloadQuality === q
                                                            ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                            : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain hover:bg-gray-200 dark:hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-bold text-textMain">Strict Mode</h3>
                                                    <p className="text-xs text-textMuted">Only download if selected quality is available.</p>
                                                </div>
                                                <button
                                                    onClick={() => setDownloadVideoStrict(!downloadVideoStrict)}
                                                    className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer select-none flex items-center ${downloadVideoStrict ? 'bg-[#E50914] hover:bg-[#E50914]' : 'bg-surfaceHighlight border border-border hover:border-textMuted'}`}
                                                >
                                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${downloadVideoStrict ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </Section>

                                    <Section title="Audio Language" description="Preferred audio language for downloads.">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-wrap gap-3">
                                                {['sub', 'dub'].map(a => (
                                                    <button
                                                        key={a}
                                                        onClick={() => setDownloadAudio(a)}
                                                        className={`px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all border cursor-pointer select-none ${downloadAudio === a
                                                            ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                            : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain hover:bg-gray-200 dark:hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {a}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-bold text-textMain">Strict Mode</h3>
                                                    <p className="text-xs text-textMuted">Only download if selected audio is available.</p>
                                                </div>
                                                <button
                                                    onClick={() => setDownloadAudioStrict(!downloadAudioStrict)}
                                                    className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer select-none flex items-center ${downloadAudioStrict ? 'bg-[#E50914] hover:bg-[#E50914]' : 'bg-surfaceHighlight border border-border hover:border-textMuted'}`}
                                                >
                                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${downloadAudioStrict ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </Section>
                                </div>

                                <div className="h-px bg-border" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-textMain">Include Subtitles</h3>
                                        <p className="text-sm text-textMuted">Download subtitle files with video.</p>
                                    </div>
                                    <button
                                        onClick={() => setDownloadSubs(!downloadSubs)}
                                        className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer select-none flex items-center ${downloadSubs ? 'bg-[#E50914] hover:bg-[#E50914]' : 'bg-surfaceHighlight border border-border hover:border-textMuted'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${downloadSubs ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, description, children }) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="text-lg font-bold text-textMain mb-1">{title}</h3>
                {description && <p className="text-sm text-textMuted">{description}</p>}
            </div>
            {children}
        </div>
    );
}

function ThemeCard({ active, onClick, icon: Icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${active
                ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
        >
            {Icon && <Icon className="w-5 h-5" />}
            <span className="font-bold">{label}</span>
        </button>
    );
}