import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { X, Play, Plus, Eye, Download, ArrowLeft, ArrowDownNarrowWide, Star, Calendar, Clock } from 'lucide-react';
import MediaCard from './MediaCard';
import DownloadModal from './DownloadModal';
import { ModalSkeleton, SeasonListSkeleton, EpisodeListSkeleton } from './Skeleton';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';
const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKEND_URL = 'http://localhost:3001';
const CONSUMET_URL = 'http://localhost:3000';

const CERTIFICATIONS = {
    'G': 'General Audiences',
    'PG': 'Parental Guidance Suggested',
    'PG-13': 'Parents Strongly Cautioned',
    'R': 'Restricted',
    'NC-17': 'Adults Only',
    'TV-Y': 'All Children',
    'TV-Y7': 'Directed to Older Children',
    'TV-G': 'General Audience',
    'TV-PG': 'Parental Guidance Suggested',
    'TV-14': 'Parents Strongly Cautioned',
    'TV-MA': 'Mature Audience Only',
    'NR': 'Not Rated',
    'Unrated': 'Not Rated'
};

function formatDuration(time) {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length === 3) {
        const h = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        if (h > 0) return `${h} hr ${m} mins`;
        return `${m} mins`;
    }
    return time;
}

export default function DetailModal({ item, onClose, onPlay }) {
    const [currentItem, setCurrentItem] = useState(item);
    const [history, setHistory] = useState([]);
    // const [loading, setLoading] = useState(true); // Replaced by React Query
    const [currentAnimeId, setCurrentAnimeId] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [isClosing, setIsClosing] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadEpisodes, setDownloadEpisodes] = useState([]);
    const scrollContainerRef = useRef(null);
    const scrollRestorationRef = useRef(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const showSingleSeason = localStorage.getItem('settings_showSingleSeason') !== 'false';

    // Disable Body Scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // 1. Fetch Main Details
    const { data: details, isLoading: detailsLoading } = useQuery({
        queryKey: ['details', currentItem.media_type || (currentItem.title ? 'movie' : 'tv'), currentItem.id],
        queryFn: async () => {
            const type = currentItem.media_type || (currentItem.title ? 'movie' : 'tv');
            const res = await axios.get(`${BACKEND_URL}/api/details/${type}/${currentItem.id}`);

            // Preload High-Res Background Image
            const backdropPath = res.data.backdrop_path || currentItem.backdrop_path;
            if (backdropPath) {
                const img = new Image();
                img.src = `${TMDB_IMAGE_BASE}${backdropPath}`;
                img.decode().catch(() => { });
            }
            return res.data;
        },
        staleTime: 1000 * 60 * 30, // 30 mins
    });

    // 2. Fetch Anime Seasons List (if Anime)
    const title = details?.title || details?.name || currentItem.title || currentItem.name;
    const isAnime = details?.original_language === 'ja' &&
        details?.genres?.some(g => g.name === 'Animation') &&
        (currentItem.media_type === 'tv' || details?.number_of_seasons);

    const { data: animeSeasons = [], isLoading: animeSeasonsLoading } = useQuery({
        queryKey: ['anime_search', title],
        queryFn: async () => {
            const searchRes = await axios.get(`${CONSUMET_URL}/anime/animepahe/${encodeURIComponent(title)}`);
            if (searchRes.data.results?.length > 0) {
                const tmdbYear = parseInt((details?.release_date || details?.first_air_date || currentItem.release_date || currentItem.first_air_date || '0').split('-')[0]);

                let validSeasons = searchRes.data.results.filter(r => {
                    const rTitle = r.title.toLowerCase();
                    const qTitle = title.toLowerCase();

                    // 1. Strict Start Check (Fixes "Steins;Gate" showing for "Gate")
                    if (!rTitle.startsWith(qTitle)) return false;

                    // 2. Year Check (Fixes "Gate Keepers" (2000) showing for "Gate" (2015))
                    const rYear = parseInt(String(r.releaseDate || "").match(/\d{4}/)?.[0] || "0");
                    if (tmdbYear && rYear > 0 && rYear < (tmdbYear - 1)) return false;

                    return true;
                });

                if (validSeasons.length === 0) {
                    validSeasons = searchRes.data.results.filter(r =>
                        r.title.toLowerCase().includes(title.toLowerCase())
                    );
                }

                validSeasons.sort((a, b) => {
                    const yearA = parseInt(String(a.releaseDate || "").match(/\d{4}/)?.[0] || "0");
                    const yearB = parseInt(String(b.releaseDate || "").match(/\d{4}/)?.[0] || "0");
                    return yearA - yearB;
                });
                return validSeasons;
            }
            return [];
        },
        enabled: !!isAnime && !!title,
        staleTime: 1000 * 60 * 60,
    });

    // Set initial anime ID when seasons load
    useEffect(() => {
        if (animeSeasons.length > 0 && !currentAnimeId) {
            const match = animeSeasons.find(r => r.title.toLowerCase() === title.toLowerCase()) || animeSeasons[0];
            if (match) setCurrentAnimeId(match.id);
        }
    }, [animeSeasons, title, currentAnimeId]);

    // 3. Fetch Specific Anime Season Data
    const { data: animeData, isLoading: animeDataLoading } = useQuery({
        queryKey: ['anime_info', currentAnimeId],
        queryFn: async () => {
            const infoRes = await axios.get(`${CONSUMET_URL}/anime/animepahe/info/${currentAnimeId}`);
            return infoRes.data;
        },
        enabled: !!currentAnimeId,
        staleTime: 1000 * 60 * 60,
    });

    // 4. Fetch TMDB Season Details (if TV)
    const { data: seasonData, isLoading: seasonDataLoading } = useQuery({
        queryKey: ['season', currentItem.id, selectedSeason],
        queryFn: async () => {
            const res = await axios.get(`${BACKEND_URL}/api/details/tv/${currentItem.id}/season/${selectedSeason}`);
            return res.data;
        },
        enabled: !!details && (currentItem.media_type === 'tv' || !!details.seasons),
        staleTime: 1000 * 60 * 30,
    });

    // Ensure valid season is selected when details load
    useEffect(() => {
        if (details?.seasons?.length > 0) {
            const firstSeason = details.seasons.find(s => s.season_number > 0);
            if (firstSeason) {
                const isValid = details.seasons.some(s => s.season_number === selectedSeason);
                if (!isValid) setSelectedSeason(firstSeason.season_number);
            }
        }
    }, [details, selectedSeason]);

    // Scroll to top or restore position when item changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            if (scrollRestorationRef.current !== null) {
                scrollContainerRef.current.scrollTop = scrollRestorationRef.current;
                scrollRestorationRef.current = null;
            } else {
                scrollContainerRef.current.scrollTop = 0;
            }
        }
    }, [currentItem]);

    // Reset state when item changes
    useEffect(() => {
        setCurrentAnimeId(null);
        setSelectedSeason(1);
        setIsImageLoaded(false);
    }, [currentItem.id]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Match animation duration
    };

    const handleRecommendationClick = (newItem) => {
        const scrollTop = scrollContainerRef.current ? scrollContainerRef.current.scrollTop : 0;
        setHistory([...history, { item: currentItem, scrollTop }]);
        setCurrentItem(newItem);
    };

    const handleBack = () => {
        const prev = history[history.length - 1];
        setHistory(history.slice(0, -1));
        scrollRestorationRef.current = prev.scrollTop;
        setCurrentItem(prev.item);
    };

    const handleDownload = async (episodesToDownload, options = {}) => {
        const downloadPath = localStorage.getItem('settings_downloadPath');
        if (!downloadPath) {
            alert("Please set a download folder in Settings first!");
            return;
        }

        for (const ep of episodesToDownload) {
            try {
                const payload = {
                    title: details.title || details.name || currentItem.title,
                    releaseYear: (details.release_date || details.first_air_date || '').split('-')[0],
                    type: currentItem.media_type || 'tv',
                    episodeNumber: ep.episode_number || ep.number || 1,
                    audio: options.audio || localStorage.getItem('settings_downloadAudio') || 'dub',
                    quality: options.quality || localStorage.getItem('settings_downloadQuality') || '1080p'
                };

                const res = await axios.post(`${BACKEND_URL}/api/resolve`, payload);

                if (res.data.streamUrl) {
                    const filename = `${payload.title} - S${String(selectedSeason).padStart(2, '0')}E${String(payload.episodeNumber).padStart(2, '0')}.mp4`;
                    await axios.get(`${BACKEND_URL}/download`, {
                        params: {
                            url: res.data.streamUrl,
                            referer: res.data.referer,
                            filename: filename,
                            downloadPath: downloadPath
                        }
                    });
                }
            } catch (err) {
                console.error("Download failed for ep", ep, err);
            }
        }
        alert("Downloads started in background!");
    };

    if (!currentItem) return null;

    // const title = details?.title || details?.name || currentItem.title || currentItem.name; // Already defined above
    const backdrop = details?.backdrop_path || currentItem.backdrop_path;
    const year = (details?.release_date || details?.first_air_date || currentItem.release_date || currentItem.first_air_date || '????').split('-')[0];
    const fullDate = details?.release_date || details?.first_air_date || currentItem.release_date || currentItem.first_air_date;
    const formattedDate = fullDate ? new Date(fullDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown Date';
    const runtime = details?.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : null;
    const genres = details?.genres || [];
    const keywords = details?.keywords?.keywords || details?.keywords?.results || [];
    const cast = details?.credits?.cast?.slice(0, 10) || [];

    const isAnimeContent = isAnime; // Re-use logic
    let rawRecommendations = (details?.recommendations?.results?.length > 0
        ? details.recommendations.results
        : details?.similar?.results) || [];

    if (isAnimeContent) {
        rawRecommendations = rawRecommendations.filter(rec => rec.original_language === 'ja' && rec.genre_ids?.includes(16));
    }
    const recommendations = rawRecommendations.slice(0, 20).map(rec => ({ ...rec, media_type: rec.media_type || currentItem.media_type || (currentItem.title ? 'movie' : 'tv') }));

    const isTV = (currentItem.media_type === 'tv' || details?.seasons);
    const certification = isTV
        ? details?.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating
        : details?.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.find(d => d.certification)?.certification;

    const displaySeasons = (isAnime && animeSeasons?.length > 0) ? animeSeasons.length : details?.number_of_seasons;
    const displayEpisodes = (isAnime && animeData?.episodes?.length > 0) ? animeData.episodes.length : details?.number_of_episodes;

    const showLoading = detailsLoading || !isImageLoaded;

    return (
        <div
            className={`fixed inset-0 z-[90] flex items-center justify-center p-4 lg:p-8 bg-black/90 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full max-w-6xl bg-surface rounded-2xl overflow-hidden shadow-2xl relative flex flex-col h-[90vh] max-h-[95vh] transition-transform duration-300 ${isClosing ? 'scale-95' : 'animate-in slide-in-from-bottom-4'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Back Button */}
                {history.length > 0 && (
                    <button
                        onClick={handleBack}
                        className="absolute top-4 left-4 z-50 w-8 h-8 bg-black/50 hover:bg-surface text-white hover:text-textMain rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-50 w-8 h-8 bg-black/50 hover:bg-surface text-white hover:text-textMain rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Loading State */}
                {showLoading && (
                    <div className="absolute inset-0 z-40 bg-surface overflow-hidden">
                        <ModalSkeleton />
                    </div>
                )}

                <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto transition-opacity duration-500 ease-in-out ${showLoading ? 'opacity-0' : 'opacity-100'}`}>
                    {/* HERO BANNER */}
                    <div className="relative h-[385px] lg:h-[500px] w-full shrink-0">
                        <img
                            key={backdrop}
                            src={`${TMDB_IMAGE_BASE}${backdrop}`}
                            alt={title}
                            className="w-full h-full object-cover"
                            onLoad={() => setIsImageLoaded(true)}
                            onError={() => setIsImageLoaded(true)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

                        <div className="absolute bottom-0 left-0 p-8 lg:p-12 w-full">
                            <h2 className="text-4xl lg:text-6xl font-black text-white mb-4 leading-none drop-shadow-xl">
                                {title}
                            </h2>

                            <div className="flex flex-wrap items-center gap-4">
                                <button
                                    onClick={() => {
                                        if (animeData?.episodes?.length > 0) {
                                            const firstEp = animeData.episodes[0];
                                            onPlay({
                                                ...currentItem,
                                                title: animeData.title, // Use scraper title (e.g. "Show Season 2")
                                                episodeNumber: firstEp.number,
                                                seasonNumber: 1,
                                                episodeId: firstEp.id,
                                                episodeTitle: firstEp.title || `Episode ${firstEp.number}`,
                                                image: firstEp.image
                                            });
                                        } else if (isTV && seasonData?.episodes?.length > 0) {
                                            const firstEp = seasonData.episodes[0];
                                            onPlay({
                                                ...currentItem,
                                                episodeNumber: firstEp.episode_number,
                                                seasonNumber: firstEp.season_number,
                                                episodeTitle: firstEp.name,
                                                episodes: seasonData.episodes
                                            });
                                        } else {
                                            onPlay(currentItem);
                                        }
                                    }}
                                    className="bg-primary text-white hover:bg-red-700 px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] cursor-pointer"
                                >
                                    <Play className="w-5 h-5 fill-current" /> Play
                                </button>

                                {/* Action Buttons */}
                                {[
                                    { icon: Plus, label: 'Add to Watchlist' },
                                    { icon: Eye, label: 'Mark as Watched' },
                                    {
                                        icon: Download,
                                        label: 'Download',
                                        onClick: () => {
                                            const eps = animeData?.episodes || seasonData?.episodes || [];
                                            if (eps.length > 0) {
                                                setDownloadEpisodes(eps);
                                                setShowDownloadModal(true);
                                            } else if (!isTV) {
                                                // Movie
                                                setDownloadEpisodes([{ id: currentItem.id, title: title, number: 1 }]);
                                                setShowDownloadModal(true);
                                            }
                                        }
                                    }
                                ].map((btn, idx) => (
                                    <div key={idx} className="relative group">
                                        <button
                                            onClick={btn.onClick}
                                            className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all text-white cursor-pointer"
                                        >
                                            <btn.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        </button>
                                        <span className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 border border-white/20 rounded-md text-xs text-white z-50 shadow-xl backdrop-blur-sm whitespace-nowrap pointer-events-none transition-opacity duration-300">
                                            {btn.label}
                                        </span>
                                    </div>
                                ))}

                                <div className="h-8 w-[1px] bg-white/20 mx-2"></div>

                                <span className="text-[#46d369] font-bold px-2 py-1 bg-black/40 rounded border border-white/10">
                                    {details?.vote_average?.toFixed(1)}/10
                                </span>
                                {certification && (
                                    <div className="group relative cursor-help">
                                        <span className="text-white px-2 py-0.5 border border-white/40 rounded text-sm font-medium">
                                            {certification}
                                        </span>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 border border-white/20 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            {CERTIFICATIONS[certification] || 'Rating'}
                                        </div>
                                    </div>
                                )}
                                <div className="group relative cursor-help">
                                    <span className="text-gray-300 font-medium">{year}</span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 border border-white/20 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {formattedDate}
                                    </div>
                                </div>
                                {isTV && displaySeasons && <span className="text-gray-300 font-medium">{displaySeasons} Seasons • {displayEpisodes} Eps</span>}
                                {!isTV && runtime && <span className="text-gray-400 text-sm font-medium">{runtime}</span>}
                                {details?.status && <span className="text-gray-400 text-sm font-medium">{details.status}</span>}
                            </div>
                        </div>
                    </div>

                    {/* CONTENT GRID */}
                    <div className="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* LEFT COLUMN (Synopsis, Seasons, Trailer) */}
                        <div className="lg:col-span-2 flex flex-col gap-10">
                            <div>
                                <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-2">Synopsis</h3>
                                <p className="text-textMain leading-relaxed text-lg font-light">
                                    {details?.overview}
                                </p>
                            </div>

                            {/* TV SEASONS SECTION */}
                            {isTV && ((isAnime || animeData) ? (
                                <div className="flex-1 flex flex-col">
                                    {/* Anime Season Selector */}
                                    {animeSeasonsLoading ? (
                                        <SeasonListSkeleton />
                                    ) : animeSeasons.length > 0 && (showSingleSeason || animeSeasons.length > 1) && (
                                        <>
                                            <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-4">Seasons</h3>
                                            <div className="flex overflow-x-auto pb-4 mb-8 px-1 items-start">
                                                {animeSeasons.map((season, idx) => {
                                                    const isSelected = currentAnimeId === season.id;

                                                    return (
                                                        <button
                                                            key={season.id}
                                                            onClick={() => setCurrentAnimeId(season.id)}
                                                            title={season.title}
                                                            className={`flex-shrink-0 w-44 p-3 flex flex-col gap-3 group text-left cursor-pointer relative rounded-xl transition-all ${isSelected ? 'bg-primary/10' : 'hover:bg-surfaceHighlight'}`}
                                                        >
                                                            <div className={`w-full aspect-[2/3] rounded-lg overflow-hidden border-2 relative transition-all ${isSelected
                                                                ? 'border-primary scale-105'
                                                                : 'border-transparent'
                                                                }`}>
                                                                <img src={season.image} alt={season.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            </div>
                                                            <div className="flex flex-col px-1 gap-1.5">
                                                                <h4 className={`text-sm font-bold truncate leading-tight transition-colors ${isSelected ? 'text-textMain' : 'text-textMain group-hover:text-primary'}`}>{season.title}</h4>
                                                                <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${isSelected ? 'text-textMuted' : 'text-textMuted group-hover:text-primary'}`}>
                                                                    <span>{season.type || 'TV'}</span>
                                                                    <span>•</span>
                                                                    <span>{String(season.releaseDate || "").match(/\d{4}/)?.[0] || '????'}</span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}

                                    {animeData ? (
                                        <h3 className="text-lg font-bold text-textMain normal-case tracking-tight mb-4">
                                            {(animeData.type === 'Movie' || animeSeasons.find(s => s.id === currentAnimeId)?.type === 'Movie') ? 'Movie' : 'Episodes'} <span className="text-textMain normal-case ml-1">- {animeData.title} ({String(animeData.releaseDate || "").match(/\d{4}/)?.[0] || ''})</span>
                                        </h3>
                                    ) : (
                                        <div className="h-7 w-1/3 bg-surfaceHighlight rounded mb-4 animate-pulse" />
                                    )}

                                    {animeDataLoading ? (
                                        <EpisodeListSkeleton />
                                    ) : animeData ? (
                                        <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col max-h-[600px] min-h-[200px]">
                                            <style>{`
                                            .custom-scrollbar::-webkit-scrollbar {
                                                display: block;
                                                width: 6px;
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-track {
                                                background: transparent;
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                                background-color: rgba(156, 163, 175, 0.5);
                                                border-radius: 3px;
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                                background-color: rgba(156, 163, 175, 0.8);
                                            }
                                        `}</style>
                                            <div className="overflow-y-auto custom-scrollbar flex-1">
                                                {animeData.episodes?.map((ep, idx) => (
                                                    <div
                                                        key={ep.id}
                                                        onClick={() => onPlay({
                                                            ...currentItem,
                                                            title: animeData.title, // Use scraper title
                                                            episodeNumber: ep.number,
                                                            seasonNumber: 1,
                                                            episodeId: ep.id,
                                                            episodeTitle: ep.title || `Episode ${ep.number}`,
                                                            image: ep.image
                                                        })}
                                                        className={`flex gap-4 p-3 items-center transition-colors cursor-pointer group border-b border-border last:border-b-0 ${idx % 2 === 0 ? 'bg-surface' : 'bg-surfaceHighlight'} hover:bg-primary/10`}
                                                    >
                                                        <div className="w-8 shrink-0 text-center">
                                                            <span className="font-mono text-base font-bold text-textMuted/40 group-hover:text-textMain transition-colors">
                                                                {ep.number}
                                                            </span>
                                                        </div>
                                                        <div className="w-32 aspect-video rounded-lg overflow-hidden bg-black/20 shrink-0 relative">
                                                            {ep.image ? (
                                                                <img src={ep.image} alt={ep.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-textMuted"><Play className="w-6 h-6" /></div>
                                                            )}
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                                <Play className="w-8 h-8 text-white fill-current" />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center">
                                                            <h4 className="font-bold text-textMain group-hover:text-primary transition-colors">
                                                                {ep.title || ((animeSeasons.find(s => s.id === currentAnimeId)?.type === 'Movie' || animeData.type === 'Movie') ? animeData.title : `Episode ${ep.number}`)}
                                                            </h4>
                                                            {ep.duration && (
                                                                <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded border border-border w-fit">
                                                                    <Clock className="w-3 h-3 text-textMuted" />
                                                                    <span className="text-xs font-medium text-textMuted">{formatDuration(ep.duration)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDownloadEpisodes([ep]);
                                                                    setShowDownloadModal(true);
                                                                }}
                                                                className="p-2.5 rounded-full hover:bg-surfaceHighlight text-textMuted hover:text-textMain transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-textMuted border border-border rounded-xl bg-surfaceHighlight/20">
                                            <p>No episodes found.</p>
                                        </div>
                                    )}
                                </div>
                            ) : details?.seasons && (
                                <div className="flex-1 flex flex-col">
                                    {(showSingleSeason || details.seasons.filter(s => s.season_number > 0).length > 1) && (
                                        <>
                                            <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-3">Seasons</h3>
                                            <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
                                                {details.seasons.filter(s => s.season_number > 0).map(season => (
                                                    <button
                                                        key={season.id}
                                                        onClick={() => setSelectedSeason(season.season_number)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${selectedSeason === season.season_number
                                                            ? 'bg-primary text-white'
                                                            : 'bg-surfaceHighlight text-textMuted hover:text-textMain'
                                                            }`}
                                                    >
                                                        {season.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* EPISODE LIST */}
                                    {seasonDataLoading ? (
                                        <EpisodeListSkeleton />
                                    ) : (
                                        <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col min-h-[200px] max-h-[600px]">
                                            <style>{`
                                            .custom-scrollbar::-webkit-scrollbar {
                                                display: block;
                                                width: 6px;
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-track {
                                                background: transparent;
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                                background-color: rgba(156, 163, 175, 0.5);
                                                border-radius: 3px;
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                                background-color: rgba(156, 163, 175, 0.8);
                                            }
                                        `}</style>
                                            <div className="overflow-y-auto custom-scrollbar flex-1">
                                                {seasonData?.episodes?.map((ep, idx) => (
                                                    <div
                                                        key={ep.id}
                                                        onClick={() => onPlay({ ...currentItem, episodeNumber: ep.episode_number, seasonNumber: ep.season_number, episodeTitle: ep.name, episodes: seasonData.episodes })}
                                                        className={`flex gap-4 p-3 items-center transition-colors cursor-pointer group border-b border-border last:border-b-0 ${idx % 2 === 0 ? 'bg-surface' : 'bg-surfaceHighlight'} hover:bg-primary/10`}
                                                    >
                                                        <div className="w-32 aspect-video rounded-lg overflow-hidden bg-black/20 shrink-0 relative">
                                                            {ep.still_path ? (
                                                                <img src={`${TMDB_POSTER_BASE}${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-textMuted"><Play className="w-6 h-6" /></div>
                                                            )}
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                                <Play className="w-8 h-8 text-white fill-current" />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className="font-bold text-textMain group-hover:text-primary transition-colors">
                                                                    {ep.episode_number}. {ep.name}
                                                                </h4>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
                                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border text-xs font-medium text-gray-500 dark:text-gray-500">
                                                                    <Star className="w-3 h-3" /> {ep.vote_average?.toFixed(1)}
                                                                </span>
                                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border text-xs font-medium text-gray-500 dark:text-gray-500">
                                                                    <Clock className="w-3 h-3" /> {ep.runtime}m
                                                                </span>
                                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border text-xs font-medium text-gray-500 dark:text-gray-500">
                                                                    <Calendar className="w-3 h-3" /> {ep.air_date ? new Date(ep.air_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 leading-relaxed">{ep.overview}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); }}
                                                                className="p-2.5 rounded-full hover:bg-surfaceHighlight text-textMuted hover:text-textMain transition-colors"
                                                                title="Mark as Watched"
                                                            >
                                                                <Eye className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); }}
                                                                className="p-2.5 rounded-full hover:bg-surfaceHighlight text-textMuted hover:text-textMain transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDownloadEpisodes([ep]);
                                                                    setShowDownloadModal(true);
                                                                }}
                                                                className="p-2.5 rounded-full hover:bg-surfaceHighlight text-textMuted hover:text-textMain transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* RIGHT COLUMN (Info, Cast) */}
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">Genres & Tags</h3>
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap gap-2">
                                        {genres.map(g => (
                                            <span key={g.id} className="px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer border bg-surfaceHighlight border-border text-textMain hover:bg-border">
                                                {g.name}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {keywords.slice(0, 7).map(k => (
                                            <span key={k.id} className="px-2 py-1 rounded-md border border-border text-xs text-textMuted cursor-pointer hover:bg-surfaceHighlight hover:text-textMain transition-colors">
                                                #{k.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">Cast</h3>
                                <div className="flex flex-col gap-3">
                                    {cast.map(person => (
                                        <div key={person.id} className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-full overflow-hidden bg-surfaceHighlight shrink-0">
                                                {person.profile_path && (
                                                    <img src={`${TMDB_POSTER_BASE}${person.profile_path}`} alt={person.name} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-textMain">{person.name}</p>
                                                <p className="text-sm text-textMuted">{person.character}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">Produced By</h3>
                                <div className="flex flex-wrap gap-4 items-center">
                                    {details?.production_companies?.map(co => (
                                        co.logo_path && (
                                            <div key={co.id} className="bg-white p-2 rounded-lg h-12 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 transition-transform">
                                                <img
                                                    src={`${TMDB_POSTER_BASE}${co.logo_path}`}
                                                    alt={co.name}
                                                    className="h-full w-auto object-contain"
                                                />
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RECOMMENDATIONS */}
                    {recommendations.length > 0 && (
                        <div className="px-8 lg:px-12 pb-12">
                            <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-4">More Like This</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {recommendations.map(rec => (
                                    <MediaCard
                                        key={rec.id}
                                        item={rec}
                                        onClick={() => handleRecommendationClick(rec)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DOWNLOAD MODAL */}
            {showDownloadModal && (
                <DownloadModal
                    item={details || currentItem}
                    episodes={downloadEpisodes}
                    onClose={() => setShowDownloadModal(false)}
                    onDownload={(eps, options) => handleDownload(eps, options)}
                />
            )}
        </div>
    );
}