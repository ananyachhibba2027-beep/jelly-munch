// Shared helpers for the Dodo Payments API.
// The secret key lives only in the Vercel environment variable DODO_API_KEY,
// never in the game's public code.

const KEY = process.env.DODO_API_KEY || "";
const BASE = KEY.startsWith("dodo_live_") || process.env.DODO_MODE === "live"
  ? "https://live.dodopayments.com"
  : "https://test.dodopayments.com";

// What players can buy. The product names must match the products in Dodo.
const ITEMS = {
  plus:       { name: "Jelly Munch Plus",              lives: 5,  plus: true },
  plus_early: { name: "Jelly Munch Plus (early-bird)", lives: 5,  plus: true },
  life1:      { name: "1 life",                        lives: 1 },
  life5:      { name: "5 lives",                       lives: 5 },
  life10:     { name: "10 lives",                      lives: 10 },
};

async function dodo(path, opts = {}) {
  const r = await fetch(BASE + path, {
    ...opts,
    headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
  if (!r.ok) { const err = new Error("Dodo " + r.status); err.status = r.status; err.data = data; throw err; }
  return data;
}

// Map item key -> Dodo product_id, looked up by product name (cached per instance).
let cache = null, cacheAt = 0;
async function productIds() {
  if (cache && Date.now() - cacheAt < 10 * 60 * 1000) return cache;
  const list = await dodo("/products?page_size=100");
  const items = list.items || [];
  const map = {};
  for (const [k, v] of Object.entries(ITEMS)) {
    const p = items.find(x => x.name === v.name && !x.is_archived);
    if (p) map[k] = p.product_id;
  }
  cache = map; cacheAt = Date.now();
  return map;
}

function siteOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "www.jellymunch.in";
  return "https://" + host;
}

module.exports = { KEY, ITEMS, dodo, productIds, siteOrigin };
