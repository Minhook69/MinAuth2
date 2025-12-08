const kv = require('../utils/kv');
const { verifyAdmin } = require('../utils/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { admin, version, required, message } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!version) {
    return res.status(400).json({ error: 'Missing version' });
  }

  // Validar formato de versión (X.X.X)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(version)) {
    return res.status(400).json({ error: 'Invalid version format. Use X.X.X (e.g., 1.0.0)' });
  }

  try {
    const versionData = {
      version: version,
      required: required === 'true',
      message: message || "Please update to the latest version",
      updated: new Date().toISOString()
    };

    await kv.put('__APP_VERSION__', versionData);

    return res.status(200).json({
      success: true,
      data: versionData
    });
  } catch (error) {
    console.error('SetVersion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
