const { get, validateAppId } = require('../utils/kv');

module.exports = async (req, res) => {
  const { appId = 'default' } = req.query;

  if (!validateAppId(appId)) {
    return res.status(400).json({ error: 'invalid appId format' });
  }

  try {
    const versionKey = `version:${appId}`;
    const versionData = await get(versionKey);

    if (!versionData) {
      // Versión por defecto si no existe
      return res.status(200).json({
        version: '1.0.0',
        required: false,
        message: '',
        updated: new Date().toISOString(),
        appId
      });
    }

    res.status(200).json({
      ...versionData,
      appId
    });
  } catch (err) {
    console.error('Error fetching version:', err);
    res.status(500).json({ error: 'Failed to fetch version' });
  }
};
