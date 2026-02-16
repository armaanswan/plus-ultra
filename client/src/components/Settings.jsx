import { useState, useEffect } from 'react';
import { X, Monitor, Play, Download, Moon, Sun, Laptop, Folder, Check, Globe, Captions } from 'lucide-react';

export default function Settings({ onClose, theme, setTheme, defaultPage, setDefaultPage, initialTab }) {
    const [activeTab, setActiveTab] = useState(initialTab || 'general');

    // Persistent Settings State
    const [seekDuration, setSeekDuration] = useState(() => Number(localStorage.getItem('settings_seekDuration')) || 10);
    const [streamQuality, setStreamQuality] = useState(() => localStorage.getItem('settings_streamQuality') || '1080p');
    const [downloadQuality, setDownloadQuality] = useState(() => localStorage.getItem('settings_downloadQuality') || '1080p');
    const [downloadMode, setDownloadMode] = useState(() => localStorage.getItem('settings_downloadMode') || 'strict');
    const [audioLang, setAudioLang] = useState(() => localStorage.getItem('settings_audioLang') || 'dub');
    const [downloadSubs, setDownloadSubs] = useState(() => {
        const stored = localStorage.getItem('settings_downloadSubs');
        return stored !== null ? stored === 'true' : true;
    });

    // Save to LocalStorage on Change
    useEffect(() => {
        localStorage.setItem('settings_seekDuration', seekDuration);
        localStorage.setItem('settings_streamQuality', streamQuality);
        localStorage.setItem('settings_downloadQuality', downloadQuality);
        localStorage.setItem('settings_downloadMode', downloadMode);
        localStorage.setItem('settings_audioLang', audioLang);
        localStorage.setItem('settings_downloadSubs', downloadSubs);
    }, [seekDuration, streamQuality, downloadQuality, downloadMode, audioLang, downloadSubs]);

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
                    className="absolute top-6 right-6 z-50 p-2 rounded-full hover:bg-surfaceHighlight text-textMuted hover:text-textMain transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Sidebar */}
                <div className="w-64 bg-surfaceHighlight border-r border-border p-6 flex flex-col gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-textMain tracking-tight mb-1">Settings</h2>
                        <p className="text-textMuted text-xs">Manage your preferences</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all group ${activeTab === tab.id
                                    ? 'bg-surface text-textMain shadow-sm border border-border'
                                    : 'text-textMuted hover:bg-surface/50 hover:text-textMain'
                                    }`}
                            >
                                <div className={`p-1.5 rounded-md ${activeTab === tab.id ? 'bg-[#E50914] text-white' : 'bg-surface border border-border text-textMuted group-hover:text-textMain'}`}>
                                    <tab.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm leading-none mb-1">{tab.label}</div>
                                    <div className="text-[10px] opacity-70 font-medium leading-none">{tab.desc}</div>
                                </div>
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
                                                className={`flex-1 py-3 rounded-lg border font-bold transition-all flex items-center justify-center gap-2 text-sm ${defaultPage === page.toLowerCase()
                                                    ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                    : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain'
                                                    }`}
                                            >
                                                {page}
                                                {defaultPage === page.toLowerCase() && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === 'player' && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                                <Section title="Seek Duration" description="How many seconds to skip when using arrow keys.">
                                    <div className="flex flex-wrap gap-3">
                                        {[5, 10, 15, 30, 60].map(seconds => (
                                            <button
                                                key={seconds}
                                                onClick={() => setSeekDuration(seconds)}
                                                className={`w-14 h-10 rounded-lg font-bold transition-all flex items-center justify-center text-sm ${seekDuration === seconds
                                                    ? 'bg-[#E50914] text-white shadow-md'
                                                    : 'bg-surfaceHighlight text-textMuted hover:bg-border hover:text-textMain'
                                                    }`}
                                            >
                                                {seconds}s
                                            </button>
                                        ))}
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <Section title="Streaming Quality" description="Preferred resolution for online playback.">
                                    <div className="flex flex-wrap gap-3">
                                        {['1080p', '720p', '360p'].map(q => (
                                            <button
                                                key={q}
                                                onClick={() => setStreamQuality(q)}
                                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border ${streamQuality === q
                                                    ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                    : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain'
                                                    }`}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <Section title="Preferred Audio" description="Default audio track for anime content.">
                                    <div className="grid grid-cols-2 gap-3">
                                        <SelectionCard
                                            active={audioLang === 'sub'}
                                            onClick={() => setAudioLang('sub')}
                                            icon={Captions}
                                            title="Subbed"
                                            desc="Original Japanese audio with subtitles."
                                        />
                                        <SelectionCard
                                            active={audioLang === 'dub'}
                                            onClick={() => setAudioLang('dub')}
                                            icon={Globe}
                                            title="Dubbed"
                                            desc="English voice over when available."
                                        />
                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === 'downloads' && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                                <Section title="Download Location" description="Where your offline content is stored.">
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-surfaceHighlight border border-border rounded-lg px-4 py-3 text-sm text-textMuted font-mono truncate flex items-center gap-3">
                                            <Folder className="w-4 h-4 text-textMuted" />
                                            /Users/armaanswan/Downloads/PlusUltra
                                        </div>
                                        <button className="px-5 bg-surfaceHighlight hover:bg-border border border-border rounded-lg text-textMain font-bold transition-colors text-sm">
                                            Change
                                        </button>
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <Section title="Video Quality" description="Preferred resolution for downloads.">
                                    <div className="flex flex-wrap gap-3">
                                        {['1080p', '720p', '360p'].map(q => (
                                            <button
                                                key={q}
                                                onClick={() => setDownloadQuality(q)}
                                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border ${downloadQuality === q
                                                    ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                                                    : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain'
                                                    }`}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <Section title="Download Mode" description="How strictly we adhere to your quality preference.">
                                    <div className="grid grid-cols-2 gap-3">
                                        <SelectionCard
                                            active={downloadMode === 'strict'}
                                            onClick={() => setDownloadMode('strict')}
                                            title="Strict"
                                            desc="Only download selected quality. Fail if unavailable."
                                        />
                                        <SelectionCard
                                            active={downloadMode === 'relaxed'}
                                            onClick={() => setDownloadMode('relaxed')}
                                            title="Relaxed"
                                            desc="Prefer selected quality, but allow lower if needed."
                                        />
                                    </div>
                                </Section>

                                <div className="h-px bg-border" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-textMain">Include Subtitles</h3>
                                        <p className="text-sm text-textMuted">Download subtitle files with video.</p>
                                    </div>
                                    <button
                                        onClick={() => setDownloadSubs(!downloadSubs)}
                                        className={`w-12 h-7 rounded-full transition-colors relative ${downloadSubs ? 'bg-[#E50914]' : 'bg-surfaceHighlight border border-border'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${downloadSubs ? 'translate-x-5' : 'translate-x-0'}`} />
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
                <p className="text-sm text-textMuted">{description}</p>
            </div>
            {children}
        </div>
    );
}

function ThemeCard({ active, onClick, icon: Icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${active
                ? 'border-[#E50914] bg-[#E50914]/10 text-[#E50914]'
                : 'border-border bg-surfaceHighlight text-textMuted hover:border-textMuted hover:text-textMain'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span className="font-bold">{label}</span>
        </button>
    );
}

function SelectionCard({ active, onClick, icon: Icon, title, desc }) {
    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-xl border text-left transition-all ${active
                ? 'border-[#E50914] bg-[#E50914]/5'
                : 'border-border bg-surfaceHighlight hover:border-textMuted'
                }`}
        >
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                    {Icon && <Icon className={`w-4 h-4 ${active ? 'text-[#E50914]' : 'text-textMuted'}`} />}
                    <span className={`font-bold text-sm ${active ? 'text-[#E50914]' : 'text-textMain'}`}>{title}</span>
                </div>
                {active && <Check className="w-4 h-4 text-[#E50914]" />}
            </div>
            <p className={`text-[11px] ${active ? 'text-[#E50914]/80' : 'text-textMuted'}`}>{desc}</p>
        </button>
    );
}