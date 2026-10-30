// POST /api/checkout  { item: "plus" | "plus_early" | "life1" | "life5" | "life10", email? }
// Creates a Dodo checkout session and returns { url } to send the player to.
const { KEY, ITEMS, dodo, productIds, siteOrigin } = require("./_dodo");

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }
  if (!KEY) { res.status(500).json({ error: "Payments are not set up yet" }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const item = String(body.item || "");
    if (!ITEMS[item]) { res.status(400).json({ error: "Unknown item" }); return; }

    const ids = await productIds();
    if (!ids[item]) { res.status(500).json({ error: "Product not found in Dodo: " + ITEMS[item].name }); return; }

    const origin = siteOrigin(req);
    const payload = {
      product_cart: [{ product_id: ids[item], quantity: 1 }],
      return_url: origin + "/?paid=" + item,
      cancel_url: origin + "/?paid=cancel",
      metadata: { item },
    };
    const email = String(body.email || "").trim();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) payload.customer = { email };

    const s = await dodo("/checkouts", { method: "POST", body: JSON.stringify(payload) });
    if (!s.checkout_url) throw new Error("No checkout_url");
    res.status(200).json({ url: s.checkout_url });
  } catch (e) {
    console.error("checkout failed", e.message, e.data);
    res.status(502).json({ error: "Could not start checkout" });
  }
};
