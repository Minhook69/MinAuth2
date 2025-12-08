const { verifyAdmin } = require('../utils/auth');
const { put, validateAppId } = require('../utils/kv');

module.exports = async (req, res) => {
  const { admin, appId = 'default', version, required, message } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!validateAppId(appId)) {
    return res.status(400).json({ error: 'invalid appId format' });
  }

  if (!version) {
    return res.status(400).json({ error: 'version is required' });
  }

  // Validar formato de versión (X.X.X)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(version)) {
    return res.status(400).json({ error: 'invalid version format (use X.X.X)' });
  }

  try {
    const versionKey = `version:${appId}`;
    const versionData = {
      version,
      required: required === 'true',
      message: message || '',
      updated: new Date().toISOString()
    };

    await put(versionKey, versionData);

    res.status(200).json({ 
      success: true, 
      ...versionData,
      appId 
    });
  } catch (err) {
    console.error('Error setting version:', err);
    res.status(500).json({ error: 'Failed to set version' });
  }
};
