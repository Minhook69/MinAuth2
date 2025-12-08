const kv = require('../utils/kv');
const { verifyAdmin } = require('../utils/auth');

function generateKey(pattern = '****-****-****-****') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return pattern.split('').map(char => {
    if (char === '*') return chars.charAt(Math.floor(Math.random() * chars.length));
    return char;
  }).join('');
}

function calculateExpiry(amount, unit) {
  if (unit === 'lifetime') return null;
  
  const now = new Date();
  const multipliers = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    years: 365 * 24 * 60 * 60 * 1000
  };
  
  const multiplier = multipliers[unit] || multipliers.days;
  return new Date(now.getTime() + (amount * multiplier)).toISOString();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { admin, pattern, amount, unit, nohwid } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).send('invalid admin password');
  }

  try {
    // Generar key según el patrón
    const keyPattern = pattern || '****-****-****-****';
    const newKey = generateKey(keyPattern);
    
    // Calcular fecha de expiración
    const timeAmount = parseInt(amount) || 30;
    const timeUnit = unit || 'days';
    const expiryDate = calculateExpiry(timeAmount, timeUnit);
    
    // Determinar si es sin HWID
    const isNoHwid = nohwid === 'true';
    
    const keyData = {
      hwid: null,
      no_hwid: isNoHwid,
      last_reset: null,
      created: new Date().toISOString(),
      expires: expiryDate,
      email: ""
    };

    await kv.put(newKey, keyData);
    
    // Respuesta con información adicional
    const expiryInfo = expiryDate 
      ? ` (expires: ${new Date(expiryDate).toLocaleDateString()})` 
      : ' (lifetime)';
    const hwidInfo = isNoHwid ? ' [NO-HWID]' : ' [HWID-LOCKED]';
    
    return res.status(200).send(`${newKey}${expiryInfo}${hwidInfo}`);
  } catch (error) {
    console.error('Make error:', error);
    return res.status(500).send('Internal server error');
  }
};
