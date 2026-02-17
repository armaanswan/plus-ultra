import { useState, useEffect } from 'react';
import { X, Download, CheckCircle, Loader2, SlidersHorizontal } from 'lucide-react';

export default function DownloadModal({ item, episodes, onClose, onDownload }) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isDownloading, setIsDownloading] = useState(false);
    const [quality, setQuality] = useState(() => localStorage.getItem('settings_downloadQuality') || '1080p');
    const [audio, setAudio] = useState(() => localStorage.getItem('settings_downloadAudio') || 'dub');
    const [mode, setMode] = useState(() => localStorage.getItem('settings_downloadMode') || 'strict');

    // Auto-select all if it's a movie (single episode)
    useEffect(() => {
        if (episodes.length === 1) {
            setSelectedIds(new Set([episodes[0].id || 1]));
        }
    }, [episodes]);

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === episodes.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(episodes.map(e => e.id || e.episode_number)));
        }
    };

    const handleDownloadClick = async () => {
        if (selectedIds.size === 0) return;
        setIsDownloading(true);
        const selectedEpisodes = episodes.filter(e => selectedIds.has(e.id || e.episode_number));
        await onDownload(selectedEpisodes, { quality, audio, mode });
        setIsDownloading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surfaceHighlight/50">
                    <div>
                        <h2 className="text-xl font-bold text-textMain">Download Episodes</h2>
                        <p className="text-sm text-textMuted">{item.title || item.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-textMuted" />
                    </button>
                </div>

                {/* Options Toolbar */}
                <div className="px-6 py-4 border-b border-border bg-surface flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-textMuted uppercase tracking-wider">
                        <SlidersHorizontal className="w-3 h-3" /> Download Options
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {/* Quality */}
                        <div className="flex items-center gap-2 bg-surfaceHighlight rounded-lg p-1 border border-border">
                            {['1080p', '720p', '360p'].map(q => (
                                <button
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none ${quality === q ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-textMain'}`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>

                        {/* Audio */}
                        <div className="flex items-center gap-2 bg-surfaceHighlight rounded-lg p-1 border border-border">
                            {['sub', 'dub'].map(a => (
                                <button
                                    key={a}
                                    onClick={() => setAudio(a)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-all cursor-pointer select-none ${audio === a ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-textMain'}`}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>

                        {/* Mode */}
                        <div className="flex items-center gap-2 bg-surfaceHighlight rounded-lg p-1 border border-border">
                            {['strict', 'relaxed'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all cursor-pointer select-none ${mode === m ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-textMain'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-surface">
                    <button
                        onClick={toggleAll}
                        className="text-sm font-bold text-primary hover:text-red-400 transition-colors flex items-center gap-2"
                    >
                        {selectedIds.size === episodes.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-sm text-textMuted font-medium">
                        {selectedIds.size} selected
                    </span>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {episodes.map((ep, idx) => {
                        const id = ep.id || ep.episode_number;
                        const isSelected = selectedIds.has(id);
                        const title = ep.title || ep.name || `Episode ${ep.episode_number || ep.number}`;
                        const number = ep.episode_number || ep.number || (idx + 1);

                        return (
                            <div
                                key={id}
                                onClick={() => toggleSelection(id)}
                                className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-primary/10 border-primary/50' : 'hover:bg-surfaceHighlight border-transparent'}`}
                            >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-textMuted'}`}>
                                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-textMain'}`}>
                                        {number}. {title}
                                    </h4>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-surfaceHighlight/30">
                    <button
                        onClick={handleDownloadClick}
                        disabled={selectedIds.size === 0 || isDownloading}
                        className="w-full py-3 bg-primary hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                        {isDownloading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                        {isDownloading ? 'Starting Downloads...' : `Download ${selectedIds.size} Items`}
                    </button>
                </div>
            </div>
        </div>
    );
}