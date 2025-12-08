const kv = require('../utils/kv');
const { verifyAdmin } = require('../utils/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { key, admin } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).send('Forbidden');
  }

  if (!key) {
    return res.status(400).send('Missing key');
  }

  try {
    const keyData = await kv.get(key);
    if (!keyData) {
      return res.status(404).send('Key not found');
    }

    await kv.del(key);
    return res.status(200).send('Key deleted');
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).send('Internal server error');
  }
};
