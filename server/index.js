import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { exec, spawn } from 'child_process';
import { URL } from 'url';
import path from 'path';
import os from 'os';
import 'dotenv/config'; // Loads variables from .env file

const app = express();
const PORT = process.env.PORT || 3001;
const CONSUMET_URL = 'http://localhost:3000'; // The address of your local scraper
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;

if (!TMDB_KEY) {
    console.error("\nFATAL ERROR: TMDB_API_KEY is missing! Make sure you have a .env file in the server folder.");
}

// MIDDLEWARE
// CORS allows your React Frontend (Port 5173) to talk to this Backend (Port 3001)
app.use(cors());
// Parses incoming JSON data from React
app.use(express.json());

// ==========================================
// SECTION 1: TMDB METADATA (The "Beauty")
// These routes power your UI (Posters, Titles, Synopses)
// ==========================================

// Helper to fetch from TMDB with common params
const fetchTMDB = async (endpoint, params = {}, limit = 12) => {
    try {
        const isMovie = endpoint.includes('movie');
        const dateParam = isMovie ? 'primary_release_date.gte' : 'first_air_date.gte';

        const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
            params: {
                api_key: TMDB_KEY,
                // Removed hardcoded anime params to make this reusable
                without_genres: '10762,10751', // Exclude Kids & Family
                include_adult: true,
                [dateParam]: '2010-01-01',
                ...params
            }
        });
        return response.data.results
            .filter(item => item.backdrop_path) // Ensure images exist
            .map(item => ({
                ...item,
                media_type: item.title ? 'movie' : 'tv' // TMDB discover doesn't always return media_type
            })).slice(0, limit);
    } catch (error) {
        console.error(`TMDB Fetch Error (${endpoint}):`, error.message);
        return [];
    }
};

// 1. Get General Homepage Data (Movies & TV, No Anime)
app.get('/api/home', async (req, res) => {
    try {
        const generalParams = { without_genres: 16 }; // Exclude Animation to keep "Home" distinct from "Anime"
        const [trending, airing, movies, classics] = await Promise.all([
            // Trending TV
            fetchTMDB('/discover/tv', { sort_by: 'popularity.desc', ...generalParams }),
            // Airing Now (TV shows from last 2 months)
            fetchTMDB('/discover/tv', { 'first_air_date.gte': new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 'first_air_date.lte': new Date().toISOString().split('T')[0], sort_by: 'popularity.desc', ...generalParams }),
            // Popular Movies
            fetchTMDB('/discover/movie', { sort_by: 'popularity.desc', ...generalParams }),
            // Classics (High rated)
            fetchTMDB('/discover/tv', { sort_by: 'vote_average.desc', 'vote_count.gte': 1000, ...generalParams })
        ]);
        res.json({ trending, airing, movies, classics });
    } catch (error) {
        console.error("Home API Error:", error.message);
        res.status(500).json({ error: "Failed to fetch homepage data" });
    }
});

// 2. Get Anime Data
app.get('/api/anime', async (req, res) => {
    try {
        const animeParams = { with_genres: 16, with_original_language: 'ja' };

        const today = new Date();
        const formatDate = (d) => d.toISOString().split('T')[0];

        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        const twoYearsAgo = new Date(today);
        twoYearsAgo.setFullYear(today.getFullYear() - 2);

        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);

        const [trending, airing, recentHits, recentMovies] = await Promise.all([
            // Trending (This week)
            fetchTMDB('/discover/tv', { sort_by: 'popularity.desc', ...animeParams }),

            // Airing Now (Ongoing - last 3 months)
            fetchTMDB('/discover/tv', {
                'first_air_date.gte': formatDate(threeMonthsAgo),
                'first_air_date.lte': formatDate(today),
                sort_by: 'popularity.desc',
                ...animeParams
            }),

            // Recent Hits (Rating 7+, Votes 100+, Last 2 years)
            fetchTMDB('/discover/tv', {
                'vote_average.gte': 7,
                'vote_count.gte': 100,
                'first_air_date.gte': formatDate(twoYearsAgo),
                sort_by: 'popularity.desc',
                ...animeParams
            }),

            // Recent Movies (Last 2 years)
            fetchTMDB('/discover/movie', {
                'primary_release_date.gte': formatDate(twoYearsAgo),
                sort_by: 'popularity.desc',
                ...animeParams
            })
        ]);

        res.json({
            trending,
            airing,
            movies: recentMovies,
            classics: recentHits
        });
    } catch (error) {
        console.error("Anime API Error:", error.message);
        res.status(500).json({ error: "Failed to fetch anime data" });
    }
});

