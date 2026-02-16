import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Navbar, MediaGrid, Player, LoadingOverlay, HeroCarousel, Settings, GenreList, DetailModal } from './components';

// CONFIG
const BACKEND_URL = 'http://localhost:3001';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';

/**
 * MAIN APP COMPONENT
 */
export default function App() {
  const [content, setContent] = useState({
    trending: [],
    airing: [],
    movies: [],
    classics: []
  });
  const [loading, setLoading] = useState(false);
  const [streamData, setStreamData] = useState(null); // { url, poster }
  const [statusMsg, setStatusMsg] = useState('');
  const [defaultPage, setDefaultPage] = useState(() => localStorage.getItem('defaultPage') || 'home');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('defaultPage') || 'home');
  const dataCache = useRef({}); // Cache for tab data
  const streamCache = useRef({}); // Cache for stream URLs
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [selectedMedia, setSelectedMedia] = useState(null); // For DetailModal

  // 1. Fetch Content on Mount & Tab Change
  useEffect(() => {
    async function fetchContent() {
      if (activeTab === 'mylist' || activeTab === 'watched') {
        setContent({ trending: [], airing: [], movies: [], classics: [] });
        return;
      }

      // Check cache first for seamless switching
      if (dataCache.current[activeTab]) {
        setContent(dataCache.current[activeTab]);
        return;
      }

      // Only show global loading overlay on initial load to prevent "refresh" feel
      if (content.trending.length === 0) {
        setLoading(true);
      }

      try {
        const endpoint = activeTab === 'anime' ? '/api/anime' : '/api/home';
        const res = await axios.get(`${BACKEND_URL}${endpoint}`);
        dataCache.current[activeTab] = res.data; // Update cache
        setContent(res.data);
      } catch (err) {
        console.error("Failed to fetch content:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [activeTab]);

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
        audio: audioPref,
        quality: qualityPref
      };

      const res = await axios.post(`${BACKEND_URL}/api/resolve`, payload);

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
      console.error("Resolve Error:", err);
      alert("Failed to resolve stream. Please try again.");
      setStreamData(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-textMain select-none">

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

      {(activeTab === 'home' || activeTab === 'anime') ? (
        <>
          <HeroCarousel
            items={content.airing.slice(0, 12)}
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
        </>
      ) : (
        <div className="flex items-center justify-center h-[50vh] text-textMuted">
          <p className="text-xl">Coming Soon...</p>
        </div>
      )}

      {loading && <LoadingOverlay message={statusMsg} />}

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
        />
      )}

      {/* VIDEO PLAYER OVERLAY */}
      {streamData && (
        <Player
          {...streamData}
          onClose={() => setStreamData(null)}
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
    </div>
  );
}