import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { ArrowLeft, ChevronLeft, ChevronRight, FastForward, Rewind } from 'lucide-react';

export default function Player({ url, poster, title, episodeTitle, episodeNumber, totalEpisodes, seasonNumber, type, onClose, onNext, onPrev, currentAudio, currentQuality, onUpdateStream }) {
    const artRef = useRef();
    const [showUI, setShowUI] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);
    const [seekOverlay, setSeekOverlay] = useState(null);
    const uiTimeout = useRef(null);
    const seekTimeout = useRef(null);

    // Manage UI Visibility (Auto-hide)
    useEffect(() => {
        const handleMouseMove = () => {
            setShowUI(true);
            if (uiTimeout.current) clearTimeout(uiTimeout.current);
            uiTimeout.current = setTimeout(() => setShowUI(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (uiTimeout.current) clearTimeout(uiTimeout.current);
        };
    }, []);

    useEffect(() => {
        if (!url) return; // Wait for URL

        setIsBuffering(true); // Reset buffering state for new URL
        setHasStarted(false); // Reset start state

        // 1. Blur the previously active element (e.g., the "Play" button)
        // This prevents Spacebar from triggering the button again and restarting the stream
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        const art = new Artplayer({
            container: artRef.current,
            url: url,

            volume: 0.5,
            isLive: false,
            muted: false,
            autoplay: true,
            pip: true,
            autoSize: true,
            autoMini: true,
            screenshot: false,
            setting: false,
            loop: false,
            flip: false,
            playbackRate: false,
            aspectRatio: false,
            fullscreen: true,
            fullscreenWeb: false,
            subtitleOffset: false,
            miniProgressBar: false,
            mutex: true,
            backdrop: false,
            playsInline: true,
            autoPlayback: true,
            airplay: true,
            theme: '#ef4444', // Red accent for +ultra vibe

            notice: false, // Disable "Play/Pause" notifications
            hotkey: false, // Disable built-in hotkeys to use global window listener
            icons: {
                state: '<svg width="96" height="96" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg>',
                play: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg>',
                pause: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z"/></svg>',
            },
            customType: {
                m3u8: function (video, url, art) {
                    if (Hls.isSupported()) {
                        console.log("HLS is supported, using HLS.js");
                        if (art.hls) art.hls.destroy();

                        // Clean initialization. No xhrSetup proxying.
                        const hls = new Hls();

                        hls.loadSource(url);
                        hls.attachMedia(video);

                        art.hls = hls;
                        art.on('destroy', () => hls.destroy());
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = url;
                    } else {
                        if (art.notice) art.notice.show = 'Unsupported playback format: m3u8';
                        else console.error('Unsupported playback format: m3u8');
                    }
                }
            },
        });

        // Handle Buffering State
        art.on('waiting', () => setIsBuffering(true));
        art.on('canplay', () => {
            setIsBuffering(false);
            setHasStarted(true);
        });
        art.on('playing', () => {
            setIsBuffering(false);
            setHasStarted(true);
        });
        art.on('seeked', () => setIsBuffering(false));

        // Failsafe: If time is updating, we are definitely playing
        art.on('video:timeupdate', () => {
            setIsBuffering(false);
            setHasStarted(true);
        });

        // Custom Global Hotkeys (Bypasses focus issues)
        const handleKeyDown = (e) => {
            if (!art) return;

            const seekDuration = Number(localStorage.getItem('settings_seekDuration')) || 10;
            const superSeekDuration = Number(localStorage.getItem('settings_superSeekDuration')) || 60;

            const showSeekFeedback = (type, duration) => {
                setSeekOverlay({ type, text: `${duration}s` });
                if (seekTimeout.current) clearTimeout(seekTimeout.current);
                seekTimeout.current = setTimeout(() => {
                    setSeekOverlay(null);
                }, 600);
            };

            switch (e.key) {
                case ' ':
                case 'k':
                case 'K':
                    e.preventDefault();
                    art.toggle();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    const forwardDuration = (e.ctrlKey || e.altKey) ? superSeekDuration : seekDuration;
                    art.seek = art.currentTime + forwardDuration;
                    showSeekFeedback('forward', forwardDuration);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    const backwardDuration = (e.ctrlKey || e.altKey) ? superSeekDuration : seekDuration;
                    art.seek = art.currentTime - backwardDuration;
                    showSeekFeedback('backward', backwardDuration);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    art.volume = Math.min(1, art.volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    art.volume = Math.max(0, art.volume - 0.1);
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    art.muted = !art.muted;
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    art.fullscreen = !art.fullscreen;
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
                case 'N':
                case 'n':
                    if (e.shiftKey && onNext) {
                        e.preventDefault();
                        onNext();
                    }
                    break;
                case 'P':
                case 'p':
                    if (e.shiftKey && onPrev) {
                        e.preventDefault();
                        onPrev();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (art && art.destroy) {
                if (seekTimeout.current) clearTimeout(seekTimeout.current);
                art.destroy(true); // Destroy DOM to ensure complete reset between episodes
            }
        };
    }, [url]);

    return (
        <div className="fixed inset-0 z-[100] bg-black cursor-default">
            {/* Force hide Artplayer notice via CSS as a fallback */}
            <style>{`
                .art-notice, .art-layer-notice, .art-layer-auto-playback, .art-layer-loading, .art-loading { display: none !important; opacity: 0 !important; visibility: hidden !important; }
            `}</style>

            {/* Top Bar UI */}
            <div className={`absolute top-0 left-0 right-0 z-[120] flex items-center justify-between p-6 gap-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-500 pointer-events-none ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                {/* Left Side: Back Button & Title */}
                <div className="flex items-center gap-4 pointer-events-auto">
                    <button
                        onClick={onClose}
                        className="w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer group shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="flex flex-col">
                        <h2 className="text-white font-bold text-xl drop-shadow-md tracking-tight line-clamp-1">{title}</h2>
                        {type === 'tv' && (
                            <p className="text-gray-300 text-sm font-medium drop-shadow-md">
                                S{String(seasonNumber).padStart(2, '0')}E{String(episodeNumber).padStart(2, '0')}
                                {episodeTitle && <span className="text-gray-400 ml-2">{episodeTitle}</span>}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Side: Controls */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    {/* Stream Controls */}
                    {onUpdateStream && (
                        <div className="flex items-center gap-3">
                            {/* Audio Toggle */}
                            <div className="flex items-center bg-black/50 backdrop-blur-md rounded-lg p-1 border border-white/10">
                                {['sub', 'dub'].map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => mode !== currentAudio && onUpdateStream({ audio: mode })}
                                        className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${currentAudio === mode
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>

                            {/* Quality Toggle */}
                            <div className="flex items-center bg-black/50 backdrop-blur-md rounded-lg p-1 border border-white/10">
                                {['1080p', '720p', '360p'].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => q !== currentQuality && onUpdateStream({ quality: q })}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${currentQuality === q
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Episode Navigation */}
                    {type === 'tv' && url && (
                        <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                            <button
                                onClick={onPrev}
                                disabled={episodeNumber <= 1}
                                className="w-11 h-11 rounded-lg bg-black/50 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all group disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                                title="Previous Episode (Shift+P)">
                                <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            </button>
                            <button
                                onClick={onNext}
                                disabled={totalEpisodes > 0 && episodeNumber >= totalEpisodes}
                                className="w-11 h-11 rounded-lg bg-black/50 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all group disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                                title="Next Episode (Shift+N)">
                                <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Seek Overlay */}
            {seekOverlay && (
                <div className={`absolute top-1/2 -translate-y-1/2 z-[115] flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200 drop-shadow-lg ${seekOverlay.type === 'forward' ? 'left-[75%] -translate-x-1/2' : 'left-[25%] -translate-x-1/2'}`}>
                    {seekOverlay.type === 'forward' ? (
                        <FastForward className="w-16 h-16 text-white fill-white/20" />
                    ) : (
                        <Rewind className="w-16 h-16 text-white fill-white/20" />
                    )}
                    <span className="text-2xl font-black text-white mt-2">{seekOverlay.text}</span>
                </div>
            )}

            {/* Loading State */}
            {(!url || isBuffering) && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center z-50 ${!hasStarted ? 'bg-black' : 'bg-transparent pointer-events-none'}`}>
                    <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E50914', borderTopColor: 'transparent' }}></div>
                </div>
            )}

            <div ref={artRef} className="w-full h-full outline-none" />
        </div>
    );
}
