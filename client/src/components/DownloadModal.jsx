import { useState, useEffect } from 'react';
import { X, Download, Folder, Settings2 } from 'lucide-react';

export default function DownloadModal({ item, episodes, onClose, onConfirm }) {
    // Read settings directly from storage to display
    const quality = localStorage.getItem('settings_downloadQuality') || '1080p';
    const audio = localStorage.getItem('settings_downloadAudio') || 'dub';
    const path = localStorage.getItem('settings_downloadPath') || 'Not set';
    const strictVideo = localStorage.getItem('settings_downloadVideoStrict') === 'true';
    const strictAudio = localStorage.getItem('settings_downloadAudioStrict') === 'true';

    const handleConfirm = () => {
        // Pass current settings back to parent
        onConfirm({
            quality,
            audio,
            strictVideo,
            strictAudio,
            path
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surfaceHighlight/50">
                    <h2 className="text-xl font-bold text-textMain">Confirm Download</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-textMuted" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Download className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-textMain">Downloading {episodes.length} Item{episodes.length !== 1 ? 's' : ''}</h3>
                            <p className="text-sm text-textMuted mt-1">{item.title || item.name}</p>
                            {episodes.length === 1 && (
                                <p className="text-xs text-textMuted mt-1">
                                    {episodes[0].name || `Episode ${episodes[0].episode_number || episodes[0].number}`}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-2">
                            <Settings2 className="w-3 h-3" /> Current Settings
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-surfaceHighlight rounded-lg border border-border">
                                <span className="text-xs text-textMuted block mb-1">Quality</span>
                                <span className="font-bold text-sm text-textMain">{quality} {strictVideo && '(Strict)'}</span>
                            </div>
                            <div className="p-3 bg-surfaceHighlight rounded-lg border border-border">
                                <span className="text-xs text-textMuted block mb-1">Audio</span>
                                <span className="font-bold text-sm text-textMain uppercase">{audio} {strictAudio && '(Strict)'}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-surfaceHighlight rounded-lg border border-border flex items-center gap-3">
                            <Folder className="w-4 h-4 text-textMuted shrink-0" />
                            <div className="overflow-hidden">
                                <span className="text-xs text-textMuted block mb-0.5">Save Location</span>
                                <span className="font-bold text-xs text-textMain truncate block" title={path}>{path}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-surfaceHighlight/30 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold text-textMuted hover:bg-surfaceHighlight transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer"
                    >
                        Start Download
                    </button>
                </div>
            </div>
        </div>
    );
}