// 3. Get Specific Sections (Progressive Loading)
app.get('/api/sections/:type/:genreId', async (req, res) => {
    const { type, genreId } = req.params;
    const { excludeIds } = req.query;
    const excluded = new Set((excludeIds || '').split(',').map(Number));

    try {
        const params = {
            sort_by: 'popularity.desc',
            with_genres: genreId,
            'vote_count.gte': 50,
            'first_air_date.gte': '2010-01-01'
        };

        if (type === 'anime') {
            params.with_genres = `16,${genreId}`; // Animation + Genre
            params.with_original_language = 'ja';

            // Fetch 20 items (more than needed) to allow for filtering
            const results = await fetchTMDB('/discover/tv', params, 20);

            // Filter out excluded IDs and return top 12
            const filtered = results.filter(item => !excluded.has(item.id));
            return res.json(filtered.slice(0, 12));
        }

        res.json([]);
    } catch (error) {
        console.error(`Section Error ${type}/${genreId}:`, error.message);
        res.json([]);
    }
});

// 4. Get Batch Sections (Deduplicated)
app.post('/api/sections/batch', async (req, res) => {
    const { type, sections, excludeIds = [] } = req.body;
    const seen = new Set(excludeIds.map(Number));
    const results = [];

    try {
        // 1. Fetch raw data for all sections in parallel (Fetch 3 pages/60 items to ensure depth)
        const promises = sections.map(async (section) => {
            const params = {
                sort_by: 'popularity.desc',
                with_genres: type === 'anime' ? `16,${section.genreId}` : section.genreId,
                'vote_count.gte': 50,
                'first_air_date.gte': '2010-01-01'
            };
            if (type === 'anime') params.with_original_language = 'ja';

            const pages = await Promise.all([
                fetchTMDB('/discover/tv', { ...params, page: 1 }, 20),
                fetchTMDB('/discover/tv', { ...params, page: 2 }, 20),
                fetchTMDB('/discover/tv', { ...params, page: 3 }, 20)
            ]);
            return { ...section, items: pages.flat() };
        });

        const rawSections = await Promise.all(promises);

        // 2. Process sequentially to deduplicate
        for (const section of rawSections) {
            const uniqueItems = section.items.filter(item => !seen.has(item.id));
            const sliced = uniqueItems.slice(0, 12); // Ensure exactly 12 items

            if (sliced.length >= 12) {
                sliced.forEach(item => seen.add(item.id));
                results.push({ ...section, items: sliced });
            }
        }

        res.json(results);
    } catch (error) {
        console.error("Batch Section Error:", error.message);
        res.json([]);
    }
});

// 2. Search TMDB
app.get('/api/search', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query required" });

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`);
        res.json(response.data.results);
    } catch (error) {
        res.status(500).json({ error: "Failed to search TMDB" });
    }
});

// 3. Get Details (Season/Episode info)
app.get('/api/details/:type/:id', async (req, res) => {
    const { type, id } = req.params; // type = 'movie' or 'tv'
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,similar,recommendations,content_ratings,release_dates,keywords`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch details" });
    }
});

