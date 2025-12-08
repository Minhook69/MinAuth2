const { verifyAdmin } = require('../utils/auth');
const { getAppKeys, validateAppId } = require('../utils/kv');

module.exports = async (req, res) => {
  const { admin, appId = 'default' } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!validateAppId(appId)) {
    return res.status(400).json({ error: 'invalid appId format' });
  }

  try {
    const keys = await getAppKeys(appId);
    res.status(200).json({ keys, appId });
  } catch (err) {
    console.error('Error fetching keys:', err);
    res.status(500).json({ error: 'Failed to fetch keys', details: err.message });
  }
};
