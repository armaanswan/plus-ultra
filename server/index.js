import express from 'express';
import cors from 'cors';
import axios from 'axios';
import 'dotenv/config'; // Loads variables from .env file

const app = express();
const PORT = process.env.PORT || 3001;
const HIANIME_URL = 'http://localhost:3030';
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
        const response = await axios.get(`${HIANIME_URL}/api/v1/home`);
        if (response.data.success) {
            res.json(response.data.data);
        } else {
            throw new Error('HiAnime API returned unsuccessful response');
        }
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

    // Check if ID is likely HiAnime (string/non-numeric)
    if (isNaN(Number(id))) {
        try {
            const response = await axios.get(`${HIANIME_URL}/api/v1/anime/${id}`);
            if (response.data.success) {
                return res.json(response.data.data);
            }
            throw new Error('HiAnime API error');
        } catch (error) {
            console.error("HiAnime Details Error:", error.message);
            return res.status(500).json({ error: "Failed to fetch anime details" });
        }
    }

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,similar,recommendations,content_ratings,release_dates,keywords`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch details" });
    }
});

// 3.5 Get Anime Episodes (HiAnime)
app.get('/api/anime/episodes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`${HIANIME_URL}/api/v1/episodes/${id}`);
        if (response.data.success) {
            const episodes = response.data.data.map(ep => ({
                ...ep,
                episodeId: ep.id,
                number: ep.episodeNumber
            }));
            res.json({ episodes });
        } else {
            res.json({ episodes: [] });
        }
    } catch (error) {
        console.error("Anime Episodes Error:", error.message);
        res.status(500).json({ error: "Failed to fetch episodes" });
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
    const { episodeId } = req.body;
    if (!episodeId) return res.status(400).json({ error: "Episode ID is required" });

    try {
        const { data } = await axios.get(`${HIANIME_URL}/api/v1/stream?id=${episodeId}`);
        if (!data.success) return res.status(500).json({ error: "Failed to fetch stream data" });

        const { link, tracks, intro, outro } = data.data;

        let rawVideoUrl = link.directUrl;
        if (!rawVideoUrl && link.file) {
            if (link.file.includes('?url=')) {
                const parsedUrl = new URL(link.file);
                rawVideoUrl = decodeURIComponent(parsedUrl.searchParams.get('url'));
            } else {
                rawVideoUrl = link.file;
            }
        }

        // Wrap the raw URL in your Express proxy
        const proxiedUrl = `http://localhost:3001/api/proxy?url=${encodeURIComponent(rawVideoUrl)}`;

        res.json({
            streamUrl: proxiedUrl,
            tracks,
            intro,
            outro
        });

    } catch (error) {
        console.error("Resolve Error:", error.message);
        res.status(500).json({ error: "Failed to resolve stream" });
    }
});

app.get('/api/proxy', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("URL is required");

    try {
        targetUrl = decodeURIComponent(targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'Referer': 'https://megacloud.tv/',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            }
        });

        if (!response.ok) {
            console.error(`Upstream Error: ${response.status}`);
            return res.status(response.status).send("Video source blocked the request");
        }

        // Set CORS and CORB headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        const urlString = targetUrl.toLowerCase();

        // Handle M3U8 Manifests
        if (urlString.includes('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            let manifest = await response.text();
            const baseUrl = new URL(targetUrl);

            // Regex to catch all links (chunks, keys, and variant playlists)
            // This ensures every single request goes back through OUR proxy
            manifest = manifest.replace(/^(?!#)(.+)$/gm, (line) => {
                const absolute = line.startsWith('http') ? line : new URL(line, baseUrl.href).href;
                return `http://localhost:3001/api/proxy?url=${encodeURIComponent(absolute)}`;
            });

            // Fix AES Key URIs
            manifest = manifest.replace(/URI="([^"]+)"/g, (match, uri) => {
                const absolute = uri.startsWith('http') ? uri : new URL(uri, baseUrl.href).href;
                return `URI="http://localhost:3001/api/proxy?url=${encodeURIComponent(absolute)}"`;
            });

            return res.send(manifest);
        }

        // Handle Video Chunks (.ts)
        res.setHeader('Content-Type', 'video/mp2t');
        const buffer = await response.arrayBuffer();
        return res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("Proxy Error:", error.message);
        res.status(500).send("Proxy crashed");
    }
});

// ==========================================
// START THE SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`\nPLUS-ULTRA BRAIN ONLINE: http://localhost:${PORT}`);
    console.log(`Connected to Scraper: ${HIANIME_URL}\n`);
});