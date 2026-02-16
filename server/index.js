import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { exec } from 'child_process';
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
const fetchTMDB = async (endpoint, params = {}) => {
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
            }))
            .slice(0, 12); // Limit to 12 items
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
            return getQuality(b) - getQuality(a);
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
            downloadUrl: watchRes.data.download // Direct download link from provider
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
            responseType: 'arraybuffer' // Crucial for handling video data
        });

        const contentType = response.headers['content-type'];

        // REWRITE LOGIC: If it's a playlist (M3U8), we must rewrite internal links
        if (contentType && (contentType.includes('mpegurl') || contentType.includes('m3u8'))) {
            const m3u8Content = response.data.toString('utf8');
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

        // If it's a video segment (.ts file), just pipe it through
        if (contentType) res.setHeader('Content-Type', contentType);
        res.send(response.data);

    } catch (error) {
        console.error('Proxy Stream Error:', error.message);
        res.status(500).send('Error fetching stream');
    }
});

// 2. The Downloader (Uses yt-dlp)
app.get('/download', (req, res) => {
    const { url, referer, filename } = req.query;

    if (!url) return res.status(400).send('URL is required');

    // Dynamically find the user's Downloads folder
    const userHome = os.homedir();
    const safeFilename = (filename || 'video.mp4').replace(/[^a-zA-Z0-9 \-\(\)\.]/g, '_');
    const outputPath = path.join(userHome, 'Downloads', safeFilename);

    // Construct the yt-dlp command
    const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
    const command = `yt-dlp --no-part --restrict-filenames -N 4 --user-agent "${userAgent}" --referer "${referer || ''}" --progress --no-warnings -o "${outputPath}" "${url}"`;

    console.log(`\nSTARTING DOWNLOAD: ${safeFilename}`);

    exec(command, (error, stdout, stderr) => {
        if (error) console.error(`Download Error: ${error.message}`);
        else console.log(`\nDOWNLOAD COMPLETE: ${safeFilename}`);
    });

    res.send(`\nDownload started! Check your folder: ${outputPath}`);
});

// ==========================================
// START THE SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`\nPLUS-ULTRA BRAIN ONLINE: http://localhost:${PORT}`);
    console.log(`Connected to Scraper: ${CONSUMET_URL}\n`);
});