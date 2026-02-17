import { useState } from 'react';
import { CircleCheck, AlertCircle, Minimize2, Maximize2, AlertTriangle, Download, RefreshCw, BrushCleaning } from 'lucide-react';

export default function DownloadWidget({ downloads, onClose }) {
    const [isExpanded, setIsExpanded] = useState(true);

    const activeCount = downloads.filter(d => d.status === 'pending' || d.status === 'downloading').length;
    const errorCount = downloads.filter(d => d.status === 'error').length;
    const completedCount = downloads.filter(d => d.status === 'completed').length;
    const totalCount = downloads.length;
    const isFinished = activeCount === 0;

    // Calculate current item index for display (e.g., "2 / 5")
    const currentItemIndex = downloads.findIndex(d => d.status === 'downloading' || d.status === 'pending');
    const currentItemNumber = currentItemIndex !== -1 ? currentItemIndex + 1 : (isFinished ? totalCount : completedCount);

    // Get progress of the currently downloading item for the collapsed view
    const currentActiveItem = downloads.find(d => d.status === 'downloading') || downloads.find(d => d.status === 'pending');
    const currentProgress = downloads.find(d => d.status === 'downloading')?.progress || 0;

    if (downloads.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300 font-sans">
            <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden w-96 transition-all duration-300 ease-in-out">
                {/* Header */}
                <div
                    className="relative bg-surfaceHighlight/80 backdrop-blur-md p-3 flex items-center justify-between gap-4 cursor-pointer border-b border-border hover:bg-surfaceHighlight transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {/* Collapsed Progress Bar */}
                    {!isExpanded && activeCount > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${currentProgress}%`, minWidth: '4px' }}
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-full ${activeCount > 0 ? 'bg-primary/10' : errorCount > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                            {activeCount > 0 ? (
                                <Download className="w-4 h-4 text-primary animate-pulse" />
                            ) : errorCount > 0 ? (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : (
                                <CircleCheck className="w-4 h-4 text-green-500" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-textMain whitespace-nowrap">
                                {activeCount > 0 ? 'Downloading' : errorCount > 0 ? 'Attention Needed' : 'Finished'}
                            </span>
                            <span className="text-xs text-textMuted font-medium truncate">
                                {activeCount > 0
                                    ? `${currentItemNumber} / ${totalCount} • ${currentActiveItem?.fileName || 'Preparing...'}`
                                    : `${completedCount} / ${totalCount} done`
                                }
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={onClose}
                            disabled={!isFinished}
                            className={`p-2 rounded-full transition-all ${!isFinished ? 'opacity-30 cursor-not-allowed text-textMuted' : 'hover:bg-red-500/10 text-textMuted hover:text-red-500 cursor-pointer'}`}
                            title="Clear Finished"
                        >
                            <BrushCleaning className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 rounded-full hover:bg-white/10 text-textMuted hover:text-textMain transition-all cursor-pointer"
                        >
                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* List */}
                {isExpanded && (
                    <div className="max-h-[32rem] overflow-y-auto p-2 bg-surface flex flex-col gap-2">
                        {downloads.map((d) => (
                            <div key={d.id} className="group relative flex flex-col gap-2 p-3 rounded-lg bg-surfaceHighlight/30 border border-border/50 hover:border-border hover:bg-surfaceHighlight/50 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 mt-0.5">
                                        {d.status === 'downloading' && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
                                        {d.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-textMuted/30 border-t-textMuted" />}
                                        {d.status === 'completed' && <CircleCheck className="w-4 h-4 text-green-500" />}
                                        {d.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="text-sm font-bold text-textMain leading-tight break-all line-clamp-1" title={d.fileName}>
                                                {d.fileName}
                                            </p>
                                            {d.status === 'downloading' && (
                                                <span className="text-xs font-mono font-bold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded">
                                                    {d.progress || 0}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Metadata Badges */}
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            {d.quality && (
                                                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-textMuted uppercase tracking-wider">
                                                    {d.quality}
                                                </span>
                                            )}
                                            {d.audio && (
                                                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-textMuted uppercase tracking-wider">
                                                    {d.audio}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar or Status Message */}
                                <div className="pl-7">
                                    {d.status === 'downloading' ? (
                                        <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary shadow-lg shadow-primary/20 transition-all duration-300 ease-out rounded-full"
                                                style={{ width: `${d.progress || 0}%`, minWidth: '6px' }}
                                            />
                                        </div>
                                    ) : d.status === 'error' ? (
                                        <div className="flex items-start gap-1.5 text-red-500 bg-red-500/5 p-1.5 rounded border border-red-500/10">
                                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                            <p className="text-xs font-medium leading-tight">
                                                {d.error || 'Unknown error occurred'}
                                            </p>
                                        </div>
                                    ) : d.status === 'completed' ? (
                                        <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                                            Download complete
                                        </p>
                                    ) : (
                                        <p className="text-xs text-textMuted">
                                            {d.status}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}