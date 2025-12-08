const kv = require('../utils/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const versionData = await kv.get('__APP_VERSION__');
    
    if (!versionData) {
      // Versión por defecto si no existe
      const defaultVersion = {
        version: "1.0.0",
        required: true,
        message: "Please update to the latest version",
        updated: new Date().toISOString()
      };
      
      await kv.put('__APP_VERSION__', defaultVersion);
      return res.status(200).json(defaultVersion);
    }

    return res.status(200).json(versionData);
  } catch (error) {
    console.error('GetVersion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
