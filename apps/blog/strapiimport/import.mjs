// import.mjs
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

// ---- CONFIG ----
const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";
const STRAPI_TOKEN = "6d24dff0573ffb97339a4d9a8a9aa81c09fd86a1d2c00b85ca527fc5600d54dde6169f5b4ee019e0e3b2b7c9d4243ee8e6f80fae4e4d37cbe620aef5c0c411ab71a94327fdf8d34465b460eceb515be82d24dbf53b68aa4843ccde3366d8084a12c73a8142699cf38efe554022044252aaaf6cf2147ea1f72b7cd94fcf52d403"; // required unless VALIDATE_ONLY=1
const CSV_PATH    = process.env.CSV_PATH || "./Article.csv";
const DRY_RUN     = process.env.DRY_RUN === "1"; // set DRY_RUN=1 to test
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1"; // parse CSV and build payloads, no network

if (!STRAPI_TOKEN && !VALIDATE_ONLY) {
  console.error("Set STRAPI_TOKEN env var to your Admin API token, or run with VALIDATE_ONLY=1.");
  process.exit(1);
}

// ---- helpers ----
const headers = STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const slugify = (s="") => s
  .normalize("NFKD")
  .replace(/[^\w\s-]/g, "")
  .trim()
  .toLowerCase()
  .replace(/[-\s]+/g, "-") || null;

function normalizeSlug(input) {
  if (!input) return null;
  let s = String(input).trim();
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const u = new URL(s);
      // take last non-empty path segment
      const segs = u.pathname.split("/").filter(Boolean);
      s = segs.length ? segs[segs.length - 1] : u.hostname;
    }
  } catch {}
  // slugify and then restrict to allowed charset A-Za-z0-9-_.~
  let out = slugify(s) || s;
  out = out.replace(/[^A-Za-z0-9-_.~]/g, "-");
  // collapse duplicates and trim
  out = out.replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return out || null;
}

function coalesce(obj, keys=[]) {
  for (const k of keys) {
    if (!k) continue;
    const val = obj[k];
    if (val != null && String(val).trim() !== "") return String(val).trim();
  }
  return null;
}

function guessDate(s) {
  if (!s) return null;
  const candidates = [
    (x)=>new Date(x), // let Date parse common formats
  ];
  for (const f of candidates) {
    const d = f(s);
    if (!isNaN(d?.getTime?.())) return d.toISOString();
  }
  return null;
}

// ---- Strapi API wrappers ----
async function findOne(collection, qs) {
  if (VALIDATE_ONLY) return { data: [] };
  const url = new URL(`${STRAPI_BASE}/api/${collection}`);
  Object.entries(qs).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function create(collection, data) {
  if (VALIDATE_ONLY || DRY_RUN) return { data: { id: 0, attributes: data } };
  const res = await fetch(`${STRAPI_BASE}/api/${collection}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /${collection} -> ${res.status}\n${text}`);
  }
  return res.json();
}

async function update(collection, id, data) {
  if (VALIDATE_ONLY || DRY_RUN) return { data: { id, attributes: data } };
  const res = await fetch(`${STRAPI_BASE}/api/${collection}/${id}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT /${collection}/${id} -> ${res.status}\n${text}`);
  }
  return res.json();
}

async function upsertBy(collection, uniqueField, value, payload) {
  const q = await findOne(collection, {
    "pagination[limit]": "1",
    [`filters[${uniqueField}][$eq]`]: value,
  });
  const existing = q?.data?.[0];
  if (existing) {
    try {
      return await update(collection, existing.id, payload);
    } catch (e) {
      console.warn(`Update failed for ${collection} id=${existing.id}, attempting create instead:`, e.message);
      try {
        return await create(collection, payload);
      } catch (e2) {
        // If create fails due to unique, re-fetch and return existing
        if (String(e2.message||"").includes("must be unique")) {
          const again = await findOne(collection, {
            "pagination[limit]": "1",
            [`filters[${uniqueField}][$eq]`]: value,
          });
          return again;
        }
        throw e2;
      }
    }
  } else {
    try {
      return await create(collection, payload);
    } catch (e3) {
      if (String(e3.message||"").includes("must be unique")) {
        const again = await findOne(collection, {
          "pagination[limit]": "1",
          [`filters[${uniqueField}][$eq]`]: value,
        });
        return again;
      }
      throw e3;
    }
  }
}

