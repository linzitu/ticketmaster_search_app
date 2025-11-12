// server.js  — ESM 版本

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import favoritesRouter from './routes/favorite.routes.js';
import { connectToDB, getDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// === 基础配置 ===
const app = express();
const PORT = process.env.PORT || 8080;
let db;

// === 环境变量 ===
dotenv.config();
const ipinfoToken = process.env.IPINFO_TOKEN;
const tmApiKey = process.env.TM_API_KEY;
const tmBaseUrl = 'https://app.ticketmaster.com/discovery/v2';
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

// 简单的内存缓存，避免每次请求都去拿 token
let spotifyTokenCache = {
  accessToken: null,
  expiresAt: 0, // 时间戳：毫秒
};

// === 中间件 ===
app.use(cors());
app.use(express.json());

// Favorites 路由（所有 /api/favorites 开头的请求都会走 favorite.routes.js）
app.use('/api/favorites', favoritesRouter);
/* 工具函数，获取SPOTIFY访问令牌 */
async function getSpotifyAccessToken() {
  if (!spotifyClientId || !spotifyClientSecret) {
    throw new Error('Spotify client id/secret not configured');
  }

  const now = Date.now();

  // 如果缓存里还有 1 分钟以上的有效时间，就直接用缓存
  if (
    spotifyTokenCache.accessToken &&
    now < spotifyTokenCache.expiresAt - 60 * 1000
  ) {
    return spotifyTokenCache.accessToken;
  }

  // 否则重新向 Spotify 要一个 token
  const tokenUrl = 'https://accounts.spotify.com/api/token';

  const basicHeader = Buffer.from(
    `${spotifyClientId}:${spotifyClientSecret}`
  ).toString('base64');

  const resp = await axios.post(
    tokenUrl,
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicHeader}`,
      },
    }
  );

  const { access_token, expires_in } = resp.data;

  spotifyTokenCache.accessToken = access_token;
  spotifyTokenCache.expiresAt = now + expires_in * 1000;

  return access_token;
}

/* 工具函数：把 Ticketmaster 的 event 转成你前端已经在用的结构 */
function mapTmEventToFrontend(e) {
  const images = e.images || [];

  // 选 width 最大的那张图
  const bestImage = images.reduce((best, img) => {
    if (!best) return img;
    if ((img.width || 0) > (best.width || 0)) return img;
    return best;
  }, null);
  const cls = e.classifications?.[0];

  return {
    id: e.id,
    name: e.name,
    date: e.dates?.start?.localDate || '',
    time: e.dates?.start?.localTime || '',
    // 分类（比如 Music / Sports）
    genre: e.classifications?.[0]?.segment?.name || '',
    category: cls?.segment?.name || '',  // ✅ category 字段
    // 票价等你后面要的话可以再加
    venue: e._embedded?.venues?.[0]?.name || '',
    city: e._embedded?.venues?.[0]?.city?.name || '',
    state: e._embedded?.venues?.[0]?.state?.name || '',
    country: e._embedded?.venues?.[0]?.country?.name || '',
    // 封面图
    imageUrl: bestImage ? bestImage.url : '',
    // 详情页链接
    url: e.url || ''
  };
}

// === 真正的 Ticketmaster 搜索接口 ===
// 前端可以这样调：/api/events?keyword=xxx&lat=34.02&lon=-118.28&radius=10&segmentId=KZFzniwnSyZfZ7v7nJ
app.get('/api/events', async (req, res) => {
  try {
    if (!tmApiKey) {
      return res.status(500).json({ error: 'Ticketmaster API key not configured' });
    }

    // 从 query 里拿参数（根据你前端的命名来，这里用比较通用的命名）
    const {
      keyword,
      segmentId,
      radius,
      unit,
      lat,
      lon,
      city
    } = req.query;

    // Ticketmaster Discovery API 基本 URL
    const url = 'https://app.ticketmaster.com/discovery/v2/events.json';

    const params = {
      apikey: tmApiKey,
      size: 20,          // 每次最多返回多少条，可按需要调整
      sort: 'date,asc',  // ⭐ 按日期升序排序
    };

    if (keyword) params.keyword = keyword;
    if (segmentId) params.segmentId = segmentId;
    if (radius) params.radius = radius;
    if (unit) params.unit = unit;

    // 地理参数：优先使用 lat/lon，其次 city
    if (lat && lon) {
      params.latlong = `${lat},${lon}`;   // Ticketmaster 支持 latlong=lat,lon
    } else if (city) {
      params.city = city;
    }

    const tmResp = await axios.get(url, { params });

    const data = tmResp.data;

    // Ticketmaster 如果没找到，会没有 _embedded 字段
    if (!data._embedded || !data._embedded.events) {
      return res.json([]);
    }

    const events = data._embedded.events.map(mapTmEventToFrontend);

    res.json(events);

  } catch (err) {
    console.error('Error fetching Ticketmaster events:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch events from Ticketmaster' });
  }
});

// 新增：关键词自动补全接口
app.get('/api/suggest', async (req, res) => {
  const keyword = req.query.keyword;

  if (!keyword || !keyword.trim()) {
    return res.json([]);  // 没有输入时返回空数组
  }

  try {
    if (!tmApiKey) {
      return res.status(500).json({ error: 'Ticketmaster API key not configured' });
    }

    const tmUrl = 'https://app.ticketmaster.com/discovery/v2/suggest.json';

    const tmRes = await axios.get(tmUrl, {
      params: {
        apikey: tmApiKey,
        keyword: keyword.trim(),
        size: 5, //1~5
      },
    });

    const data = tmRes.data || {};

    const suggestionsSet = new Set();

    // attractions
    if (data._embedded && data._embedded.attractions) {
      data._embedded.attractions.forEach(a => {
        if (a.name) suggestionsSet.add(a.name);
      });
    }

    // events
    if (data._embedded && data._embedded.events) {
      data._embedded.events.forEach(e => {
        if (e.name) suggestionsSet.add(e.name);
      });
    }

    // venues
    if (data._embedded && data._embedded.venues) {
      data._embedded.venues.forEach(v => {
        if (v.name) suggestionsSet.add(v.name);
      });
    }

    const suggestions = Array.from(suggestionsSet).slice(0, 10); // 去重&截断

    res.json(suggestions);
  } catch (err) {
    console.error(
      'Suggest API error:',
      err.response?.status,
      JSON.stringify(err.response?.data || err.message, null, 2)
    );

    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Failed to get suggestions',
      details: err.response?.data || err.message,
    });
  }
});

// event detail 接口
app.get('/api/event/:id', async (req, res) => {
  const eventId = req.params.id;

  if (!eventId) {
    return res.status(400).json({ error: 'Missing event id' });
  }

  const url = `${tmBaseUrl}/events/${encodeURIComponent(eventId)}.json`;

  try {
    const response = await axios.get(url, {
      params: {
        apikey: tmApiKey,
        // 你想要的话可以加更多参数，比如 locale, countryCode 等
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error fetching event details:', err?.response?.data || err.message);

    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Failed to fetch event details from Ticketmaster',
    });
  }
});

// === 新增 IP 定位接口 ===
app.get('/api/ip-location', async (req, res) => {
  try {
    const url = `https://ipinfo.io/json?token=${ipinfoToken}`;
    const response = await axios.get(url);
    const data = response.data;

    if (!data.loc) {
      return res.status(500).json({ error: 'loc not found from ipinfo' });
    }

    const [latStr, lonStr] = data.loc.split(',');
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    res.json({
      lat,
      lon,
      city: data.city,
      region: data.region,
      country: data.country,
    });
  } catch (err) {
    console.error('Error fetching IP location:', err.message);
    res.status(500).json({ error: 'Failed to fetch IP location' });
  }
});

