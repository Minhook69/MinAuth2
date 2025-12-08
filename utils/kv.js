const fetch = require('node-fetch');

const KV_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const KV_NAMESPACE_ID = process.env.CF_KV_NAMESPACE_ID;
const KV_API_TOKEN = process.env.CF_API_TOKEN;

const KV_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${KV_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}`;

const headers = {
  'Authorization': `Bearer ${KV_API_TOKEN}`,
  'Content-Type': 'application/json'
};

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

async function list() {
  try {
    const response = await fetch(`${KV_BASE_URL}/keys`, { headers });
    if (!response.ok) throw new Error(`KV LIST failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('KV LIST error:', error);
    return [];
  }
}

module.exports = { get, put, del, list };
