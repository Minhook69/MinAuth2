const kv = require('../utils/kv');
const { verifyAdmin } = require('../utils/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { key, admin } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).send('Forbidden');
  }

  if (!key) {
    return res.status(400).json({ error: 'Missing key' });
  }

  try {
    const keyData = await kv.get(key);

    if (!keyData) {
      return res.status(404).send('Key not found');
    }

    return res.status(200).json(keyData);
  } catch (error) {
    console.error('Info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
