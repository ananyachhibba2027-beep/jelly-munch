// Shared helpers for the Dodo Payments API.
// The secret key lives only in the Vercel environment variable DODO_API_KEY,
// never in the game's public code.

const KEY = process.env.DODO_API_KEY || "";
// Test keys start with "dodo_test_"; any other key is treated as a live key.
const BASE = KEY.startsWith("dodo_test_") && process.env.DODO_MODE !== "live"
  ? "https://test.dodopayments.com"
  : "https://live.dodopayments.com";

// What players can buy. Names must match the products in Dodo.
// Items with a price are created in Dodo automatically if they're missing.
const ITEMS = {
  plus:       { name: "Jelly Munch Plus",              lives: 5, plus: true, price: 14900, desc: "Endless levels forever, 7 max lives with faster refills, plus 5 bonus lives" },
  plus_early: { name: "Jelly Munch Plus (early-bird)", lives: 5, plus: true, price: 9900,  desc: "Jelly Munch Plus at the 48-hour early-bird price" },
  refill:     { name: "Lives refill (full)",           refill: true,          price: 4900,  desc: "Instantly refill all your Jelly Munch lives" },
  unlim2h:    { name: "Unlimited lives 2h",            unlimMs: 2*3600*1000,  price: 7900,  desc: "Play Jelly Munch with unlimited lives for 2 hours" },
  // Dodo rejects payments under 0.50 USD, so these old low prices are kept only to verify past payments.
  refill_old: { name: "Refill all lives", refill: true },
  unlim_old:  { name: "Unlimited lives (2 hours)", unlimMs: 2*3600*1000 },
  try1:       { name: "Extra try",                     cont: true,                           desc: "One more try to finish your Jelly Munch level, keeping your fruits" },
  // older packs, kept so earlier payments can still be verified
  life1:      { name: "1 life",   lives: 1 },
  life5:      { name: "5 lives",  lives: 5 },
  life10:     { name: "10 lives", lives: 10 },
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
    let p = items.find(x => x.name === v.name && !x.is_archived);
    if (!p && v.price) {
      try {
        p = await dodo("/products", { method: "POST", body: JSON.stringify({
          name: v.name, description: v.desc || v.name, tax_category: "digital_products",
          price: { type: "one_time_price", currency: "INR", price: v.price, discount_bps: 0, purchasing_power_parity: false, tax_inclusive: true },
        }) });
      } catch (e) { console.error("create product failed", v.name, e.message, e.data); }
    }
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
