// categories.mjs
import fs from "node:fs";
import { parse } from "csv-parse/sync";

// Config
const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";
const STRAPI_TOKEN = "6d24dff0573ffb97339a4d9a8a9aa81c09fd86a1d2c00b85ca527fc5600d54dde6169f5b4ee019e0e3b2b7c9d4243ee8e6f80fae4e4d37cbe620aef5c0c411ab71a94327fdf8d34465b460eceb515be82d24dbf53b68aa4843ccde3366d8084a12c73a8142699cf38efe554022044252aaaf6cf2147ea1f72b7cd94fcf52d403"; // required unless VALIDATE_ONLY=1
const CSV_PATH = process.env.CSV_PATH || "./Articles.csv";
const DRY_RUN = process.env.DRY_RUN === "1";
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1";

if (!STRAPI_TOKEN && !VALIDATE_ONLY) {
  console.error("Set STRAPI_TOKEN or run with VALIDATE_ONLY=1.");
  process.exit(1);
}

const headers = STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {};

// Helpers
const slugify = (s = "") =>
  s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-") || null;

function normalizeSlug(input) {
  if (!input) return null;
  let s = String(input).trim();
  // Enforce Strapi allowed charset
  let out = slugify(s) || s;
  out = out.replace(/[^A-Za-z0-9-_.~]/g, "-");
  out = out.replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return out || null;
}

async function findOne(collection, qs) {
  if (VALIDATE_ONLY) return { data: [] };
  const url = new URL(`${STRAPI_BASE}/api/${collection}`);
  Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function create(collection, data) {
  if (VALIDATE_ONLY || DRY_RUN) return { data: { id: 0, attributes: data } };
  const res = await fetch(`${STRAPI_BASE}/api/${collection}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
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
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT /${collection}/${id} -> ${res.status}\n${text}`);
  }
  return res.json();
}

async function upsertCategoryBySlug(name, slug) {
  const q = await findOne("categories", {
    "pagination[limit]": "1",
    "filters[slug][$eq]": slug,
  });
  const existing = q?.data?.[0];
  const payload = { name: name || slug.replace(/-/g, " "), slug };
  if (existing) {
    try {
      return await update("categories", existing.id, payload);
    } catch (e) {
      // if update 404, treat as create
      if (String(e.message || "").includes("404")) {
        try {
          return await create("categories", payload);
        } catch (e2) {
          if (String(e2.message || "").includes("must be unique")) return q;
          throw e2;
        }
      }
      throw e;
    }
  } else {
    try {
      return await create("categories", payload);
    } catch (e3) {
      if (String(e3.message || "").includes("must be unique")) return q;
      throw e3;
    }
  }
}

// Read CSV
const raw = fs.readFileSync(CSV_PATH, "utf-8");
const records = parse(raw, {
  bom: true,
  columns: true,
  relax_quotes: true,
  relax_column_count: true,
  skip_empty_lines: true,
});

const headerNames = Object.keys(records[0] || {}).map((h) => h.trim());
const findHeader = (...cands) =>
  headerNames.find((h) => cands.map((c) => c.toLowerCase()).includes(h.toLowerCase())) ||
  headerNames.find((h) => cands.some((c) => h.toLowerCase().includes(c.toLowerCase())));

const CAT_COL =
  findHeader("Catégories", "Categories", "Category", "Primary Category", "category name") ||
  findHeader("_yoast_wpseo_primary_category");

if (!CAT_COL) {
  console.error("No category column detected.");
  process.exit(1);
}

const tokens = new Set();
for (const row of records) {
  const rawVal = row[CAT_COL];
  if (!rawVal) continue;
  String(rawVal)
    .split(/[;,|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((t) => tokens.add(t));
}

// Normalize and filter
const categories = Array.from(tokens)
  .map((name) => ({ name, slug: normalizeSlug(name) }))
  .filter((c) => c.slug && !/^\d+$/.test(c.name)); // ignore pure numeric ids

let created = 0, updated = 0, skipped = 0;

for (const c of categories) {
  try {
    const res = await upsertCategoryBySlug(c.name, c.slug);
    if (DRY_RUN || VALIDATE_ONLY) {
      created++;
    } else if (res?.data?.id) {
      // can't easily distinguish; count as created/updated optimistically
      created++;
    } else {
      updated++;
    }
  } catch (e) {
    console.warn("Category upsert failed:", c, e.message);
    skipped++;
  }
}

console.log(`Categories processed: unique=${categories.length}, created~=${created}, updated~=${updated}, skipped=${skipped}`);
