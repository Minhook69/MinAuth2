const kv = require('../utils/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const appsData = await kv.get('__APPS_LIST__');
    
    if (!appsData || !appsData.apps) {
      // Lista por defecto si no existe
      const defaultApps = {
        apps: [
          {
            id: 'default',
            name: 'Default App',
            created: new Date().toISOString()
          }
        ],
        updated: new Date().toISOString()
      };
      
      await kv.put('__APPS_LIST__', defaultApps);
      return res.status(200).json(defaultApps);
    }

    return res.status(200).json(appsData);
  } catch (error) {
    console.error('GetApps error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
