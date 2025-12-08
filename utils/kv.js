const fetch = require('node-fetch');

const KV_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const KV_NAMESPACE_ID = process.env.CF_KV_NAMESPACE_ID;
const KV_API_TOKEN = process.env.CF_API_TOKEN;

const KV_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${KV_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}`;

const headers = {
  'Authorization': `Bearer ${KV_API_TOKEN}`,
  'Content-Type': 'application/json'
};

// Helper: construir key con prefijo de app
function buildKey(appId, key) {
  const app = appId || 'default';
  return `${app}:${key}`;
}

// Validar formato de appId
function validateAppId(appId) {
  if (!appId) return true;
  return /^[a-zA-Z0-9_-]+$/.test(appId);
}

async function get(key) {
  try {
    const response = await fetch(`${KV_BASE_URL}/values/${key}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`KV GET failed: ${response.status}`);
    const text = await response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('KV GET error:', error);
    return null;
  }
}

async function put(key, value) {
  try {
    const response = await fetch(`${KV_BASE_URL}/values/${key}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(value)
    });
    if (!response.ok) throw new Error(`KV PUT failed: ${response.status}`);
    return true;
  } catch (error) {
    console.error('KV PUT error:', error);
    return false;
  }
}

async function del(key) {
  try {
    const response = await fetch(`${KV_BASE_URL}/values/${key}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error(`KV DELETE failed: ${response.status}`);
    return true;
  } catch (error) {
    console.error('KV DELETE error:', error);
    return false;
  }
}

async function list(prefix = '') {
  try {
    const url = prefix 
      ? `${KV_BASE_URL}/keys?prefix=${encodeURIComponent(prefix)}`
      : `${KV_BASE_URL}/keys`;
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`KV LIST failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('KV LIST error:', error);
    return [];
  }
}

// Listar todas las apps disponibles
async function listApps() {
  const allKeys = await list();
  const apps = new Set();
  
  allKeys.forEach(k => {
    if (k.name.includes(':')) {
      const appId = k.name.split(':')[0];
      if (appId !== 'version') apps.add(appId); // Excluir keys de versión
    }
  });
  
  return Array.from(apps);
}

// Obtener todas las keys de una app
async function getAppKeys(appId = 'default') {
  const prefix = `${appId}:`;
  const keys = await list(prefix);
  
  const result = {};
  for (const k of keys) {
    const keyName = k.name.replace(prefix, '');
    if (keyName.startsWith('KEY-') || keyName.match(/^[A-Z0-9]{4}-/)) {
      const data = await get(k.name);
      if (data) result[keyName] = data;
    }
  }
  
  return result;
}

// Obtener info de una key específica
async function getAppKey(appId, key) {
  const fullKey = buildKey(appId, key);
  return await get(fullKey);
}

// Guardar key de una app
async function putAppKey(appId, key, value) {
  const fullKey = buildKey(appId, key);
  return await put(fullKey, value);
}

// Eliminar key de una app
async function delAppKey(appId, key) {
  const fullKey = buildKey(appId, key);
  return await del(fullKey);
}

module.exports = { 
  get, 
  put, 
  del, 
  list,
  buildKey,
  validateAppId,
  listApps,
  getAppKeys,
  getAppKey,
  putAppKey,
  delAppKey
};
