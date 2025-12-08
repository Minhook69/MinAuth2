const kv = require('../utils/kv');
const { verifyAdmin } = require('../utils/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { admin } = req.query;

  if (!verifyAdmin(admin)) {
    return res.status(403).send('Forbidden');
  }

  try {
    const allKeys = await kv.list();
    
    for (const { name } of allKeys) {
      await kv.del(name);
    }

    return res.status(200).send('All keys deleted');
  } catch (error) {
    console.error('DeleteAll error:', error);
    return res.status(500).send('Internal server error');
  }
};
