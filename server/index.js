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

// MIDDLEWARE
// CORS allows your React Frontend (Port 5173) to talk to this Backend (Port 3001)
app.use(cors());
// Parses incoming JSON data from React
app.use(express.json());

// ==========================================
// SECTION 1: TMDB METADATA (The "Beauty")
// These routes power your UI (Posters, Titles, Synopses)
// ==========================================

// 1. Get Trending Movies/Shows
app.get('/api/trending', async (req, res) => {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_KEY}`);
        res.json(response.data.results);
    } catch (error) {
        console.error("TMDB Error:", error.message);
        res.status(500).json({ error: "Failed to fetch trending" });
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
        const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,similar`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch details" });
    }
});

// ==========================================
// SECTION 2: THE "BINDER" (The "Brain")
// This connects TMDB data to Consumet Streams
// ==========================================

app.post('/api/resolve', async (req, res) => {
    // 1. Receive "Context" from React (e.g., "Dandadan", Year: 2024, Ep: 1)
    const { title, releaseYear, type, episodeNumber } = req.body;

    console.log(`\nRESOLVING: ${title} (${releaseYear}) - Episode ${episodeNumber}`);

    try {
        // 2. SEARCH Consumet (AnimePahe) for this title
        // We use your local scraper running on Port 3000
        const searchUrl = `${CONSUMET_URL}/anime/animepahe/${encodeURIComponent(title)}`;
        const searchRes = await axios.get(searchUrl);
        const results = searchRes.data.results;

        if (!results || results.length === 0) {
            return res.status(404).json({ error: "No anime found on AnimePahe." });
        }

        // 3. FIND THE BEST MATCH
        // We look for a result where the release year matches.
        // If no year match, we fallback to the very first result.
        const bestMatch = results.find(anime => anime.releaseDate === String(releaseYear)) || results[0];

        console.log(`\nMATCH FOUND: ${bestMatch.title} (ID: ${bestMatch.id})`);

        // 4. GET EPISODES for that specific AnimePahe ID
        const infoUrl = `${CONSUMET_URL}/anime/animepahe/info/${bestMatch.id}`;
        const infoRes = await axios.get(infoUrl);
        const episodes = infoRes.data.episodes;

        // 5. FIND THE SPECIFIC EPISODE ID
        // Note: Consumet sometimes lists episodes in reverse or weird orders, so we find by number.
        const targetEpisode = episodes.find(ep => ep.number === parseInt(episodeNumber));

        if (!targetEpisode) {
            return res.status(404).json({ error: "Episode not found." });
        }

        // 6. GET STREAM SOURCES
        const watchUrl = `${CONSUMET_URL}/anime/animepahe/watch/${targetEpisode.id}`;
        const watchRes = await axios.get(watchUrl);

        // We grab the "highest quality" or default source
        const source = watchRes.data.sources.find(s => s.quality === '1080p') || watchRes.data.sources[0];
        const referer = watchRes.data.headers.Referer;

        // 7. CONSTRUCT THE PROXY URL
        // Instead of giving React the raw (blocked) URL, we give it OUR proxy URL
        const proxyStreamUrl = `http://localhost:${PORT}/proxy?url=${encodeURIComponent(source.url)}&referer=${encodeURIComponent(referer)}`;

        // 8. SEND EVERYTHING BACK TO REACT
        res.json({
            streamUrl: proxyStreamUrl, // Feed this to ArtPlayer
            originalUrl: source.url,
            referer: referer,
            downloadUrl: watchRes.data.download // Direct download link from provider
        });

    } catch (error) {
        console.error("\nRESOLVE ERROR:", error.message);
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
                if (!line || line.startsWith('#')) return line; // Skip comments/metadata

                // If line is a URL (segment), rewrite it to pass through proxy again
                // This ensures the next video chunk ALSO has the correct headers
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
    const command = `yt-dlp --no-part --restrict-filenames -N 4 --user-agent "${userAgent}" --referer "${referer || ''}" --output "${outputPath}" "${url}"`;

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