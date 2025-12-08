const kv = require('../utils/kv');
const { verifyAdmin } = require('../utils/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { admin } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).send('Forbidden');
  }

  try {
    const allKeys = await kv.list();
    const keys = {};

    for (const { name } of allKeys) {
      const data = await kv.get(name);
      if (data) {
        keys[name] = data;
      }
    }

    return res.status(200).json({ keys });
  } catch (error) {
    console.error('Dump error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