// 4. Get Specific Season Details (For Episode Lists)
app.get('/api/details/tv/:id/season/:seasonNumber', async (req, res) => {
    const { id, seasonNumber } = req.params;
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${TMDB_KEY}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch season details" });
    }
});

// ==========================================
// SECTION 2: THE "BINDER" (The "Brain")
// This connects TMDB data to Consumet Streams
// ==========================================

app.post('/api/resolve', async (req, res) => {
    // 1. Receive "Context" from React (e.g., "Dandadan", Year: 2024, Ep: 1)
    const { title, releaseYear, type, episodeNumber, audio, quality } = req.body;

    console.log(`\nRESOLVING: ${title} (${releaseYear}) - Episode ${episodeNumber}`);

    try {
        // 2. SEARCH Consumet (AnimePahe) for this title
        // We use your local scraper running on Port 3000
        const searchUrl = `${CONSUMET_URL}/anime/animepahe/${encodeURIComponent(title)}`;
        console.log(`[Step 2] Searching Consumet: ${searchUrl}`);
        const searchRes = await axios.get(searchUrl);
        console.log(`[Step 2] Search Status: ${searchRes.status}`);
        const results = searchRes.data.results;

        if (!results || results.length === 0) {
            console.warn("[Step 2] No results found.");
            return res.status(404).json({ error: "No anime found on AnimePahe." });
        }

        // 3. FIND THE BEST MATCH
        // We look for a result where the release year matches.
        // If no year match, we fallback to the very first result.
        const bestMatch = results.find(anime => anime.releaseDate === String(releaseYear)) || results[0];

        console.log(`\nMATCH FOUND: ${bestMatch.title} (ID: ${bestMatch.id})`);
        console.log(`[Step 3] MATCH FOUND: ${bestMatch.title} (ID: ${bestMatch.id})`);

        // 4. GET EPISODES for that specific AnimePahe ID
        const infoUrl = `${CONSUMET_URL}/anime/animepahe/info/${bestMatch.id}`;
        console.log(`[Step 4] Fetching Info: ${infoUrl}`);
        const infoRes = await axios.get(infoUrl);
        console.log(`[Step 4] Info Status: ${infoRes.status}`);
        const episodes = infoRes.data.episodes;
        console.log(`[Step 4] Found ${episodes?.length} episodes.`);

        // 5. FIND THE SPECIFIC EPISODE ID
        // Note: Consumet sometimes lists episodes in reverse or weird orders, so we find by number.
        const targetEpisode = episodes.find(ep => ep.number === parseInt(episodeNumber));

        if (!targetEpisode) {
            console.warn(`[Step 5] Episode ${episodeNumber} not found.`);
            return res.status(404).json({ error: "Episode not found." });
        }
        console.log(`[Step 5] Target Episode ID: ${targetEpisode.id}`);

        // 6. GET STREAM SOURCES
        const watchUrl = `${CONSUMET_URL}/anime/animepahe/watch?episodeId=${targetEpisode.id}`;
        console.log(`[Step 6] Fetching Sources: ${watchUrl}`);
        const watchRes = await axios.get(watchUrl);
        console.log(`[Step 6] Watch Status: ${watchRes.status}`);

        // LOGIC FROM DOCS.MD: Filter by Mode & Sort by Quality
        const sources = watchRes.data.sources;
        const referer = watchRes.data.headers?.Referer;

        if (!sources || sources.length === 0) {
            console.error("[Step 6] No sources found in response data:", watchRes.data);
            throw new Error("No sources found");
        }

        // 1. Filter by Mode (Sub/Dub)
        // Default to Sub (isDub: false) unless 'dub' is explicitly requested
        const preferDub = audio === 'dub';
        let validSources = sources.filter(s => {
            // Only filter if 'isDub' property exists (as per Docs)
            return typeof s.isDub === 'boolean' ? s.isDub === preferDub : true;
        });

        // Fallback: If no sources match preference, revert to all sources
        if (validSources.length === 0) {
            console.warn(`[Step 6] No sources found for audio: ${audio}. Falling back to all sources.`);
            validSources = sources;
        }

        // 2. Sort by Quality (High to Low) using Regex
        validSources.sort((a, b) => {
            const getQuality = (s) => {
                if (!s.quality) return 0;
                const match = s.quality.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };

            const qualityDiff = getQuality(b) - getQuality(a);
            if (qualityDiff !== 0) return qualityDiff;

            // Tie-breaker: Prefer MP4 (not m3u8) to avoid stitching overhead
            const isM3u8A = (a.isM3U8 || a.url.includes('.m3u8'));
            const isM3u8B = (b.isM3U8 || b.url.includes('.m3u8'));

            if (isM3u8A && !isM3u8B) return 1; // B (MP4) comes first
            if (!isM3u8A && isM3u8B) return -1; // A (MP4) comes first
            return 0;
        });

        let source = validSources[0]; // Default to highest available

        // If a specific quality is requested (e.g. "720p"), try to find it
        if (quality) {
            const targetNum = parseInt(quality.match(/\d+/)?.[0]);
            if (targetNum) {
                const match = validSources.find(s => {
                    const sNum = parseInt(s.quality?.match(/\d+/)?.[0] || "0");
                    return sNum === targetNum;
                });
                if (match) source = match;
            }
        }

        console.log(`[Step 6] Selected Source: ${source.quality} - ${source.url}`);

        // 7. CONSTRUCT THE PROXY URL
        // Instead of giving React the raw (blocked) URL, we give it OUR proxy URL
        const proxyStreamUrl = `http://localhost:${PORT}/proxy?url=${encodeURIComponent(source.url)}&referer=${encodeURIComponent(referer)}`;
        console.log(`[Step 7] Proxy URL: ${proxyStreamUrl}`);

        // 8. SEND EVERYTHING BACK TO REACT
        res.json({
            streamUrl: proxyStreamUrl, // Feed this to ArtPlayer
            originalUrl: source.url,
            referer: referer,
            downloadSources: watchRes.data.download, // All available MP4 download sources
            providerEpisodeId: targetEpisode.id
        });

    } catch (error) {
        console.error("\nRESOLVE ERROR:", error.message);
        if (error.response) {
            console.error("Upstream Error Data:", error.response.data);
            console.error("Upstream Error Status:", error.response.status);
        } else if (error.request) {
            console.error("No response received from upstream.");
        }
        res.status(500).json({ error: "Failed to resolve stream." });
    }
});

