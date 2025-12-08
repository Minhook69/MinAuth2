// ============================================
// MinAuth Panel - Full JavaScript Controller
// Compatible with Vercel + Cloudflare KV API
// ============================================

const App = {
  // ===== CONFIGURACIÓN =====
  API_URL: 'https://minauth2.vercel.app', // ⚠️ CAMBIA ESTO POR TU URL DE VERCEL
  adminPassword: null,
  allKeys: [],

  // ===== INICIALIZACIÓN =====
  init() {
    console.log('🔐 MinAuth Panel Initialized');
    
    // Event listeners para búsqueda y filtros
    const searchInput = document.getElementById('searchKey');
    const filterStatus = document.getElementById('filterStatus');
    
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterKeys());
    }
    
    if (filterStatus) {
      filterStatus.addEventListener('change', () => this.filterKeys());
    }

    // Enter key en inputs
    document.getElementById('adminLoginInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.login();
    });
  },

  // ===== AUTENTICACIÓN =====
  async login() {
    const input = document.getElementById('adminLoginInput');
    const status = document.getElementById('loginStatus');
    const overlay = document.getElementById('lock-overlay');
    const password = input.value.trim();

    if (!password) {
      this.showStatus(status, '❌ Enter password', 'error');
      return;
    }

    this.showStatus(status, '⏳ Authenticating...', 'info');

    try {
      // Probar con el endpoint /api/ping primero
      const pingResponse = await fetch(`${this.API_URL}/api/ping`);
      
      if (!pingResponse.ok) {
        throw new Error('API not responding');
      }

      // Probar creando una key de prueba para validar password
      const testResponse = await fetch(`${this.API_URL}/api/make?admin=${encodeURIComponent(password)}`);
      
      if (testResponse.status === 403) {
        this.showStatus(status, '❌ Invalid password', 'error');
        input.value = '';
        return;
      }

      if (!testResponse.ok) {
        throw new Error('Authentication failed');
      }

      // Password correcto
      this.adminPassword = password;
      this.showStatus(status, '✅ Access granted', 'success');
      
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
          this.switchTab('generate');
        }, 300);
      }, 800);

    } catch (error) {
      console.error('Login error:', error);
      this.showStatus(status, '❌ Connection failed', 'error');
    }
  },

  // ===== NAVEGACIÓN =====
  switchTab(tabName) {
    // Ocultar todos los tabs
    ['tab-generate', 'tab-manage', 'tab-tools'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Mostrar tab seleccionado
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
      activeTab.classList.remove('hidden');
    }

    // Actualizar botones de navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[onclick="App.switchTab('${tabName}')"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Si es la pestaña de manage, cargar keys automáticamente
    if (tabName === 'manage') {
      this.loadKeys();
    }
  },

  // ===== GENERAR KEYS =====
  async makeKey(isFree) {
    const daysInput = isFree ? 
      document.getElementById('free_key_days') : 
      document.getElementById('key_days');
    
    const resultDiv = isFree ? 
      document.getElementById('result-free') : 
      document.getElementById('result-std');
    
    const codeEl = isFree ? 
      document.getElementById('code-free') : 
      document.getElementById('code-std');
    
    const expiryEl = isFree ? 
      document.getElementById('expiry-free') : 
      document.getElementById('expiry-std');

    const days = parseInt(daysInput.value) || 30;

    try {
      // Generar key
      const response = await fetch(
        `${this.API_URL}/api/make?admin=${encodeURIComponent(this.adminPassword)}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate key');
      }

      const newKey = await response.text();

      // Obtener datos de la key recién creada
      const keyData = await this.getKeyInfo(newKey);

      if (!keyData) {
        throw new Error('Failed to retrieve key data');
      }

      // Calcular fecha de expiración
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      // Actualizar la key con expiración y configuración
      keyData.expires = expiryDate.toISOString();
      keyData.no_hwid = isFree;

      // Guardar cambios
      await this.updateKeyData(newKey, keyData);

      // Mostrar resultado
      codeEl.textContent = newKey;
      expiryEl.textContent = `Expires: ${expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}`;
      
      resultDiv.classList.remove('hidden');
      
      // Animar entrada
      resultDiv.style.opacity = '0';
      setTimeout(() => {
        resultDiv.style.transition = 'opacity 0.3s';
        resultDiv.style.opacity = '1';
      }, 10);

      // Limpiar input
      daysInput.value = '';

      this.showNotification(`✅ ${isFree ? 'Free' : 'Premium'} key generated`, 'success');

    } catch (error) {
      console.error('Make key error:', error);
      this.showNotification('❌ Failed to generate key', 'error');
    }
  },

  // ===== COPIAR KEY =====
  copyKey(type) {
    const codeEl = type === 'free' ? 
      document.getElementById('code-free') : 
      document.getElementById('code-std');
    
    const key = codeEl.textContent;
    
    navigator.clipboard.writeText(key).then(() => {
      this.showNotification('📋 Key copied to clipboard', 'success');
    }).catch(() => {
      this.showNotification('❌ Failed to copy', 'error');
    });
  },

  // ===== CARGAR TODAS LAS KEYS =====
  async loadKeys() {
    const keysList = document.getElementById('keysList');
    
    if (!keysList) return;

    keysList.innerHTML = '<div class="text-center text-gray-500 py-10"><i class="ri-loader-4-line animate-spin text-2xl"></i><br/>Loading...</div>';

    try {
      const response = await fetch(
        `${this.API_URL}/api/dump?admin=${encodeURIComponent(this.adminPassword)}`
      );

      if (!response.ok) {
        throw new Error('Failed to load keys');
      }

      const data = await response.json();
      this.allKeys = Object.entries(data.keys || {}).map(([key, value]) => ({
        key,
        ...value
      }));

      this.renderKeys();

    } catch (error) {
      console.error('Load keys error:', error);
      keysList.innerHTML = '<div class="text-center text-red-500 py-10">❌ Failed to load database</div>';
    }
  },

  // ===== RENDERIZAR KEYS =====
  renderKeys(filteredKeys = null) {
    const keysList = document.getElementById('keysList');
    const keys = filteredKeys || this.allKeys;

    if (keys.length === 0) {
      keysList.innerHTML = '<div class="text-center text-gray-600 py-10">No keys found</div>';
      return;
    }

    keysList.innerHTML = keys.map(item => {
      const isExpired = item.expires && new Date(item.expires) < new Date();
      const statusColor = isExpired ? 'red' : 'green';
      const statusText = isExpired ? 'Expired' : 'Active';

      return `
        <div class="glass-panel p-3 rounded-lg hover:border-brand-red/30 transition-all group">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <code class="font-mono text-brand-accent font-bold text-xs">${item.key}</code>
                <span class="w-1.5 h-1.5 rounded-full bg-${statusColor}-500"></span>
                <span class="text-[10px] text-${statusColor}-400 uppercase">${statusText}</span>
                ${item.no_hwid ? '<span class="text-[10px] bg-yellow-900/30 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30">FREE</span>' : ''}
              </div>
              
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500 mt-2">
                <div><i class="ri-cpu-line text-blue-400"></i> HWID: <span class="text-gray-400">${item.hwid || 'Not bound'}</span></div>
                <div><i class="ri-mail-line text-purple-400"></i> Email: <span class="text-gray-400">${item.email || 'None'}</span></div>
                <div><i class="ri-calendar-line text-green-400"></i> Created: <span class="text-gray-400">${item.created ? new Date(item.created).toLocaleDateString() : 'N/A'}</span></div>
                <div><i class="ri-time-line text-orange-400"></i> Expires: <span class="text-gray-400">${item.expires ? new Date(item.expires).toLocaleDateString() : 'Never'}</span></div>
              </div>
            </div>

            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onclick="App.quickAction('info', '${item.key}')" class="p-1.5 rounded bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 text-xs" title="Info">
                <i class="ri-information-line"></i>
              </button>
              <button onclick="App.quickAction('reset', '${item.key}')" class="p-1.5 rounded bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 text-xs" title="Reset HWID">
                <i class="ri-refresh-line"></i>
              </button>
              <button onclick="App.quickAction('delete', '${item.key}')" class="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 text-xs" title="Delete">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // ===== FILTRAR KEYS =====
  filterKeys() {
    const searchTerm = document.getElementById('searchKey')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';

    const filtered = this.allKeys.filter(item => {
      // Filtro de búsqueda
      const matchesSearch = 
        item.key.toLowerCase().includes(searchTerm) ||
        (item.hwid && item.hwid.toLowerCase().includes(searchTerm)) ||
        (item.email && item.email.toLowerCase().includes(searchTerm));

      // Filtro de estado
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = !item.expires || new Date(item.expires) > new Date();
      } else if (statusFilter === 'expired') {
        matchesStatus = item.expires && new Date(item.expires) < new Date();
      }

      return matchesSearch && matchesStatus;
    });

    this.renderKeys(filtered);
  },

  // ===== VERIFICAR KEY INDIVIDUAL =====
  async verifySingleKey() {
    const input = document.getElementById('verify_key_input');
    const key = input.value.trim();

    if (!key) {
      this.showNotification('❌ Enter a key', 'error');
      return;
    }

    try {
      const keyData = await this.getKeyInfo(key);

      if (!keyData) {
        this.showNotification('❌ Key not found', 'error');
        return;
      }

      const isExpired = keyData.expires && new Date(keyData.expires) < new Date();
      const info = [
        `Key: ${key}`,
        `Status: ${isExpired ? 'Expired' : 'Active'}`,
        `HWID: ${keyData.hwid || 'Not bound'}`,
        `Email: ${keyData.email || 'None'}`,
        `Type: ${keyData.no_hwid ? 'Free' : 'Premium'}`,
        `Created: ${keyData.created ? new Date(keyData.created).toLocaleString() : 'N/A'}`,
        `Expires: ${keyData.expires ? new Date(keyData.expires).toLocaleString() : 'Never'}`
      ].join('\n');

      alert(info);
      input.value = '';

    } catch (error) {
      console.error('Verify error:', error);
      this.showNotification('❌ Verification failed', 'error');
    }
  },

  // ===== ACCIONES CON KEYS =====
  async actionKey(action, inputId) {
    const input = document.getElementById(inputId);
    const key = input.value.trim();

    if (!key) {
      this.showNotification('❌ Enter a key', 'error');
      return;
    }

    const endpoints = {
      'adminReset': 'adminReset',
      'resetEmail': 'resetEmail',
      'delete': 'delete'
    };

    const endpoint = endpoints[action];
    if (!endpoint) return;

    try {
      const response = await fetch(
        `${this.API_URL}/api/${endpoint}?key=${encodeURIComponent(key)}&admin=${encodeURIComponent(this.adminPassword)}`
      );

      const result = await response.text();

      if (response.ok) {
        this.showNotification(`✅ ${result}`, 'success');
        input.value = '';
        this.loadKeys(); // Recargar lista
      } else {
        this.showNotification(`❌ ${result}`, 'error');
      }

    } catch (error) {
      console.error('Action error:', error);
      this.showNotification('❌ Action failed', 'error');
    }
  },

  // ===== ACCIONES RÁPIDAS =====
  async quickAction(action, key) {
    if (action === 'info') {
      await this.verifySingleKey();
      document.getElementById('verify_key_input').value = key;
      await this.verifySingleKey();
      return;
    }

    if (action === 'delete') {
      if (!confirm(`Delete key: ${key}?`)) return;
    }

    const actionMap = {
      'reset': 'adminReset',
      'delete': 'delete'
    };

    try {
      const response = await fetch(
        `${this.API_URL}/api/${actionMap[action]}?key=${encodeURIComponent(key)}&admin=${encodeURIComponent(this.adminPassword)}`
      );

      const result = await response.text();

      if (response.ok) {
        this.showNotification(`✅ ${result}`, 'success');
        this.loadKeys();
      } else {
        this.showNotification(`❌ ${result}`, 'error');
      }

    } catch (error) {
      console.error('Quick action error:', error);
      this.showNotification('❌ Action failed', 'error');
    }
  },

  // ===== DESCARGAR BACKUP =====
  async downloadDump() {
    try {
      const response = await fetch(
        `${this.API_URL}/api/dump?admin=${encodeURIComponent(this.adminPassword)}`
      );

      if (!response.ok) {
        throw new Error('Failed to download dump');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `minauth-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showNotification('✅ Backup downloaded', 'success');

    } catch (error) {
      console.error('Download error:', error);
      this.showNotification('❌ Download failed', 'error');
    }
  },

  // ===== VERIFICACIÓN MANUAL =====
  async manualVerify() {
    const keyInput = document.getElementById('v_key');
    const hwidInput = document.getElementById('v_hwid');
    
    const key = keyInput.value.trim();
    const hwid = hwidInput.value.trim();

    if (!key || !hwid) {
      this.showNotification('❌ Enter both key and HWID', 'error');
      return;
    }

    try {
      const response = await fetch(
        `${this.API_URL}/api/verify?key=${encodeURIComponent(key)}&hwid=${encodeURIComponent(hwid)}`
      );

      const result = await response.text();

      if (response.ok) {
        this.showNotification(`✅ ${result}`, 'success');
        keyInput.value = '';
        hwidInput.value = '';
      } else {
        this.showNotification(`❌ ${result}`, 'error');
      }

    } catch (error) {
      console.error('Manual verify error:', error);
      this.showNotification('❌ Verification failed', 'error');
    }
  },

  // ===== ELIMINAR TODA LA BASE DE DATOS =====
  async nukeDatabase() {
    const confirm1 = confirm('⚠️ WARNING: This will DELETE ALL KEYS permanently!\n\nAre you sure?');
    if (!confirm1) return;

    const confirm2 = confirm('⚠️ FINAL WARNING: This action CANNOT be undone!\n\nType YES to confirm.');
    if (!confirm2) return;

    try {
      const response = await fetch(
        `${this.API_URL}/api/deleteAll?admin=${encodeURIComponent(this.adminPassword)}`
      );

      const result = await response.text();

      if (response.ok) {
        this.showNotification('✅ Database cleared', 'success');
        this.loadKeys();
      } else {
        this.showNotification(`❌ ${result}`, 'error');
      }

    } catch (error) {
      console.error('Nuke error:', error);
      this.showNotification('❌ Operation failed', 'error');
    }
  },

  // ===== UTILIDADES =====
  async getKeyInfo(key) {
    try {
      const response = await fetch(
        `${this.API_URL}/api/info?key=${encodeURIComponent(key)}&admin=${encodeURIComponent(this.adminPassword)}`
      );
      
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  async updateKeyData(key, data) {
    // Como no tienes endpoint de update, usamos el PUT directo del KV
    // Esto requiere modificar tu API o hacer un workaround
    console.log('Update key data:', key, data);
    // Implementación depende de tu API
  },

  showNotification(message, type = 'info') {
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500'
    };

    const notif = document.createElement('div');
    notif.className = `fixed top-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium`;
    notif.textContent = message;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  },

  showStatus(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.style.opacity = '1';
    
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      info: '#3b82f6'
    };
    
    element.style.color = colors[type] || colors.info;
  }
};

// Inicializar cuando cargue el DOM
if (typeof window !== 'undefined') {
  window.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
}
