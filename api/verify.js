const { getAppKey, putAppKey, validateAppId, get } = require('../utils/kv');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).send('method not allowed');
  }

  const { key, hwid, appId = 'default' } = req.query;

  if (!key || !hwid) {
    return res.status(400).send('missing key or hwid');
  }

  if (!validateAppId(appId)) {
    return res.status(400).send('invalid appId format');
  }

  try {
    // Verificar versión de la app
    const versionData = await get(`version:${appId}`);
    
    const keyData = await getAppKey(appId, key);

    if (!keyData) {
      return res.status(404).send('key not found');
    }

    // Verificar expiración
    if (keyData.expires && new Date(keyData.expires) < new Date()) {
      return res.status(403).send('key expired');
    }

    // Si es key free (no_hwid), no verificar HWID
    if (keyData.no_hwid) {
      return res.status(200).json({
        status: 'verified',
        type: 'free',
        expires: keyData.expires,
        version: versionData?.version || '1.0.0',
        versionRequired: versionData?.required || false,
        versionMessage: versionData?.message || ''
      });
    }

    // Si la key no tiene hwid, asignarla
    if (!keyData.hwid) {
      keyData.hwid = hwid;
      keyData.bound_at = new Date().toISOString();
      await putAppKey(appId, key, keyData);
      return res.status(200).json({
        status: 'bound',
        expires: keyData.expires,
        version: versionData?.version || '1.0.0',
        versionRequired: versionData?.required || false,
        versionMessage: versionData?.message || ''
      });
    }

    // Verificar que el hwid coincida
    if (keyData.hwid !== hwid) {
      return res.status(403).send('hwid mismatch');
    }

    res.status(200).json({
      status: 'verified',
      expires: keyData.expires,
      version: versionData?.version || '1.0.0',
      versionRequired: versionData?.required || false,
      versionMessage: versionData?.message || ''
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).send('Server error: ' + error.message);
  }
};
