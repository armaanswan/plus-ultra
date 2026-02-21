import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Navbar, MediaGrid, Player, LoadingOverlay, HeroCarousel, Settings, GenreList, DetailModal, DownloadWidget } from './components';
import { SeasonListSkeleton } from './components/Skeleton';
import SplashScreen from './components/SplashScreen';
import { saveAs } from 'file-saver';

// CONFIG
const BACKEND_URL = 'http://localhost:3001';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';

/**
 * MAIN APP COMPONENT
 */
export default function App() {
  // const [loading, setLoading] = useState(false); // Replaced by React Query isLoading
  const [streamData, setStreamData] = useState(null); // { url, poster }
  const [defaultPage, setDefaultPage] = useState(() => localStorage.getItem('defaultPage') || 'home');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('defaultPage') || 'home');
  const streamCache = useRef({}); // Cache for stream URLs
  const currentPlaybackId = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [selectedMedia, setSelectedMedia] = useState(null); // For DetailModal
  const [downloads, setDownloads] = useState([]);

  // 1. Fetch Content on Mount & Tab Change
  const { data: content, isLoading: isContentLoading } = useQuery({
    queryKey: ['content', activeTab],
    queryFn: async () => {
      if (activeTab === 'mylist' || activeTab === 'watched') {
        return { trending: [], airing: [], movies: [], classics: [] };
      }
      const endpoint = activeTab === 'anime' ? '/api/anime' : '/api/home';
      const res = await axios.get(`${BACKEND_URL}${endpoint}`);
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 10, // 10 mins
  });

  // 2. Handle Keyboard Shortcuts (Settings Toggle)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '.') {
        setShowSettings(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Handle Theme Changes
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
    };

    applyTheme();
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  // 4. Persist Default Page
  useEffect(() => {
    localStorage.setItem('defaultPage', defaultPage);
  }, [defaultPage]);

  // 5. Global Restrictions (Zoom, Selection, Right Click)
  useEffect(() => {
    // Prevent Context Menu
    const handleContextMenu = (e) => e.preventDefault();

    // Prevent Dragging
    const handleDragStart = (e) => e.preventDefault();

    // Prevent Zoom (Keyboard: Ctrl/Cmd + +/-/0)
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
        e.preventDefault();
      }
    };

    // Prevent Zoom (Wheel/Touch)
    const handleWheel = (e) => { if (e.ctrlKey) e.preventDefault(); };
    const handleTouchMove = (e) => { if (e.touches.length > 1) e.preventDefault(); };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Force Mobile Viewport
    const meta = document.querySelector('meta[name="viewport"]');
    const content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    if (meta) meta.content = content;

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // 6. Handle Card Click -> Open Modal
  const handleCardClick = (media) => {
    setSelectedMedia(media);
  };

  // 7. Handle Play Start (from Modal or Carousel)
  const startPlayback = async (media, options = {}) => {
    const playbackId = Date.now();
    currentPlaybackId.current = playbackId;

    // Extract metadata
    const title = media.title || media.name;
    const date = media.release_date || media.first_air_date;
    const releaseYear = date ? date.split('-')[0] : '';
    // Robust fallback for media type if missing
    const type = media.media_type || (media.title ? 'movie' : 'tv');

    const episodeNumber = media.episodeNumber || 1;
    const seasonNumber = media.seasonNumber || 1;
    const episodeTitle = media.episodeTitle || '';
    const totalEpisodes = media.episodes?.length || 0;

    // Get preferences from LocalStorage (defaults: Dub, 1080p)
    const audioPref = options.audio || localStorage.getItem('settings_audioLang') || 'dub';
    const qualityPref = options.quality || localStorage.getItem('settings_streamQuality') || '1080p';

    // Check Cache (1 Hour Expiry)
    const cacheKey = `${title}-${seasonNumber}-${episodeNumber}-${audioPref}-${qualityPref}`;
    const cached = streamCache.current[cacheKey];
    if (cached && (Date.now() - cached.timestamp < 60 * 60 * 1000)) {
      setStreamData({
        url: cached.url,
        poster: `${TMDB_IMAGE_BASE}${media.backdrop_path || media.poster_path}`,
        title,
        type,
        episodeNumber,
        totalEpisodes,
        seasonNumber,
        episodeTitle,
        media,
        audio: audioPref,
        quality: qualityPref
      });
      return;
    }

    // 1. Show Player Immediately (Loading State)
    setStreamData({
      url: null, // Indicates loading
      poster: `${TMDB_IMAGE_BASE}${media.backdrop_path || media.poster_path}`,
      title,
      type,
      episodeNumber,
      totalEpisodes,
      seasonNumber,
      episodeTitle,
      media, // Store original media for navigation context
      audio: audioPref,
      quality: qualityPref
    });

    try {
      const payload = {
        title,
        releaseYear,
        type,
        episodeNumber,
        seasonNumber,
        audio: audioPref,
        quality: qualityPref
      };

      const res = await axios.post(`${BACKEND_URL}/api/resolve`, payload);

      if (currentPlaybackId.current !== playbackId) return;

      if (res.data.streamUrl) {
        // Cache the result
        streamCache.current[cacheKey] = { url: res.data.streamUrl, timestamp: Date.now() };
        // 2. Update Player with Stream URL
        setStreamData(prev => ({ ...prev, url: res.data.streamUrl }));
      } else {
        alert("No stream found for this content.");
        setStreamData(null);
      }
    } catch (err) {
      if (currentPlaybackId.current !== playbackId) return;
      console.error("Resolve Error:", err);
      alert("Failed to resolve stream. Please try again.");
      setStreamData(null);
    }
  };

  // 8. Handle Download Queue
  const handleQueueDownloads = (items, meta, options) => {
    const newDownloads = items.map(item => ({
      id: Date.now() + Math.random(),
      status: 'pending',
      progress: 0,
      fileName: `${meta.title} - ${item.episode_number || item.number || 'Movie'}`,
      item,
      meta,
      options
    }));
    setDownloads(prev => [...prev, ...newDownloads]);
  };

  // 9. Process Download Queue
  useEffect(() => {
    const processNext = async () => {
      const next = downloads.find(d => d.status === 'pending');
      if (!next) return;

      setDownloads(prev => prev.map(d => d.id === next.id ? { ...d, status: 'downloading' } : d));

      try {
        const payload = {
          title: next.meta.title,
          releaseYear: next.meta.releaseYear,
          type: next.meta.type,
          episodeNumber: next.item.episode_number || next.item.number || 1,
          seasonNumber: next.meta.seasonNumber,
          audio: next.options.audio,
          quality: next.options.quality
        };

        const res = await axios.post(`${BACKEND_URL}/api/resolve`, payload);

        if (res.data.streamUrl) {
          const filename = `${payload.title} - S${String(next.meta.seasonNumber || 1).padStart(2, '0')}E${String(payload.episodeNumber).padStart(2, '0')}.mp4`;

          const response = await axios.get(`${BACKEND_URL}/download`, {
            params: {
              episodeId: res.data.providerEpisodeId,
              quality: next.options.quality,
              audio: next.options.audio,
              filename: filename
            },
            responseType: 'blob',
            onDownloadProgress: (progressEvent) => {
              const percentCompleted = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
              setDownloads(prev => prev.map(d => d.id === next.id ? { ...d, progress: percentCompleted } : d));
            }
          });

          // Check if the response is actually an error (JSON) disguised as a Blob
          if (response.data.size < 1000) {
            const text = await response.data.text();
            try {
              const json = JSON.parse(text);
              if (json.error || json.message) {
                throw new Error(json.error || json.message || "Download failed");
              }
            } catch (e) {
              // If parsing fails but file is tiny, it might still be an error text
              if (text.toLowerCase().includes("error")) throw new Error("Download failed: " + text);
            }
          }

          saveAs(response.data, filename);

          setDownloads(prev => prev.map(d => d.id === next.id ? { ...d, status: 'completed', progress: 100 } : d));
        } else {
          throw new Error("Stream not found");
        }
      } catch (err) {
        console.error("Download failed", err);
        setDownloads(prev => prev.map(d => d.id === next.id ? { ...d, status: 'error', error: err.message || 'Failed' } : d));
      }
    };

    const isDownloading = downloads.some(d => d.status === 'downloading');
    if (!isDownloading) processNext();
  }, [downloads]);

  const heroItems = useMemo(() => content?.airing?.slice(0, 12) || [], [content]);

  // Calculate IDs that are already displayed in the main sections to avoid duplicates
  const seenIds = useMemo(() => {
    if (!content) return [];
    const allItems = [...(content.trending || []), ...(content.airing || []), ...(content.movies || []), ...(content.classics || [])];
    return Array.from(new Set(allItems.map(item => item.id)));
  }, [content]);

  // Progressive Loading Sections Configuration
  const animeSections = [
    { id: 'action', title: 'Action & Adventure', genreId: 10759 },
    { id: 'scifi', title: 'Sci-Fi & Fantasy', genreId: 10765 },
    { id: 'comedy', title: 'Comedy', genreId: 35 },
    { id: 'drama', title: 'Drama & Slice of Life', genreId: 18 },
    { id: 'mystery', title: 'Mystery & Thriller', genreId: 9648 },
  ];

  // Fetch extra sections in a batch to ensure deduplication
  const { data: additionalSections, isLoading: areSectionsLoading } = useQuery({
    queryKey: ['sections_batch', activeTab, seenIds.length], // Depend on seenIds length to refetch if main content changes
    queryFn: async () => {
      if (activeTab !== 'anime' || seenIds.length === 0) return [];
      const res = await axios.post(`${BACKEND_URL}/api/sections/batch`, {
        type: 'anime',
        sections: animeSections,
        excludeIds: seenIds
      });
      return res.data;
    },
    enabled: activeTab === 'anime' && seenIds.length > 0,
    staleTime: 1000 * 60 * 60,
  });

  if (isContentLoading && !content) return <SplashScreen />;

  return (
    <div className="min-h-screen bg-background text-textMain select-none animate-in fade-in duration-700">

      {/* Global Styles for Scrollbar Hiding */}
      <style>{`
        ::-webkit-scrollbar {
          display: none;
        }
        body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setShowSettings(true)} />

      {(activeTab === 'home' || activeTab === 'anime') && content ? (
        <>
          <HeroCarousel
            items={heroItems}
            onPlay={startPlayback}
            onInfo={handleCardClick}
          />

          <GenreList />

          <MediaGrid
            title="Trending Now"
            items={content.trending}
            onPlay={handleCardClick}
          />

          <MediaGrid
            title={activeTab === 'anime' ? "Recent Movies" : "Popular Movies"}
            items={content.movies}
            onPlay={handleCardClick}
          />

          <MediaGrid
            title={activeTab === 'anime' ? "Recent Hits" : "All Time Classics"}
            items={content.classics}
            onPlay={handleCardClick}
          />

          {/* Batch Loaded Sections */}
          {activeTab === 'anime' && (
            areSectionsLoading ? (
              <div className="px-8 lg:px-12 py-4 max-w-[1600px] mx-auto space-y-12">
                {[1, 2].map(i => (
                  <div key={i}>
                    <div className="h-6 w-48 bg-surfaceHighlight rounded mb-6 animate-pulse" />
                    <SeasonListSkeleton />
                  </div>
                ))}
              </div>
            ) : (
              additionalSections?.map(section => (
                <MediaGrid key={section.id} title={section.title} items={section.items} onPlay={handleCardClick} />
              ))
            )
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-[50vh] text-textMuted">
          <p className="text-xl">Coming Soon...</p>
        </div>
      )}

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          theme={theme}
          setTheme={setTheme}
          defaultPage={defaultPage}
          setDefaultPage={setDefaultPage}
          initialTab={streamData ? 'player' : 'general'}
        />
      )}

      {/* DETAIL MODAL */}
      {selectedMedia && (
        <DetailModal
          item={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPlay={startPlayback}
          onQueueDownloads={handleQueueDownloads}
        />
      )}

      {/* VIDEO PLAYER OVERLAY */}
      {streamData && (
        <Player
          {...streamData}
          onClose={() => {
            setStreamData(null);
            currentPlaybackId.current = null;
          }}
          currentAudio={streamData.audio}
          currentQuality={streamData.quality}
          onUpdateStream={(newOptions) => startPlayback(streamData.media, { ...streamData, ...newOptions })}
          onNext={() => {
            const nextEpNum = streamData.episodeNumber + 1;
            const nextEp = streamData.media.episodes?.find(e => e.episode_number === nextEpNum);
            startPlayback({ ...streamData.media, episodeNumber: nextEpNum, episodeTitle: nextEp ? nextEp.name : null });
          }}
          onPrev={() => {
            const prevEpNum = Math.max(1, streamData.episodeNumber - 1);
            const prevEp = streamData.media.episodes?.find(e => e.episode_number === prevEpNum);
            startPlayback({ ...streamData.media, episodeNumber: prevEpNum, episodeTitle: prevEp ? prevEp.name : null });
          }}
        />
      )}

      {/* DOWNLOAD WIDGET */}
      <DownloadWidget
        downloads={downloads}
        onClose={() => setDownloads([])}
      />
    </div>
  );
}