// ==========================================
// SECTION 3: THE PROXY & DOWNLOADER (The "Worker")
// Logic imported from your 'proxy.js'
// ==========================================

// 1. The Streaming Proxy (Bypasses CORS & Rewrites M3U8)
app.get('/proxy', async (req, res) => {
    const { url, referer } = req.query;

    if (!url) return res.status(400).send('URL is required');

    try {
        const response = await axios({
            method: 'get',
            url: url,
            headers: {
                'Referer': referer || '',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            responseType: 'stream' // CHANGED: Use stream to handle large MP4s without memory issues
        });

        const contentType = response.headers['content-type'];

        // REWRITE LOGIC: If it's a playlist (M3U8), we must rewrite internal links
        if (contentType && (contentType.includes('mpegurl') || contentType.includes('m3u8'))) {
            // Collect the stream into a buffer solely for text processing
            const chunks = [];
            for await (const chunk of response.data) {
                chunks.push(chunk);
            }
            const m3u8Content = Buffer.concat(chunks).toString('utf8');
            const baseUrl = url; // The original source URL
            const origin = `http://localhost:${PORT}`; // This server

            const modifiedContent = m3u8Content.split('\n').map(line => {
                line = line.trim();
                if (!line) return line;

                // Rewrite URI="..." in #EXT-X-KEY (Encryption Keys)
                if (line.startsWith('#')) {
                    return line.replace(/URI="([^"]+)"/g, (match, p1) => {
                        const absoluteUrl = new URL(p1, baseUrl).href;
                        return `URI="${origin}/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer || '')}"`;
                    });
                }

                // If line is a URL (segment), rewrite it to pass through proxy again
                const absoluteUrl = new URL(line, baseUrl).href;
                return `${origin}/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer || '')}`;
            }).join('\n');

            res.setHeader('Content-Type', contentType);
            return res.send(modifiedContent);
        }

        // If it's a video segment (.ts) or direct video (.mp4), pipe it directly
        if (contentType) res.setHeader('Content-Type', contentType);
        response.data.pipe(res);

    } catch (error) {
        console.error('Proxy Stream Error:', error.message);
        res.status(500).send('Error fetching stream');
    }
});