// === Spotify：按名字搜索 Artist（用于 Artist 页）===
// 1) 搜索 artist
app.get('/api/spotify/search-artist', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query q' });

  try {
    const token = await getSpotifyAccessToken();
    const resp = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q,
        type: 'artist',
        limit: 1,
      },
    });

    const artist = resp.data?.artists?.items?.[0];
    if (!artist) return res.json(null);

    const mapped = {
      id: artist.id,
      name: artist.name,
      followers: artist.followers?.total || 0,
      popularity: artist.popularity ?? null,
      genres: artist.genres || [],
      imageUrl: artist.images?.[0]?.url || '',
      spotifyUrl: artist.external_urls?.spotify || '',
    };

    res.json(mapped);
  } catch (err) {
    console.error('Error searching Spotify artist:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to search artist from Spotify' });
  }
});

// 2) 根据 artist id 拿 albums —— 路径一定要是 /api/spotify/artist-albums/:id
app.get('/api/spotify/artist-albums/:id', async (req, res) => {
  const artistId = req.params.id;
  if (!artistId) return res.status(400).json({ error: 'Missing artist id' });

  try {
    const token = await getSpotifyAccessToken();
    const resp = await axios.get(
      `https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}/albums`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          include_groups: 'album,single',
          limit: 30,
          market: 'US',
        },
      }
    );

    const albums = (resp.data.items || []).map((a) => ({
      id: a.id,
      name: a.name,
      releaseDate: a.release_date,
      totalTracks: a.total_tracks,
      imageUrl: a.images?.[0]?.url || '',
      spotifyUrl: a.external_urls?.spotify || '',
    }));

    res.json(albums);
  } catch (err) {
    console.error('Error fetching artist albums:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch artist albums from Spotify' });
  }
});

// ========= 静态资源 + 前端路由 fallback =========

// 1. 找到 Angular build 出来的目录
const angularDistPath = path.join(
  process.cwd(),
  'frontend',
  'dist',
  'hw3-frontend-angular' // ← 这里替换成真实名称
);

console.log('Serving Angular from:', angularDistPath);

// 2. 先托管静态文件（main.xxx.js、styles.xxx.css 等）
app.use(express.static(angularDistPath));

// 3. 再用一个正则兜底：匹配所有“不是 /api/ 开头”的路径，返回 index.html
// 兜底路由：只处理前端路由，不拦截 /api/* 和带 . 的静态资源
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  // 带 . 的（.js .css .png 等）交给静态资源处理
  if (req.path.includes('.')) {
    return next();
  }

  // 其它非 /api/ 路径（/search, /favorites, /event/xxx...）都返回 index.html
  res.sendFile(path.join(angularDistPath, 'index.html'));
});

// ========= 最后：仅保留这一处启动逻辑 =========
async function start() {
  try {
    db = await connectToDB();   // 只在这里连一次 Mongo
    console.log('Database ready');

    app.listen(PORT, () => {
      console.log(`✅ Backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to DB at startup:', err);
    process.exit(1);
  }
}

start();