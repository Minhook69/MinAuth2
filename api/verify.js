const kv = require('../utils/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Normalize data
  const clean = x => (x || "").trim().replace(/[\r\n]+/g, "");
  const key = clean(req.query.key).toUpperCase();
  const hwid = clean(req.query.hwid);

  if (!key || !hwid) {
    return res.status(400).send('Missing key or hwid');
  }

  try {
    // Always parse JSON from KV
    let keyRaw = await kv.get(key);
    if (!keyRaw) return res.status(404).send('key not found');

    let keyData;
    try { keyData = JSON.parse(keyRaw); }
    catch { return res.status(500).send('Corrupted key data'); }

    // Expiration check
    if (keyData.expires && Date.now() > keyData.expires) {
      return res.status(403).send('expired');
    }

    // First time = bind HWID
    if (!keyData.hwid || keyData.hwid === "") {
      keyData.hwid = hwid;
      await kv.put(key, JSON.stringify(keyData));
      return res.status(200).send('key bound to hwid');
    }

    // Verify HWID
    if (keyData.hwid === hwid) {
      return res.status(200).send('key verified');
    }

    return res.status(403).send('hwid mismatch');

  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).send('Internal server error');
  }
};