async function uploadFromUrl(imageUrl) {
  if (!imageUrl) return null;
  try {
    if (VALIDATE_ONLY || DRY_RUN) return null;
    if (typeof imageUrl !== 'string' || !/^https?:\/\//i.test(imageUrl)) return null;
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    const filename = path.basename(new URL(imageUrl).pathname || "image.jpg");
    const form = new FormData();
    form.append("files", new Blob([buf]), filename);
    const up = await fetch(`${STRAPI_BASE}/api/upload`, {
      method: "POST",
      headers,
      body: form
    });
    if (!up.ok) {
      const t = await up.text();
      console.warn("Upload failed:", up.status, t);
      return null;
    }
    const arr = await up.json(); // array of uploaded files
    return arr?.[0]?.id || null;
  } catch (e) {
    console.warn("uploadFromUrl error:", e.message);
    return null;
  }
}

// ---- read CSV ----
const raw = fs.readFileSync(CSV_PATH, "utf-8");
const records = parse(raw, {
  bom: true,
  columns: true,
  relax_quotes: true,
  relax_column_count: true,
  skip_empty_lines: true,
});

// Try to find column names (flexible)
const headerNames = Object.keys(records[0] || {}).map(h => h.trim());
const findHeader = (...cands) =>
  headerNames.find(h => cands.map(c=>c.toLowerCase()).includes(h.toLowerCase()))
  || headerNames.find(h => cands.some(c => h.toLowerCase().includes(c.toLowerCase())));

const COL = {
  title:   findHeader("Title","Titre"),
  excerpt: findHeader("Excerpt","Summary","Short Description","Extrait","Résumé"),
  content: findHeader("Content","Post Content","Body","HTML","Contenu"),
  date:    findHeader("Date","Post Date","Published","Date de publication"),
  slug:    findHeader("Slug","Permalink","Lien permanent"),
  image:   findHeader("Image URL","Featured Image","Thumbnail","Featured image URL","Attachment URL"),
  authFirst: findHeader("Author First Name"),
  authLast:  findHeader("Author Last Name"),
  authName:  findHeader("Author","Author Name"),
  authEmail: findHeader("Author Email","Email"),
  authAvatar:findHeader("Author Avatar","Author Image URL","avatar"),
  catName:   findHeader("Category","Categories","Primary Category","category name","Catégories","Catégory"),
  catSlug:   findHeader("Category Slug","category slug"),
  yoastPrimary: findHeader("_yoast_wpseo_primary_category")
};

let created = 0, updated = 0, skipped = 0;

console.log("Detected columns map:", COL);

// Preload a default author ID if available (use first existing author)
let DEFAULT_AUTHOR_ID = null;
try {
  const a = await findOne("authors", { "pagination[limit]": "1" });
  DEFAULT_AUTHOR_ID = a?.data?.[0]?.id || null;
} catch {}

// Track slugs processed in this run to avoid duplicate creates
const seenSlugs = new Set();

// Prefetch all existing article slugs (robust path)
async function fetchAllArticleSlugs() {
  const set = new Set();
  let page = 1;
  const pageSize = 100;
  /* eslint-disable no-constant-condition */
  while (true) {
    const res = await findOne("articles", {
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
      "fields[0]": "slug",
    });
    const items = res?.data || [];
    for (const it of items) {
      const s = it?.attributes?.slug || it?.slug;
      if (s) set.add(String(s));
    }
    const meta = res?.meta?.pagination;
    if (!meta || page >= (meta.pageCount || 0) || items.length === 0) break;
    page++;
  }
  return set;
}

const existingSlugs = VALIDATE_ONLY ? new Set() : await fetchAllArticleSlugs();

// ---- process rows ----
for (const row of records) {
  const title = coalesce(row, [COL.title]);
  if (!title) { skipped++; continue; }

  const slug = normalizeSlug(coalesce(row, [COL.slug]) || title);
  // Prefer the provided excerpt; if missing, derive from HTML content
  const content_html = coalesce(row, [COL.content]) || "";
  const stripHtml = (h) => String(h||"").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const descSrc = coalesce(row, [COL.excerpt]) || stripHtml(content_html);
  const description = (descSrc || "").slice(0, 80);
  // Choose best image URL available
  const cover_url = coalesce(row, [COL.image, 'Attachment URL']) || "";

  // Ignore incoming authors; use a default existing author if available
  const authorId = DEFAULT_AUTHOR_ID;

// Category (prefer names from Catégories; split on separators; fall back to Yoast primary if it's a name)
  let catNameRaw = coalesce(row, [COL.catName]);
  let catName = null;
  if (catNameRaw) {
    // split on common separators and pick the first non-empty token
    const token = String(catNameRaw).split(/[;,|]/).map(s=>s.trim()).find(Boolean);
    if (token && !/^\d+$/.test(token)) catName = token; // ignore pure numeric IDs
  }
  let categorySlug = coalesce(row, [COL.catSlug]);
  if (!categorySlug && catName) categorySlug = normalizeSlug(catName);

  // publishedAt
  const publishedAt = guessDate(coalesce(row, [COL.date]));

  // 1) upsert category
  let categoryId = null;
  if (categorySlug) {
    const catPayload = { name: catName || categorySlug.replace(/-/g, " "), slug: categorySlug };
    const res = await upsertBy("categories", "slug", categorySlug, catPayload);
    categoryId = res?.data?.id || null;
  }

  // 2) upload cover image
  let coverId = null;
if (cover_url) {
    coverId = await uploadFromUrl(cover_url);
  }
  // If no cover and HTML contains an <img>, try first src as fallback
  if (!coverId && content_html) {
    const m = content_html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m && /^https?:\/\//i.test(m[1])) {
      coverId = await uploadFromUrl(m[1]);
    }
  }

  // 3) build blocks dynamic zone from HTML content
  const blocks = [];
  if (content_html) {
    blocks.push({ __component: "shared.rich-text", body: content_html });
  }

  // 4) upsert article by slug
  const articlePayload = {
    title,
    description,
    slug,
    publishedAt: publishedAt || null,
    author: authorId || null,
    category: categoryId || null,
    cover: coverId || null,
    blocks,
  };

  // Check if exists
  const existingQ = await findOne("articles", {
    "pagination[limit]": "1",
    "filters[slug][$eq]": slug
  });
  const existing = existingQ?.data?.[0];

  if (seenSlugs.has(slug)) {
    // Already processed in this run; update existing in DB to avoid duplicate create
    const again = await findOne("articles", {
      "pagination[limit]": "1",
      "filters[slug][$eq]": slug
    });
    const found = again?.data?.[0];
    if (found) {
      await update("articles", found.id, articlePayload);
      updated++;
    } else {
      const createdRes = await create("articles", articlePayload);
      created++;
      existingSlugs.add(slug);
    }
  } else if (existingSlugs.has(slug) || existing) {
    // Prefer prefetch knowledge first
    const again = await findOne("articles", {
      "pagination[limit]": "1",
      "filters[slug][$eq]": slug
    });
    const found = again?.data?.[0];
    if (found) {
      await update("articles", found.id, articlePayload);
      updated++;
    } else {
      const createdRes = await create("articles", articlePayload);
      created++;
      existingSlugs.add(slug);
    }
  } else {
    const createdRes = await create("articles", articlePayload);
    created++;
    existingSlugs.add(slug);
  }
  seenSlugs.add(slug);

  // polite throttle to avoid hammering /upload
  await sleep(50);
}

console.log(`Done. created=${created}, updated=${updated}, skipped=${skipped}`);