// 2. The Downloader (Uses yt-dlp)
app.get('/download', async (req, res) => {
    const { episodeId, quality, audio, filename } = req.query;
    if (!episodeId) return res.status(400).send('episodeId is required');

    try {
        // 1. Fetch sources from Consumet using the episode ID
        const watchUrl = `${CONSUMET_URL}/anime/animepahe/watch?episodeId=${episodeId}`;
        console.log(`\nFETCHING DOWNLOAD META: ${watchUrl}`);
        const watchRes = await axios.get(watchUrl);
        const downloadSources = watchRes.data.download;
        const referer = watchRes.data.headers?.Referer;

        if (!downloadSources || downloadSources.length === 0) {
            throw new Error("No MP4 download sources found from provider.");
        }

        // 2. Filter sources based on user preferences (quality & audio)
        const qualityNum = quality ? parseInt(quality.match(/\d+/)?.[0]) : 1080;
        const preferDub = audio === 'dub';
        console.log(`Filtering for: Quality ~${qualityNum}p, Audio: ${audio}`);

        const qualityRegex = new RegExp(`\\b${qualityNum}p\\b`);
        let candidates = downloadSources.filter(s => qualityRegex.test(s.quality));

        // Fallback: If no quality match, use all sources and try to match audio
        if (candidates.length === 0) {
            console.warn(`No match for ${qualityNum}p, considering all qualities.`);
            candidates = downloadSources;
        }

        let finalCandidates = preferDub
            ? candidates.filter(s => s.quality.includes('eng'))
            : candidates.filter(s => !s.quality.includes('eng'));

        // Fallback: If no audio match, use the first available in the quality tier
        const targetSource = finalCandidates[0] || candidates[0];

        if (!targetSource) {
            return res.status(404).send('No suitable download link found for your preferences.');
        }

        const downloadUrl = targetSource.url;
        const safeFilename = (filename || 'video.mp4').replace(/[^a-zA-Z0-9 \-\(\)\.]/g, '_');

        console.log(`STREAMING DOWNLOAD: ${safeFilename} (${targetSource.quality})`);

        // 3. Proxy the selected MP4 stream to the client
        const response = await axios({
            method: 'get',
            url: downloadUrl,
            headers: { 'Referer': referer || '' },
            responseType: 'stream'
        });

        // 4. Set headers to trigger browser download & show progress
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
        res.setHeader('Content-Type', 'video/mp4');

        // 5. Pipe video data to client and handle cancellation
        response.data.pipe(res);
        req.on('close', () => {
            if (response.data.destroy) response.data.destroy();
            console.log('Download cancelled by client. Upstream connection terminated.');
        });

    } catch (error) {
        console.error('Download Endpoint Error:', error.message);
        if (!res.headersSent) res.status(500).send('Error preparing download.');
    }
});

// ==========================================
// START THE SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`\nPLUS-ULTRA BRAIN ONLINE: http://localhost:${PORT}`);
    console.log(`Connected to Scraper: ${CONSUMET_URL}\n`);
});