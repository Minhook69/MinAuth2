const { generateKey } = require('../utils/keyGenerator');
const { verifyAdmin } = require('../utils/auth');
const { getAppKey, putAppKey, validateAppId } = require('../utils/kv');

function calculateExpiry(amount, unit) {
  if (unit === 'lifetime') return null;
  
  const now = new Date();
  const conversions = {
    minutes: amount,
    hours: amount * 60,
    days: amount * 1440,
    weeks: amount * 10080,
    months: amount * 43200,
    years: amount * 525600
  };
  
  const minutes = conversions[unit] || amount * 1440;
  now.setMinutes(now.getMinutes() + minutes);
  return now.toISOString();
}

function applyPattern(pattern) {
  return pattern.replace(/\*/g, () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).send('method not allowed');
  }

  const { 
    admin, 
    appId = 'default',
    amount = 30,
    unit = 'days',
    pattern,
    nohwid
  } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).send('Forbidden');
  }

  if (!validateAppId(appId)) {
    return res.status(400).send('invalid appId format');
  }

  try {
    let newKey;
    let exists = true;

    do {
      newKey = pattern ? applyPattern(pattern) : generateKey();
      const existing = await getAppKey(appId, newKey);
      exists = existing !== null;
    } while (exists);

    const keyData = {
      hwid: '',
      created: new Date().toISOString(),
      expires: calculateExpiry(parseInt(amount), unit),
      last_reset: null,
      no_hwid: nohwid === 'true',
      appId: appId
    };

    await putAppKey(appId, newKey, keyData);

    const expiryStr = keyData.expires 
      ? ` (expires: ${new Date(keyData.expires).toLocaleDateString()})` 
      : ' (lifetime)';
    
    res.status(200).send(newKey + expiryStr);
  } catch (error) {
    console.error('Make error:', error);
    res.status(500).send('Server error: ' + error.message);
  }
};
