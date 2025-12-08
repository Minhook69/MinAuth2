const kv = require('../utils/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ error: 'Missing key' });
  }

  try {
    const keyData = await kv.get(key);
    if (!keyData) {
      return res.status(404).json({ error: 'key not found' });
    }

    // Calcular días restantes
    let remainingDays = 999;
    if (keyData.expires) {
      const now = new Date();
      const expiryDate = new Date(keyData.expires);
      const diffTime = expiryDate - now;
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (remainingDays < 0) {
        return res.status(403).json({ 
          error: 'key expired',
          expired: true,
          expires: keyData.expires
        });
      }
    }

    return res.status(200).json({
      exists: true,
      hasEmail: !!keyData.email,
      email: keyData.email || null,
      hasHwid: !!keyData.hwid,
      noHwid: keyData.no_hwid || false,
      created: keyData.created,
      expires: keyData.expires,
      remainingDays: remainingDays,
      expired: false,
      emailBoundAt: keyData.email_bound_at || null
    });
  } catch (error) {
    console.error('CheckKey error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
