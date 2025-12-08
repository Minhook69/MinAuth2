const kv = require('../utils/kv');

const RESET_COOLDOWN_HOURS = 24;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { key } = req.query;

  if (!key) {
    return res.status(400).send('Missing key');
  }

  try {
    const keyData = await kv.get(key);

    if (!keyData) {
      return res.status(404).send('key not found');
    }

    if (keyData.last_reset) {
      const lastReset = new Date(keyData.last_reset);
      const now = new Date();
      const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

      if (hoursSinceReset < RESET_COOLDOWN_HOURS) {
        const hoursRemaining = (RESET_COOLDOWN_HOURS - hoursSinceReset).toFixed(1);
        return res.status(429).send(`cooldown: try again in ${hoursRemaining} hours`);
      }
    }

    keyData.hwid = null;
    keyData.last_reset = new Date().toISOString();
    await kv.put(key, keyData);

    return res.status(200).send('hwid reset');
  } catch (error) {
    console.error('Reset error:', error);
    return res.status(500).send('Internal server error');
  }
};
