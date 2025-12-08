const kv = require('../utils/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Normalizar datos
  const clean = x => (x || "").trim().replace(/[\r\n]+/g, "").toUpperCase();
  const key = clean(req.query.key);
  const hwid = clean(req.query.hwid);

  if (!key || !hwid) {
    return res.status(400).send('Missing key or hwid');
  }

  try {
    // Obtener datos de la key desde KV
    const keyData = await kv.get(key);
    
    if (!keyData) {
      return res.status(404).send('key not found');
    }

    // Verificar expiración
    if (keyData.expires) {
      const now = new Date();
      const expiryDate = new Date(keyData.expires);
      
      if (now > expiryDate) {
        return res.status(403).send('key expired');
      }
    }

    // Verificar si es una key sin HWID (free)
    if (keyData.no_hwid === true) {
      return res.status(200).send('key verified');
    }

    // Primera vez: vincular HWID
    if (!keyData.hwid || keyData.hwid === "" || keyData.hwid === null) {
      keyData.hwid = hwid;
      await kv.put(key, keyData);
      return res.status(200).send('key bound to hwid');
    }

    // Verificar HWID coincide
    if (keyData.hwid === hwid) {
      return res.status(200).send('key verified');
    }

    // HWID no coincide
    return res.status(403).send('hwid mismatch');

  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).send('Internal server error');
  }
};
