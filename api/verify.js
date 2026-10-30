// GET /api/verify?payment_id=pay_...
// Asks Dodo whether the payment really succeeded and what was bought.
const { KEY, ITEMS, dodo, productIds } = require("./_dodo");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!KEY) { res.status(500).json({ ok: false, error: "Payments are not set up yet" }); return; }
  const id = String((req.query && req.query.payment_id) || "");
  if (!/^pay_[A-Za-z0-9]+$/.test(id)) { res.status(400).json({ ok: false, error: "Bad payment id" }); return; }
  try {
    const p = await dodo("/payments/" + encodeURIComponent(id));
    if (p.status !== "succeeded") { res.status(200).json({ ok: false, status: p.status || "unknown" }); return; }

    let item = p.metadata && p.metadata.item;
    if (!ITEMS[item]) {
      const ids = await productIds();
      const pid = p.product_cart && p.product_cart[0] && p.product_cart[0].product_id;
      item = Object.keys(ids).find(k => ids[k] === pid);
    }
    if (!ITEMS[item]) { res.status(200).json({ ok: false, status: "unknown_item" }); return; }

    const { lives = 0, plus = false } = ITEMS[item];
    res.status(200).json({ ok: true, id, item, lives, plus });
  } catch (e) {
    console.error("verify failed", e.message, e.data);
    res.status(502).json({ ok: false, error: "Could not check payment" });
  }
};
