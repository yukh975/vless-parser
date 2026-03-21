// ============================================================
//  Theme
// ============================================================

const LS_THEME = 'xray_theme';
const ICON_SUN  = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const ICON_MOON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

let currentTheme = localStorage.getItem(LS_THEME) || 'dark';

function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LS_THEME, theme);
    const btn = document.getElementById('theme-btn');
    if (btn) {
        if (theme === 'dark') {
            btn.innerHTML = ICON_SUN;
            btn.title = t('theme_to_light');
        } else {
            btn.innerHTML = ICON_MOON;
            btn.title = t('theme_to_dark');
        }
    }
}

document.getElementById('theme-btn')?.addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// ============================================================
//  Language state
// ============================================================

const LS_LANG = 'vless_parser_lang';
let currentLang = localStorage.getItem(LS_LANG) || 'en';

function t(key, ...args) {
    const val = TRANSLATIONS[currentLang][key];
    return typeof val === 'function' ? val(...args) : (val ?? key);
}

function applyLang() {
    document.documentElement.lang = currentLang;

    // Update plain text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });

    // Update elements that contain HTML (e.g. subtitle with <code>)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.dataset.i18nHtml);
    });

    // Update title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });

    // Highlight the active language button (header + help modal)
    document.getElementById('lang-en').classList.toggle('active', currentLang === 'en');
    document.getElementById('lang-ru').classList.toggle('active', currentLang === 'ru');
    document.getElementById('help-lang-en').classList.toggle('active', currentLang === 'en');
    document.getElementById('help-lang-ru').classList.toggle('active', currentLang === 'ru');
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LS_LANG, lang);
    applyLang();

    // Re-render rule rows so all dynamic picker strings update
    const rules = collectRules();
    rulesContainer.innerHTML = '';
    rules.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
    updateActionSelects();

    // Re-render DNS servers then rules
    const dnsServers = collectDnsServers();
    const dnsRules   = collectDnsRules();
    dnsServersEl.innerHTML = '';
    dnsServers.forEach(s => dnsServersEl.appendChild(createDnsServerRow(s)));
    dnsRulesEl.innerHTML = '';
    dnsRules.forEach(r => dnsRulesEl.appendChild(createDnsRuleRow(r)));
    updatePresetBtn();
}

document.getElementById('lang-en').addEventListener('click', () => setLang('en'));
document.getElementById('lang-ru').addEventListener('click', () => setLang('ru'));
document.getElementById('help-lang-en').addEventListener('click', () => setLang('en'));
document.getElementById('help-lang-ru').addEventListener('click', () => setLang('ru'));

// ============================================================
//  Constants & defaults
// ============================================================

const DEFAULT_DATABASES = ['geosite.dat', 'geoip.dat']; // fallback if server unavailable

const DNS_PRESETS = {
    google_doh:     'https://8.8.8.8/dns-query',
    cloudflare_doh: 'https://1.1.1.1/dns-query',
    yandex_doh:     'https://77.88.8.8/dns-query',
    google_dns:     '8.8.8.8',
    cloudflare_dns: '1.1.1.1',
    yandex_dns:     '77.88.8.8',
};

const DEFAULT_RULES = [
    { db: 'geoip.dat',   values: ['private'],          action: 'direct' },
    { db: 'geosite.dat', values: ['ru'],               action: 'direct' },
    { db: 'geoip.dat',   values: ['ru'],               action: 'direct' },
    { db: 'geosite.dat', values: ['category-ads-all'], action: 'block'  },
];

const ROUTE_PRESETS = [
    {
        id: 'preset_russia',
        rules: [
            { db: 'geoip.dat',   values: ['private'],          action: 'direct' },
            { db: 'geosite.dat', values: ['ru'],               action: 'direct' },
            { db: 'geoip.dat',   values: ['ru'],               action: 'direct' },
            { db: 'geosite.dat', values: ['category-ads-all'], action: 'block'  },
        ],
    },
    {
        id: 'preset_iran',
        rules: [
            { db: 'geoip.dat',      values: ['private'], action: 'direct' },
            { db: 'geosite_IR.dat', values: ['ir'],      action: 'direct' },
            { db: 'geoip_IR.dat',   values: ['ir'],      action: 'direct' },
        ],
    },
    {
        id: 'preset_ads',
        rules: [
            { db: 'geosite.dat', values: ['category-ads-all'], action: 'block' },
        ],
    },
    {
        id: 'preset_all_proxy',
        rules: [],
        outbound: 'proxy',
    },
    {
        id: 'preset_bittorrent',
        rules: [],
        bittorrent: true,
    },
];

// ============================================================
//  DOM refs
// ============================================================

const form           = document.getElementById('vless-form');
const submitBtn      = document.getElementById('submit-btn');
const clearBtn       = document.getElementById('clear-btn');
const resultBox      = document.getElementById('result');
const resultPre      = document.getElementById('result-json');
const copyBtn        = document.getElementById('copy-btn');
const downloadBtn    = document.getElementById('download-btn');
const errorBox       = document.getElementById('error');
const errorBackdrop  = document.getElementById('error-backdrop');
const errorText      = document.getElementById('error-text');

const vlessList      = document.getElementById('vless-list');
const dbListEl       = document.getElementById('db-list');
const rulesContainer = document.getElementById('routing-rules');
const addRuleBtn     = document.getElementById('add-rule-btn');
const dnsServersEl    = document.getElementById('dns-servers-list');
const dnsRulesEl      = document.getElementById('dns-rules-list');
const addDnsServerBtn = document.getElementById('add-dns-server-btn');
const addDnsRuleBtn   = document.getElementById('add-dns-rule-btn');
const routingFields   = document.getElementById('routing-fields');

// ============================================================
//  State
// ============================================================

let databases = [];

// ============================================================
//  LocalStorage persistence
// ============================================================

const LS_KEY = 'vless_parser_state';

function saveState() {
    const state = {
        inbound_ip:       document.getElementById('inbound_ip').value,
        inbound_port:     document.getElementById('inbound_port').value,
        http_inbound_enabled: !httpInboundRow.classList.contains('hidden'),
        http_inbound_ip:      document.getElementById('http_inbound_ip').value,
        http_inbound_port:    document.getElementById('http_inbound_port').value,
        socks5_auth:       document.getElementById('socks5_auth').checked,
        socks5_user:       document.getElementById('socks5_user').value,
        socks5_pass:       document.getElementById('socks5_pass').value,
        vless_entries:     collectVlessEntries(),
        balancer_enabled:             document.getElementById('balancer_enabled')?.checked ?? false,
        balancer_strategy:            document.getElementById('balancer_strategy')?.value  ?? 'random',
        observatory_probe_url:        document.getElementById('observatory_probe_url')?.value        ?? 'https://www.google.com/generate_204',
        observatory_probe_interval:   document.getElementById('observatory_probe_interval')?.value   ?? '10s',
        sniffing_enabled:          document.getElementById('sniffing_enabled').checked,
        sniffing_dest_http:        document.getElementById('sniffing_dest_http').checked,
        sniffing_dest_tls:         document.getElementById('sniffing_dest_tls').checked,
        sniffing_dest_quic:        document.getElementById('sniffing_dest_quic').checked,
        sniffing_dest_bittorrent:  document.getElementById('sniffing_dest_bittorrent').checked,
        sniffing_route_only:       document.getElementById('sniffing_route_only').checked,
        routing_enabled:   document.getElementById('routing_enabled').checked,
        block_bittorrent:  document.getElementById('block_bittorrent').checked,
        default_outbound:  document.getElementById('default_outbound').value,
        domain_strategy:   document.getElementById('domain_strategy').value,
        dns_enabled:          document.getElementById('dns_enabled').checked,
        dns_query_strategy:    document.getElementById('dns_query_strategy').value,
        dns_domain_strategy:    document.getElementById('dns_domain_strategy').value,
        dns_fallback_preset:  dnsFallbackPreset.value,
        dns_fallback_custom:  dnsFallbackCustom.value,
        dns_servers:          collectDnsServers(),
        dns_rules:            collectDnsRules(),
        mux_enabled:            document.getElementById('mux_enabled').checked,
        mux_concurrency:        document.getElementById('mux_concurrency').value,
        mux_xudp_concurrency:   document.getElementById('mux_xudp_concurrency').value,
        mux_xudp_proxy_udp443:  document.getElementById('mux_xudp_proxy_udp443').value,
        log_enabled:       document.getElementById('log_enabled').checked,
        log_dir:           document.getElementById('log_dir').value,
        log_level:         document.getElementById('log_level').value,
        rules:             collectRules(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
}

document.addEventListener('input', saveState);
document.addEventListener('change', saveState);

// Toggle password visibility
const EYE_OPEN   = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

document.getElementById('reveal-pass').addEventListener('click', (e) => {
    const btn   = e.currentTarget;
    const input = document.getElementById('socks5_pass');
    const show  = input.type === 'password';
    input.type   = show ? 'text' : 'password';
    btn.innerHTML = show ? EYE_CLOSED : EYE_OPEN;
});

// Fallback DNS preset/custom toggle
const dnsFallbackPreset = document.getElementById('dns_fallback_preset');
const dnsFallbackCustom = document.getElementById('dns_fallback_custom');

dnsFallbackPreset.addEventListener('change', () => {
    dnsFallbackCustom.classList.toggle('hidden', dnsFallbackPreset.value !== 'custom');
    saveState();
});

function getFallbackValue() {
    return dnsFallbackPreset.value === 'custom'
        ? dnsFallbackCustom.value.trim()
        : dnsFallbackPreset.value;
}

// Toggle Mux fields visibility
const muxEnabledCheckbox = document.getElementById('mux_enabled');
const muxFields          = document.getElementById('mux-fields');

muxEnabledCheckbox.addEventListener('change', () => {
    muxFields.classList.toggle('hidden', !muxEnabledCheckbox.checked);
});

// Toggle sniffing fields visibility
const sniffingEnabledCheckbox = document.getElementById('sniffing_enabled');
const sniffingFields          = document.getElementById('sniffing-fields');

sniffingEnabledCheckbox.addEventListener('change', () => {
    sniffingFields.classList.toggle('hidden', !sniffingEnabledCheckbox.checked);
});

// Toggle routing fields visibility
const routingEnabledCheckbox = document.getElementById('routing_enabled');

routingEnabledCheckbox.addEventListener('change', () => {
    routingFields.classList.toggle('hidden', !routingEnabledCheckbox.checked);
});

// Toggle DNS fields visibility
const dnsEnabledCheckbox = document.getElementById('dns_enabled');
const dnsFields          = document.getElementById('dns-fields');

dnsEnabledCheckbox.addEventListener('change', () => {
    dnsFields.classList.toggle('hidden', !dnsEnabledCheckbox.checked);
});

// HTTP inbound add / remove
const httpInboundRow       = document.getElementById('http-inbound-row');
const addHttpInboundBtn    = document.getElementById('add-http-inbound-btn');
const removeHttpInboundBtn = document.getElementById('remove-http-inbound-btn');

addHttpInboundBtn.addEventListener('click', () => {
    httpInboundRow.classList.remove('hidden');
    addHttpInboundBtn.classList.add('hidden');
    saveState();
});

removeHttpInboundBtn.addEventListener('click', () => {
    httpInboundRow.classList.add('hidden');
    addHttpInboundBtn.classList.remove('hidden');
    saveState();
});

// Toggle SOCKS5 auth fields visibility
const socks5AuthCheckbox = document.getElementById('socks5_auth');
const socks5AuthFields   = document.getElementById('socks5-auth-fields');

socks5AuthCheckbox.addEventListener('change', () => {
    socks5AuthFields.classList.toggle('hidden', !socks5AuthCheckbox.checked);
});

// Toggle logging fields visibility
const logEnabledCheckbox = document.getElementById('log_enabled');
const logFields          = document.getElementById('log-fields');

logEnabledCheckbox.addEventListener('change', () => {
    logFields.classList.toggle('hidden', !logEnabledCheckbox.checked);
});

// ============================================================
//  Auto-resize textarea
// ============================================================

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// ============================================================
//  VLESS entry list
// ============================================================

function getVlessTag(name, index) {
    const n = (name || '').trim();
    if (n) return n;
    return index === 0 ? 'proxy' : 'proxy' + (index + 1);
}

function getProxyOptions() {
    const rows = [...vlessList.querySelectorAll('.vless-row')];
    if (rows.length === 0) return [{ value: 'proxy', label: 'proxy' }];
    return rows.map((row, i) => {
        const name = row.querySelector('.vless-name').value.trim();
        const tag  = getVlessTag(name, i);
        return { value: tag, label: tag };
    });
}

function populateActionSelect(select, currentValue) {
    const current = currentValue ?? select.value;
    const balancerEnabled = document.getElementById('balancer_enabled')?.checked;
    select.innerHTML = '';
    const opts = [
        { value: 'direct', label: 'direct' },
        ...getProxyOptions(),
        { value: 'block',  label: 'block'  },
    ];
    if (balancerEnabled) opts.push({ value: 'balancer', label: 'balancer' });
    opts.forEach(({ value, label }) => {
        const opt = document.createElement('option');
        opt.value       = value;
        opt.textContent = label;
        if (value === current) opt.selected = true;
        select.appendChild(opt);
    });
    if (!select.value && select.options.length) select.selectedIndex = 0;
}

function updateActionSelects() {
    rulesContainer.querySelectorAll('.rule-action').forEach(sel => {
        populateActionSelect(sel, sel.value);
    });
    const def = document.getElementById('default_outbound');
    if (def) {
        const cur             = def.value;
        const balancerEnabled = document.getElementById('balancer_enabled')?.checked;
        def.innerHTML = '';
        const opts = [
            ...getProxyOptions(),
            { value: 'direct', label: 'direct' },
            ...(balancerEnabled ? [{ value: 'balancer', label: 'balancer' }] : []),
        ];
        opts.forEach(({ value, label }) => {
            const opt = document.createElement('option');
            opt.value       = value;
            opt.textContent = label;
            if (value === cur) opt.selected = true;
            def.appendChild(opt);
        });
        if (!def.value && def.options.length) def.selectedIndex = 0;
    }
}

function updateVlessPlaceholders() {
    [...vlessList.querySelectorAll('.vless-row')].forEach((row, i) => {
        row.querySelector('.vless-name').placeholder = i === 0 ? 'proxy' : 'proxy' + (i + 1);
    });
}

function createVlessRow({ name = '', uri = '' } = {}) {
    const row = document.createElement('div');
    row.className = 'vless-row';

    const nameGroup = document.createElement('div');
    nameGroup.className = 'vless-name-group';

    const nameLabel = document.createElement('label');
    nameLabel.className   = 'vless-field-label';
    nameLabel.textContent = t('vless_name_label');
    nameGroup.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type      = 'text';
    nameInput.className = 'vless-name';
    nameInput.value     = name;
    nameGroup.appendChild(nameInput);

    const uriGroup = document.createElement('div');
    uriGroup.className = 'vless-uri-group';

    const uriLabel = document.createElement('label');
    uriLabel.className   = 'vless-field-label';
    uriLabel.textContent = t('vless_link_label');
    uriGroup.appendChild(uriLabel);

    const uriTextarea = document.createElement('textarea');
    uriTextarea.className   = 'vless-uri';
    uriTextarea.placeholder = 'vless://uuid@host:port?security=tls&type=ws&path=/ws#name';
    uriTextarea.value       = uri;
    uriGroup.appendChild(uriTextarea);

    const removeBtn = document.createElement('button');
    removeBtn.type        = 'button';
    removeBtn.className   = 'remove-btn';
    removeBtn.title       = t('remove_title');
    removeBtn.textContent = '✕';

    nameInput.addEventListener('input', () => {
        updateActionSelects();
        updateVlessPlaceholders();
        saveState();
    });
    uriTextarea.addEventListener('input', () => {
        autoResize(uriTextarea);
        const val = uriTextarea.value.trim();
        const isDup = val !== '' && [...vlessList.querySelectorAll('.vless-uri')].some(
            ta => ta !== uriTextarea && ta.value.trim() === val
        );
        uriTextarea.classList.toggle('input-error', isDup);
        if (isDup) {
            showError(t('err_vless_duplicate'));
            return;
        }
        saveState();
    });
    removeBtn.addEventListener('click', () => {
        row.remove();
        updateVlessPlaceholders();
        updateActionSelects();
        saveState();
    });

    row.appendChild(nameGroup);
    row.appendChild(uriGroup);
    row.appendChild(removeBtn);

    // autoResize must be called after the row is in the DOM — see call sites
    return row;
}

function collectVlessEntries() {
    return [...vlessList.querySelectorAll('.vless-row')].map(row => ({
        name: row.querySelector('.vless-name').value,
        uri:  row.querySelector('.vless-uri').value,
    }));
}

document.getElementById('add-vless-btn')?.addEventListener('click', () => {
    vlessList.appendChild(createVlessRow());
    updateVlessPlaceholders();
    updateActionSelects();
    saveState();
});

// ============================================================
//  Balancer toggle
// ============================================================

const balancerEnabledCheckbox = document.getElementById('balancer_enabled');
const balancerFields          = document.getElementById('balancer-fields');
const observatoryFields       = document.getElementById('observatory-fields');
const balancerStrategySelect  = document.getElementById('balancer_strategy');

balancerEnabledCheckbox?.addEventListener('change', () => {
    balancerFields.classList.toggle('hidden', !balancerEnabledCheckbox.checked);
    updateActionSelects();
});

balancerStrategySelect?.addEventListener('change', () => {
    observatoryFields.classList.toggle('hidden', balancerStrategySelect.value !== 'leastPing');
});

// ============================================================
//  Database list renderer
// ============================================================

function renderDatabases() {
    dbListEl.innerHTML = '';
    databases.forEach(name => {
        const tag = document.createElement('div');
        tag.className = 'db-tag';
        const nameSpan = document.createElement('span');
        nameSpan.className   = 'db-tag-name';
        nameSpan.textContent = name;
        tag.appendChild(nameSpan);
        dbListEl.appendChild(tag);
    });
}

// Returns 'ip' for geoip-based databases, 'domain' for all others
function dbToRuleType(db) {
    return db.startsWith('geoip') ? 'ip' : 'domain';
}

// ============================================================
//  Tag cache
// ============================================================

const tagCache = {};

async function fetchTags(db) {
    if (tagCache[db] !== undefined) return tagCache[db];
    try {
        const res  = await fetch(`api/tags.php?db=${encodeURIComponent(db)}`);
        const data = await res.json();
        tagCache[db] = Array.isArray(data.tags) ? data.tags : [];
    } catch {
        tagCache[db] = [];
    }
    return tagCache[db];
}

// ============================================================
//  Database select builder
// ============================================================

function buildDbSelect(selectedDb) {
    const select = document.createElement('select');
    select.className = 'rule-db';
    databases.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === selectedDb) opt.selected = true;
        select.appendChild(opt);
    });
    return select;
}

// ============================================================
//  Multi-select value picker
// ============================================================

function buildValuePicker(initDb, selectedValues = []) {
    let knownTags = null;
    let selected  = new Set(selectedValues);

    const wrapper  = document.createElement('div');
    wrapper.className = 'value-picker';

    const trigger = document.createElement('button');
    trigger.type  = 'button';
    trigger.className = 'value-picker-trigger';

    const dropdown = document.createElement('div');
    dropdown.className = 'value-picker-dropdown hidden';

    const chipsRow = document.createElement('div');
    chipsRow.className = 'picker-chips';
    dropdown.appendChild(chipsRow);

    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);

    // Update the trigger button label based on selection state
    function updateTrigger() {
        if (selected.size === 0) {
            trigger.textContent = t('picker_empty');
            trigger.classList.add('empty');
        } else if (selected.size === 1) {
            trigger.textContent = [...selected][0];
            trigger.classList.remove('empty');
        } else {
            trigger.textContent = t('picker_selected', selected.size);
            trigger.classList.remove('empty');
        }
        const clearAllBtn = dropdown.querySelector('.picker-clear-all');
        if (clearAllBtn) clearAllBtn.classList.toggle('hidden', selected.size === 0);
    }

    // Add a chip for values that are not present in the checkbox list
    function addChip(val) {
        if (chipsRow.querySelector(`[data-val="${CSS.escape(val)}"]`)) return;
        const chip = document.createElement('span');
        chip.className   = 'picker-chip';
        chip.dataset.val = val;
        chip.appendChild(document.createTextNode(val + ' '));
        const chipBtn = document.createElement('button');
        chipBtn.type        = 'button';
        chipBtn.textContent = '✕';
        chip.appendChild(chipBtn);
        chipBtn.addEventListener('click', () => {
            selected.delete(val);
            chip.remove();
            updateTrigger();
            saveState();
        });
        chipsRow.appendChild(chip);
    }

    // Ensure chips exist for all selected values not shown as checkboxes
    function syncChips() {
        selected.forEach(val => {
            const hasCheckbox = !!dropdown.querySelector(`.picker-item[data-value="${CSS.escape(val)}"]`);
            if (!hasCheckbox) addChip(val);
        });
    }

    // Render search input and checkbox list
    function renderCheckboxes(tags) {
        dropdown.querySelectorAll('.picker-search, .picker-item, .picker-sep, .picker-loading').forEach(el => el.remove());

        const searchWrap  = document.createElement('div');
        searchWrap.className = 'picker-search';

        const searchRow = document.createElement('div');
        searchRow.className = 'picker-search-row';

        const searchInput = document.createElement('input');
        searchInput.type         = 'text';
        searchInput.placeholder  = t('picker_search');
        searchInput.autocomplete = 'off';

        const clearAllBtn = document.createElement('button');
        clearAllBtn.type      = 'button';
        clearAllBtn.className = 'picker-clear-all' + (selected.size === 0 ? ' hidden' : '');
        clearAllBtn.title     = 'Clear all';
        clearAllBtn.textContent = '✕';
        clearAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selected.clear();
            chipsRow.innerHTML = '';
            dropdown.querySelectorAll('.picker-item input[type="checkbox"]').forEach(cb => { cb.checked = false; });
            updateTrigger();
            saveState();
        });

        const noResult = document.createElement('div');
        noResult.className = 'picker-no-result hidden';

        function applyFilter() {
            const q = searchInput.value.trim().toLowerCase();
            let visible = 0;
            dropdown.querySelectorAll('.picker-item').forEach(item => {
                const show = !q || item.dataset.value.includes(q);
                item.style.display = show ? '' : 'none';
                if (show) visible++;
            });

            if (q && visible === 0) {
                noResult.innerHTML = '';
                const btn = document.createElement('button');
                btn.type      = 'button';
                btn.className = 'picker-add-custom';
                btn.textContent = t('picker_add', searchInput.value.trim());
                btn.addEventListener('click', () => {
                    const val = searchInput.value.trim();
                    selected.add(val);
                    addChip(val);
                    updateTrigger();
                    searchInput.value = '';
                    applyFilter();
                    saveState();
                });
                noResult.appendChild(btn);
                noResult.classList.remove('hidden');
            } else {
                noResult.classList.add('hidden');
            }
        }

        searchInput.addEventListener('input', applyFilter);
        searchInput.addEventListener('click',   e => e.stopPropagation());
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = noResult.querySelector('.picker-add-custom');
                if (btn) btn.click();
            }
            e.stopPropagation();
        });

        searchRow.appendChild(searchInput);
        searchRow.appendChild(clearAllBtn);
        searchWrap.appendChild(searchRow);
        searchWrap.appendChild(noResult);
        dropdown.insertBefore(searchWrap, chipsRow);

        if (tags.length) {
            // Checked items first (alphabetical), then unchecked (alphabetical)
            const checked   = [...selected].filter(v => tags.includes(v)).sort();
            const unchecked = tags.filter(v => !selected.has(v)).sort();

            function makeItem(tag, isChecked) {
                const item = document.createElement('label');
                item.className     = 'picker-item';
                item.dataset.value = tag;

                const cb = document.createElement('input');
                cb.type    = 'checkbox';
                cb.value   = tag;
                cb.checked = isChecked;
                cb.addEventListener('change', () => {
                    cb.checked ? selected.add(tag) : selected.delete(tag);
                    updateTrigger();
                    saveState();
                });

                const text = document.createElement('span');
                text.textContent = tag;

                item.appendChild(cb);
                item.appendChild(text);
                return item;
            }

            if (checked.length) {
                checked.forEach(tag => dropdown.insertBefore(makeItem(tag, true), chipsRow));
                const sep1 = document.createElement('div');
                sep1.className = 'picker-sep';
                dropdown.insertBefore(sep1, chipsRow);
            }

            unchecked.forEach(tag => dropdown.insertBefore(makeItem(tag, false), chipsRow));

            const sep2 = document.createElement('div');
            sep2.className = 'picker-sep';
            dropdown.insertBefore(sep2, chipsRow);
        }

        syncChips();
        searchInput.value = '';
        searchInput.focus();
    }

    // Open dropdown, loading tags from server on first open
    let fetchSeq = 0;

    async function openDropdown(currentDb) {
        dropdown.classList.remove('hidden');

        if (knownTags === null) {
            const seq = ++fetchSeq;
            const loading = document.createElement('div');
            loading.className   = 'picker-loading';
            loading.textContent = t('picker_loading');
            dropdown.insertBefore(loading, chipsRow);

            const tags = await fetchTags(currentDb);

            // If resetPicker() was called while we were waiting, discard stale result
            if (seq !== fetchSeq) { loading.remove(); return; }

            knownTags = tags;
            renderCheckboxes(knownTags);
        } else {
            // Already loaded — just reset search
            const si = dropdown.querySelector('.picker-search input');
            if (si) { si.value = ''; si.focus(); si.dispatchEvent(new Event('input')); }
        }
    }

    // Toggle dropdown open/close
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        document.querySelectorAll('.value-picker-dropdown').forEach(d => d.classList.add('hidden'));
        if (!isOpen) {
            const currentDb = (wrapper.closest('.rule-row') ?? wrapper.closest('.dns-rule-row'))?.querySelector('.rule-db')?.value ?? initDb;
            openDropdown(currentDb);
        }
    });

    document.addEventListener('click', () => dropdown.classList.add('hidden'));
    dropdown.addEventListener('click', e => e.stopPropagation());

    updateTrigger();

    wrapper.getValues   = () => [...selected];
    wrapper.resetPicker = () => {
        fetchSeq++;           // invalidate any in-flight fetch
        selected  = new Set();
        knownTags = null;
        dropdown.querySelectorAll('.picker-search, .picker-item, .picker-sep, .picker-loading').forEach(el => el.remove());
        chipsRow.innerHTML = '';
        updateTrigger();
    };

    return wrapper;
}

// ============================================================
//  Rule rows
// ============================================================

function createRuleRow({ db = 'geosite.dat', values = [], action = 'proxy', rule_type, value } = {}, presetId = null) {
    // Back-compat: support legacy single-value and rule_type fields
    if (!values.length && value) values = [value];
    if (!db && rule_type) db = rule_type === 'ip' ? 'geoip.dat' : 'geosite.dat';

    const row = document.createElement('div');
    row.className = 'rule-row';
    if (presetId) row.dataset.presetId = presetId;

    const dbSelect = buildDbSelect(db);

    const picker = buildValuePicker(db, values);
    picker.className += ' rule-values';

    const actionSelect = document.createElement('select');
    actionSelect.className = 'rule-action';
    populateActionSelect(actionSelect, action);

    const removeBtn = document.createElement('button');
    removeBtn.type        = 'button';
    removeBtn.className   = 'remove-btn';
    removeBtn.title       = t('remove_title');
    removeBtn.textContent = '✕';

    dbSelect.addEventListener('change', () => { picker.resetPicker(); saveState(); });
    removeBtn.addEventListener('click', () => { row.remove(); saveState(); });

    row.appendChild(dbSelect);
    row.appendChild(picker);
    row.appendChild(actionSelect);
    row.appendChild(removeBtn);

    return row;
}

function loadDefaultRules() {
    rulesContainer.innerHTML = '';
    DEFAULT_RULES.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
    updateActionSelects();
}

function collectRules() {
    return [...rulesContainer.querySelectorAll('.rule-row')].map(row => {
        const db     = row.querySelector('.rule-db')?.value ?? 'geosite.dat';
        const picker = row.querySelector('.rule-values');
        const values = picker?.getValues?.() ?? [];
        return {
            rule_type: dbToRuleType(db),
            db,
            values,
            action: row.querySelector('.rule-action').value,
        };
    }).filter(r => r.values.length > 0);
}

addRuleBtn.addEventListener('click', () => {
    rulesContainer.appendChild(createRuleRow());
    saveState();
});

// ============================================================
//  DNS servers & rules
// ============================================================

function getServerLabel(row, idx) {
    const preset = row.querySelector('.dns-preset').value;
    if (preset !== 'custom') return t('dns_preset_' + preset);
    const name = row.querySelector('.dns-name')?.value.trim();
    if (name) return name;
    const val = row.querySelector('.dns-custom').value.trim();
    return val || `${t('dns_preset_custom')} ${idx + 1}`;
}

function getServerLabels() {
    return [...dnsServersEl.querySelectorAll('.dns-server-row')].map(getServerLabel);
}

function updateRuleServerSelects() {
    const labels = getServerLabels();
    dnsRulesEl.querySelectorAll('.dns-server-select').forEach(select => {
        const cur = select.value;
        select.innerHTML = '';
        labels.forEach((label, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = label;
            select.appendChild(opt);
        });
        if (cur !== '' && parseInt(cur) < labels.length) select.value = cur;
    });
}

function createDnsServerRow({ preset = 'google_doh', custom = '', name = '' } = {}) {
    const row = document.createElement('div');
    row.className = 'dns-server-row';

    const presetSelect = document.createElement('select');
    presetSelect.className = 'dns-preset';
    [
        ['google_doh',     t('dns_preset_google_doh')],
        ['cloudflare_doh', t('dns_preset_cloudflare_doh')],
        ['yandex_doh',     t('dns_preset_yandex_doh')],
        ['google_dns',     t('dns_preset_google_dns')],
        ['cloudflare_dns', t('dns_preset_cloudflare_dns')],
        ['yandex_dns',     t('dns_preset_yandex_dns')],
        ['custom',         t('dns_preset_custom')],
    ].forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (val === preset) opt.selected = true;
        presetSelect.appendChild(opt);
    });

    const customFields = document.createElement('div');
    customFields.className = 'dns-custom-fields' + (preset !== 'custom' ? ' hidden' : '');

    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.className   = 'dns-name';
    nameInput.placeholder = 'Name';
    nameInput.value       = name;

    const customInput = document.createElement('input');
    customInput.type        = 'text';
    customInput.className   = 'dns-custom';
    customInput.placeholder = '8.8.8.8 or https://...';
    customInput.value       = custom;

    customFields.appendChild(nameInput);
    customFields.appendChild(customInput);

    presetSelect.addEventListener('change', () => {
        const newVal = presetSelect.value;
        if (newVal !== 'custom') {
            const isDup = [...dnsServersEl.querySelectorAll('.dns-server-row')].some(r => {
                if (r === row) return false;
                return r.querySelector('.dns-preset').value === newVal;
            });
            if (isDup) {
                presetSelect.value = preset;
                showError(t('dns_server_duplicate'));
                return;
            }
        }
        preset = newVal;
        customFields.classList.toggle('hidden', newVal !== 'custom');
        updateRuleServerSelects();
        saveState();
    });
    nameInput.addEventListener('input',  () => { updateRuleServerSelects(); saveState(); });
    customInput.addEventListener('input', () => { updateRuleServerSelects(); saveState(); });

    const removeBtn = document.createElement('button');
    removeBtn.type        = 'button';
    removeBtn.className   = 'remove-btn';
    removeBtn.title       = t('remove_title');
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => { row.remove(); updateRuleServerSelects(); saveState(); });

    row.appendChild(presetSelect);
    row.appendChild(customFields);
    row.appendChild(removeBtn);

    return row;
}

function createDnsRuleRow({ db = 'geosite.dat', values = [], server_idx = 0 } = {}) {
    const row = document.createElement('div');
    row.className = 'dns-rule-row';

    const dbSelect = buildDbSelect(db);
    dbSelect.className = 'rule-db';

    const picker = buildValuePicker(db, values);
    picker.className += ' rule-values';

    const serverSelect = document.createElement('select');
    serverSelect.className = 'dns-server-select';
    getServerLabels().forEach((label, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = label;
        serverSelect.appendChild(opt);
    });
    serverSelect.value = server_idx;

    const removeBtn = document.createElement('button');
    removeBtn.type        = 'button';
    removeBtn.className   = 'remove-btn';
    removeBtn.title       = t('remove_title');
    removeBtn.textContent = '✕';

    dbSelect.addEventListener('change', () => { picker.resetPicker(); saveState(); });
    removeBtn.addEventListener('click', () => { row.remove(); saveState(); });

    row.appendChild(dbSelect);
    row.appendChild(picker);
    row.appendChild(serverSelect);
    row.appendChild(removeBtn);

    return row;
}

function collectDnsServers() {
    return [...dnsServersEl.querySelectorAll('.dns-server-row')].map(row => ({
        preset: row.querySelector('.dns-preset').value,
        name:   row.querySelector('.dns-name')?.value.trim() ?? '',
        custom: row.querySelector('.dns-custom')?.value.trim() ?? '',
    }));
}

function collectDnsRules() {
    return [...dnsRulesEl.querySelectorAll('.dns-rule-row')].map(row => ({
        db:         row.querySelector('.rule-db').value,
        values:     row.querySelector('.rule-values')?.getValues?.() ?? [],
        server_idx: parseInt(row.querySelector('.dns-server-select').value) || 0,
    }));
}

addDnsServerBtn.addEventListener('click', () => {
    const usedPresets = new Set(
        [...dnsServersEl.querySelectorAll('.dns-preset')].map(s => s.value)
    );
    const allPresets = ['google_doh', 'cloudflare_doh', 'yandex_doh', 'google_dns', 'cloudflare_dns', 'yandex_dns'];
    const preset = allPresets.find(p => !usedPresets.has(p)) ?? 'custom';
    dnsServersEl.appendChild(createDnsServerRow({ preset }));
    updateRuleServerSelects();
    saveState();
});

addDnsRuleBtn.addEventListener('click', () => {
    dnsRulesEl.appendChild(createDnsRuleRow());
    saveState();
});

// ============================================================
//  Apply state to form
// ============================================================

function applyState(state) {
    document.getElementById('inbound_ip').value          = state.inbound_ip       ?? '0.0.0.0';
    document.getElementById('inbound_port').value        = state.inbound_port     ?? '10808';
    const httpEnabled = state.http_inbound_enabled ?? false;
    document.getElementById('http_inbound_ip').value   = state.http_inbound_ip   ?? '127.0.0.1';
    document.getElementById('http_inbound_port').value = state.http_inbound_port ?? '8080';
    httpInboundRow.classList.toggle('hidden', !httpEnabled);
    addHttpInboundBtn.classList.toggle('hidden', httpEnabled);
    document.getElementById('socks5_auth').checked       = state.socks5_auth      ?? false;
    document.getElementById('socks5_user').value         = state.socks5_user      ?? '';
    document.getElementById('socks5_pass').value         = state.socks5_pass      ?? '';
    socks5AuthFields.classList.toggle('hidden', !state.socks5_auth);
    // Backward compat: vless_link → vless_entries
    const vlessEntries = state.vless_entries ?? (state.vless_link ? [{ name: '', uri: state.vless_link }] : []);
    vlessList.innerHTML = '';
    if (vlessEntries.length === 0) {
        vlessList.appendChild(createVlessRow());
    } else {
        vlessEntries.forEach(e => {
            const row = createVlessRow(e);
            vlessList.appendChild(row);
            autoResize(row.querySelector('.vless-uri'));
        });
    }
    updateVlessPlaceholders();
    const balancerEnabled2 = state.balancer_enabled ?? false;
    document.getElementById('balancer_enabled').checked           = balancerEnabled2;
    document.getElementById('balancer_strategy').value            = state.balancer_strategy            ?? 'random';
    document.getElementById('observatory_probe_url').value        = state.observatory_probe_url        ?? 'https://www.google.com/generate_204';
    document.getElementById('observatory_probe_interval').value   = state.observatory_probe_interval   ?? '10s';
    balancerFields.classList.toggle('hidden', !balancerEnabled2);
    observatoryFields.classList.toggle('hidden', (state.balancer_strategy ?? 'random') !== 'leastPing');
    document.getElementById('sniffing_enabled').checked         = state.sniffing_enabled         ?? true;
    document.getElementById('sniffing_dest_http').checked       = state.sniffing_dest_http       ?? true;
    document.getElementById('sniffing_dest_tls').checked        = state.sniffing_dest_tls        ?? true;
    document.getElementById('sniffing_dest_quic').checked       = state.sniffing_dest_quic       ?? false;
    document.getElementById('sniffing_dest_bittorrent').checked = state.sniffing_dest_bittorrent ?? false;
    document.getElementById('sniffing_route_only').checked      = state.sniffing_route_only      ?? false;
    sniffingFields.classList.toggle('hidden', !(state.sniffing_enabled ?? true));
    document.getElementById('routing_enabled').checked   = state.routing_enabled  ?? false;
    routingFields.classList.toggle('hidden', !state.routing_enabled);
    document.getElementById('block_bittorrent').checked  = state.block_bittorrent ?? false;
    document.getElementById('default_outbound').value    = state.default_outbound ?? 'proxy';
    document.getElementById('domain_strategy').value     = state.domain_strategy  ?? 'IPIfNonMatch';
    document.getElementById('dns_enabled').checked       = state.dns_enabled      ?? false;
    document.getElementById('dns_query_strategy').value  = state.dns_query_strategy  ?? 'UseIPv4';
    document.getElementById('dns_domain_strategy').value = state.dns_domain_strategy ?? 'IPIfNonMatch';
    dnsFallbackPreset.value = state.dns_fallback_preset ?? '8.8.8.8';
    dnsFallbackCustom.value = state.dns_fallback_custom ?? '';
    dnsFallbackCustom.classList.toggle('hidden', dnsFallbackPreset.value !== 'custom');
    dnsFields.classList.toggle('hidden', !state.dns_enabled);
    dnsServersEl.innerHTML = '';
    if (Array.isArray(state.dns_servers)) {
        state.dns_servers.forEach(s => dnsServersEl.appendChild(createDnsServerRow(s)));
    }
    dnsRulesEl.innerHTML = '';
    if (Array.isArray(state.dns_rules)) {
        state.dns_rules.forEach(r => dnsRulesEl.appendChild(createDnsRuleRow(r)));
    }
    document.getElementById('mux_enabled').checked           = state.mux_enabled           ?? false;
    document.getElementById('mux_concurrency').value         = state.mux_concurrency        ?? 8;
    document.getElementById('mux_xudp_concurrency').value    = state.mux_xudp_concurrency   ?? 8;
    document.getElementById('mux_xudp_proxy_udp443').value   = state.mux_xudp_proxy_udp443  ?? 'reject';
    muxFields.classList.toggle('hidden', !(state.mux_enabled ?? false));
    document.getElementById('log_enabled').checked = state.log_enabled ?? false;
    document.getElementById('log_dir').value        = state.log_dir    ?? '';
    document.getElementById('log_level').value      = state.log_level  ?? 'warning';
    logFields.classList.toggle('hidden', !state.log_enabled);

    rulesContainer.innerHTML = '';
    const rules = Array.isArray(state.rules) && state.rules.length ? state.rules : DEFAULT_RULES;
    rules.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
    updateActionSelects();
}

// ============================================================
//  Init
// ============================================================

(async function init() {
    // Apply saved or default language first, then theme
    applyLang();
    applyTheme(currentTheme);

    // Load available databases from server, fall back to defaults
    let serverDbs = [];
    try {
        const res  = await fetch('api/databases.php');
        const data = await res.json();
        serverDbs  = Array.isArray(data.databases) && data.databases.length
            ? data.databases
            : [...DEFAULT_DATABASES];
    } catch {
        serverDbs = [...DEFAULT_DATABASES];
    }

    // Restore from share URL if present, otherwise from localStorage
    const urlParam = new URLSearchParams(location.search).get('s');
    let state;
    if (urlParam) {
        try {
            state = decodeShare(urlParam);
            history.replaceState(null, '', location.pathname);
        } catch {
            state = loadState();
        }
    } else {
        state = loadState();
    }

    databases = serverDbs;
    renderDatabases();

    if (state) {
        applyState(state);
    } else {
        vlessList.appendChild(createVlessRow());
        updateVlessPlaceholders();
        loadDefaultRules();
    }
})();

// ============================================================
//  Form submit
// ============================================================

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAll();

    const ip      = document.getElementById('inbound_ip').value.trim();
    const port    = parseInt(document.getElementById('inbound_port').value, 10);
    const allEntries = collectVlessEntries();

    if (allEntries.length === 0) {
        showError(t('err_vless_prefix'));
        return;
    }

    // Validate each row: not empty, starts with vless://
    let validationError = false;
    vlessList.querySelectorAll('.vless-uri').forEach(ta => {
        const val = ta.value.trim();
        const bad = val === '' || !val.startsWith('vless://');
        ta.classList.toggle('input-error', bad);
        if (bad) validationError = true;
    });
    if (validationError) {
        showError(t('err_vless_prefix'));
        return;
    }

    const entries = allEntries;
    const uris = entries.map(e => e.uri.trim());
    const hasDuplicates = uris.some((u, i) => uris.indexOf(u) !== i);
    if (hasDuplicates) {
        showError(t('err_vless_duplicate'));
        return;
    }

    submitBtn.disabled = true;

    try {
        const res = await fetch('api/parse.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inbound_ip:       ip,
                inbound_port:     port,
                http_inbound_enabled: !httpInboundRow.classList.contains('hidden'),
                http_inbound_ip:      document.getElementById('http_inbound_ip').value.trim(),
                http_inbound_port:    parseInt(document.getElementById('http_inbound_port').value, 10),
                socks5_auth:      document.getElementById('socks5_auth').checked,
                socks5_user:      document.getElementById('socks5_user').value.trim(),
                socks5_pass:      document.getElementById('socks5_pass').value,
                vless_entries:    entries.map(e => ({ name: e.name.trim(), uri: e.uri.trim() })),
                balancer_enabled:           document.getElementById('balancer_enabled')?.checked ?? false,
                balancer_strategy:          document.getElementById('balancer_strategy')?.value  ?? 'random',
                observatory_probe_url:      document.getElementById('observatory_probe_url')?.value      ?? 'https://www.google.com/generate_204',
                observatory_probe_interval: document.getElementById('observatory_probe_interval')?.value ?? '10s',
                sniffing_enabled:      document.getElementById('sniffing_enabled').checked,
                sniffing_dest_override: [
                    document.getElementById('sniffing_dest_http').checked      && 'http',
                    document.getElementById('sniffing_dest_tls').checked       && 'tls',
                    document.getElementById('sniffing_dest_quic').checked      && 'quic',
                    document.getElementById('sniffing_dest_bittorrent').checked && 'bittorrent',
                ].filter(Boolean),
                sniffing_route_only:   document.getElementById('sniffing_route_only').checked,
                routing_enabled:   document.getElementById('routing_enabled').checked,
                block_bittorrent:  document.getElementById('block_bittorrent').checked,
                default_outbound:  document.getElementById('default_outbound').value,
                domain_strategy:   document.getElementById('domain_strategy').value,
                dns_enabled:          document.getElementById('dns_enabled').checked,
                dns_query_strategy:    document.getElementById('dns_query_strategy').value,
                dns_domain_strategy:    document.getElementById('dns_domain_strategy').value,
                dns_fallback:         getFallbackValue(),
                dns_servers:          collectDnsServers(),
                dns_rules:            collectDnsRules(),
                mux_enabled:            document.getElementById('mux_enabled').checked,
                mux_concurrency:        parseInt(document.getElementById('mux_concurrency').value, 10),
                mux_xudp_concurrency:   parseInt(document.getElementById('mux_xudp_concurrency').value, 10),
                mux_xudp_proxy_udp443:  document.getElementById('mux_xudp_proxy_udp443').value,
                log_enabled:       document.getElementById('log_enabled').checked,
                log_dir:           document.getElementById('log_dir').value.trim(),
                log_level:         document.getElementById('log_level').value,
                routing_rules:     collectRules(),
            }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            showError(data.error ?? t('err_server_status') + res.status);
        } else {
            showResult(data);
        }
    } catch (err) {
        showError(t('err_server') + err.message);
    } finally {
        submitBtn.disabled = false;
    }
});

// ============================================================
//  Clear button
// ============================================================

clearBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('inbound_ip').value         = '0.0.0.0';
    document.getElementById('inbound_port').value       = '10808';
    httpInboundRow.classList.add('hidden');
    document.getElementById('http_inbound_ip').value   = '127.0.0.1';
    document.getElementById('http_inbound_port').value = '8080';
    addHttpInboundBtn.classList.remove('hidden');
    document.getElementById('socks5_auth').checked      = false;
    document.getElementById('socks5_user').value        = '';
    document.getElementById('socks5_pass').value        = '';
    socks5AuthFields.classList.add('hidden');
    vlessList.innerHTML = '';
    vlessList.appendChild(createVlessRow());
    updateVlessPlaceholders();
    document.getElementById('balancer_enabled').checked           = false;
    document.getElementById('balancer_strategy').value            = 'random';
    document.getElementById('observatory_probe_url').value        = 'https://www.google.com/generate_204';
    document.getElementById('observatory_probe_interval').value   = '10s';
    balancerFields.classList.add('hidden');
    observatoryFields.classList.add('hidden');
    document.getElementById('sniffing_enabled').checked         = true;
    document.getElementById('sniffing_dest_http').checked       = true;
    document.getElementById('sniffing_dest_tls').checked        = true;
    document.getElementById('sniffing_dest_quic').checked       = false;
    document.getElementById('sniffing_dest_bittorrent').checked = false;
    document.getElementById('sniffing_route_only').checked      = false;
    sniffingFields.classList.remove('hidden');
    document.getElementById('routing_enabled').checked   = false;
    routingFields.classList.add('hidden');
    document.getElementById('block_bittorrent').checked = false;
    document.getElementById('default_outbound').value   = 'proxy';
    document.getElementById('domain_strategy').value    = 'IPIfNonMatch';
    document.getElementById('dns_enabled').checked = false;
    document.getElementById('dns_query_strategy').value  = 'UseIPv4';
    document.getElementById('dns_domain_strategy').value  = 'IPIfNonMatch';
    dnsFallbackPreset.value = '8.8.8.8';
    dnsFallbackCustom.value = '';
    dnsFallbackCustom.classList.add('hidden');
    dnsFields.classList.add('hidden');
    dnsServersEl.innerHTML = '';
    dnsRulesEl.innerHTML   = '';
    document.getElementById('mux_enabled').checked          = false;
    document.getElementById('mux_concurrency').value        = '8';
    document.getElementById('mux_xudp_concurrency').value   = '8';
    document.getElementById('mux_xudp_proxy_udp443').value  = 'reject';
    muxFields.classList.add('hidden');
    document.getElementById('log_enabled').checked      = false;
    document.getElementById('log_dir').value            = '';
    document.getElementById('log_level').value          = 'warning';
    logFields.classList.add('hidden');
    loadDefaultRules();
    updateActionSelects();
    hideAll();
    localStorage.removeItem(LS_KEY);
});

// ============================================================
//  Presets
// ============================================================

const presetBtn      = document.getElementById('preset-btn');
const presetDropdown = document.getElementById('preset-dropdown');

const activePresets = new Set();

function updatePresetBtn() {
    if (!presetBtn) return;
    const count = activePresets.size;
    presetBtn.textContent = count > 0
        ? `${t('preset_btn')} (${count})`
        : t('preset_btn');
}

function togglePreset(preset) {
    if (activePresets.has(preset.id)) {
        activePresets.delete(preset.id);
        rulesContainer.querySelectorAll(`[data-preset-id="${preset.id}"]`).forEach(r => r.remove());
        if (preset.bittorrent) {
            const cb = document.getElementById('block_bittorrent');
            if (cb) cb.checked = false;
        }
    } else {
        activePresets.add(preset.id);

        const routingEnabled = document.getElementById('routing_enabled');
        routingEnabled.checked = true;
        routingFields.classList.remove('hidden');

        if (preset.outbound) {
            // Use first VLESS tag instead of hardcoded 'proxy'
            const firstProxyTag = getProxyOptions()[0]?.value ?? 'proxy';
            document.getElementById('default_outbound').value = firstProxyTag;
        }

        if (preset.bittorrent) {
            const cb = document.getElementById('block_bittorrent');
            if (cb) cb.checked = true;
        }

        const available = new Set(databases);
        const existing  = collectRules();

        preset.rules
            .filter(r => available.has(r.db))
            .forEach(rule => {
                const dup = existing.some(e =>
                    e.db === rule.db &&
                    e.action === rule.action &&
                    JSON.stringify([...e.values].sort()) === JSON.stringify([...rule.values].sort())
                );
                if (!dup) rulesContainer.appendChild(createRuleRow(rule, preset.id));
            });
    }
    updatePresetBtn();
    saveState();
}

function populatePresetDropdown() {
    presetDropdown.innerHTML = '';
    ROUTE_PRESETS.forEach(preset => {
        const label = document.createElement('label');
        label.className = 'preset-item';
        label.addEventListener('click', e => e.stopPropagation());

        const checkbox = document.createElement('input');
        checkbox.type    = 'checkbox';
        checkbox.checked = activePresets.has(preset.id);
        checkbox.addEventListener('change', () => {
            togglePreset(preset);
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + t(preset.id)));
        presetDropdown.appendChild(label);
    });
}

presetBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = presetDropdown.classList.contains('hidden');
    if (opening) populatePresetDropdown();
    presetDropdown.classList.toggle('hidden', !opening);
});

document.addEventListener('click', (e) => {
    if (!presetBtn?.contains(e.target) && !presetDropdown?.contains(e.target)) {
        presetDropdown?.classList.add('hidden');
    }
});

document.getElementById('clear-rules-btn')?.addEventListener('click', () => {
    rulesContainer.innerHTML = '';
    const cb = document.getElementById('block_bittorrent');
    if (cb) cb.checked = false;
    activePresets.clear();
    updatePresetBtn();
    saveState();
});

document.getElementById('clear-dns-rules-btn')?.addEventListener('click', () => {
    dnsRulesEl.innerHTML = '';
    saveState();
});

// ============================================================
//  Share
// ============================================================

function encodeShare(state) {
    const json  = JSON.stringify(state);
    const bytes = new TextEncoder().encode(json);
    let binary  = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeShare(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
}

function getShareUrl() {
    const state = {
        inbound_ip:          document.getElementById('inbound_ip').value,
        inbound_port:        document.getElementById('inbound_port').value,
        http_inbound_enabled: !httpInboundRow.classList.contains('hidden'),
        http_inbound_ip:      document.getElementById('http_inbound_ip').value,
        http_inbound_port:    document.getElementById('http_inbound_port').value,
        socks5_auth:         document.getElementById('socks5_auth').checked,
        socks5_user:         document.getElementById('socks5_user').value,
        socks5_pass:         document.getElementById('socks5_pass').value,
        vless_entries:       collectVlessEntries(),
        balancer_enabled:             document.getElementById('balancer_enabled')?.checked ?? false,
        balancer_strategy:            document.getElementById('balancer_strategy')?.value  ?? 'random',
        observatory_probe_url:        document.getElementById('observatory_probe_url')?.value        ?? 'https://www.google.com/generate_204',
        observatory_probe_interval:   document.getElementById('observatory_probe_interval')?.value   ?? '10s',
        sniffing_enabled:          document.getElementById('sniffing_enabled').checked,
        sniffing_dest_http:        document.getElementById('sniffing_dest_http').checked,
        sniffing_dest_tls:         document.getElementById('sniffing_dest_tls').checked,
        sniffing_dest_quic:        document.getElementById('sniffing_dest_quic').checked,
        sniffing_dest_bittorrent:  document.getElementById('sniffing_dest_bittorrent').checked,
        sniffing_route_only:       document.getElementById('sniffing_route_only').checked,
        routing_enabled:     document.getElementById('routing_enabled').checked,
        block_bittorrent:    document.getElementById('block_bittorrent').checked,
        default_outbound:    document.getElementById('default_outbound').value,
        domain_strategy:     document.getElementById('domain_strategy').value,
        dns_enabled:         document.getElementById('dns_enabled').checked,
        dns_query_strategy:  document.getElementById('dns_query_strategy').value,
        dns_domain_strategy: document.getElementById('dns_domain_strategy').value,
        dns_fallback_preset: dnsFallbackPreset.value,
        dns_fallback_custom: dnsFallbackCustom.value,
        dns_servers:         collectDnsServers(),
        dns_rules:           collectDnsRules(),
        mux_enabled:           document.getElementById('mux_enabled').checked,
        mux_concurrency:       document.getElementById('mux_concurrency').value,
        mux_xudp_concurrency:  document.getElementById('mux_xudp_concurrency').value,
        mux_xudp_proxy_udp443: document.getElementById('mux_xudp_proxy_udp443').value,
        log_enabled:         document.getElementById('log_enabled').checked,
        log_dir:             document.getElementById('log_dir').value,
        log_level:           document.getElementById('log_level').value,
        rules:               collectRules(),
    };
    return `${location.origin}${location.pathname}?s=${encodeShare(state)}`;
}

const shareBtn = document.getElementById('share-btn');

shareBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
        shareBtn.textContent = t('share_copied');
        setTimeout(() => { shareBtn.textContent = t('share_btn'); }, 2000);
    });
});

// ============================================================
//  Import config.json
// ============================================================

function parseConfigJson(config) {
    const state = {};

    // --- Inbound ---
    const inbound = config.inbounds?.[0];
    if (inbound) {
        state.inbound_ip   = inbound.listen ?? '0.0.0.0';
        state.inbound_port = String(inbound.port ?? 10808);
        const auth = inbound.settings?.auth === 'password';
        state.socks5_auth = auth;
        state.socks5_user = auth ? (inbound.settings?.accounts?.[0]?.user ?? '') : '';
        state.socks5_pass = auth ? (inbound.settings?.accounts?.[0]?.pass ?? '') : '';
    } else {
        state.inbound_ip   = '0.0.0.0';
        state.inbound_port = '10808';
        state.socks5_auth  = false;
        state.socks5_user  = '';
        state.socks5_pass  = '';
    }

    // --- HTTP inbound ---
    const httpIn = (config.inbounds ?? []).find(i => i.protocol === 'http');
    if (httpIn) {
        state.http_inbound_enabled = true;
        state.http_inbound_ip      = httpIn.listen ?? '127.0.0.1';
        state.http_inbound_port    = String(httpIn.port ?? 8080);
    } else {
        state.http_inbound_enabled = false;
        state.http_inbound_ip      = '127.0.0.1';
        state.http_inbound_port    = '8080';
    }

    // --- Sniffing ---
    const sniffing = inbound?.sniffing;
    if (sniffing) {
        state.sniffing_enabled         = sniffing.enabled !== false;
        const dest                     = sniffing.destOverride ?? [];
        state.sniffing_dest_http       = dest.includes('http');
        state.sniffing_dest_tls        = dest.includes('tls');
        state.sniffing_dest_quic       = dest.includes('quic');
        state.sniffing_dest_bittorrent = dest.includes('bittorrent');
        state.sniffing_route_only      = sniffing.routeOnly === true;
    } else {
        state.sniffing_enabled         = false;
        state.sniffing_dest_http       = true;
        state.sniffing_dest_tls        = true;
        state.sniffing_dest_quic       = false;
        state.sniffing_dest_bittorrent = false;
        state.sniffing_route_only      = false;
    }

    // --- VLESS URI reconstruction (all outbounds) ---
    function reconstructVlessUri(vlessOut) {
        const vnext = vlessOut.settings?.vnext?.[0];
        const user  = vnext?.users?.[0];
        const ss    = vlessOut.streamSettings ?? {};
        const name  = vlessOut._comment ?? '';
        if (!vnext || !user) return null;

        const uuid     = user.id;
        const flow     = user.flow ?? '';
        const host     = vnext.address;
        const port     = vnext.port;
        const network  = ss.network ?? 'tcp';
        const security = ss.security ?? 'none';

        const params = new URLSearchParams();
        if (network !== 'tcp')   params.set('type', network);
        if (security !== 'none') params.set('security', security);
        if (flow)                params.set('flow', flow);

        if (network === 'ws' && ss.wsSettings) {
            if (ss.wsSettings.path)            params.set('path', ss.wsSettings.path);
            if (ss.wsSettings.headers?.Host)   params.set('host', ss.wsSettings.headers.Host);
        } else if (network === 'xhttp' && ss.xhttpSettings) {
            if (ss.xhttpSettings.path) params.set('path', ss.xhttpSettings.path);
            if (ss.xhttpSettings.mode) params.set('mode', ss.xhttpSettings.mode);
            if (ss.xhttpSettings.host) params.set('host', ss.xhttpSettings.host);
        } else if (network === 'grpc' && ss.grpcSettings) {
            if (ss.grpcSettings.serviceName) params.set('serviceName', ss.grpcSettings.serviceName);
            if (ss.grpcSettings.multiMode)   params.set('mode', 'multi');
        } else if (network === 'h2' && ss.httpSettings) {
            if (ss.httpSettings.path) params.set('path', ss.httpSettings.path);
            const h2Host = Array.isArray(ss.httpSettings.host) ? ss.httpSettings.host[0] : ss.httpSettings.host;
            if (h2Host) params.set('host', h2Host);
        }

        if (security === 'tls' && ss.tlsSettings) {
            if (ss.tlsSettings.serverName)  params.set('sni', ss.tlsSettings.serverName);
            if (ss.tlsSettings.fingerprint) params.set('fp',  ss.tlsSettings.fingerprint);
            if (ss.tlsSettings.alpn?.length) params.set('alpn', ss.tlsSettings.alpn.join(','));
        } else if (security === 'reality' && ss.realitySettings) {
            if (ss.realitySettings.serverName)  params.set('sni', ss.realitySettings.serverName);
            if (ss.realitySettings.fingerprint) params.set('fp',  ss.realitySettings.fingerprint);
            if (ss.realitySettings.publicKey)   params.set('pbk', ss.realitySettings.publicKey);
            if (ss.realitySettings.shortId)     params.set('sid', ss.realitySettings.shortId);
            if (ss.realitySettings.spiderX)     params.set('spx', ss.realitySettings.spiderX);
        }

        const qs       = params.toString();
        const fragment = name ? '#' + encodeURIComponent(name) : '';
        return {
            uri:  `vless://${uuid}@${host}:${port}${qs ? '?' + qs : ''}${fragment}`,
            // Use tag as name field unless it looks auto-generated (proxy, proxy2 ...)
            name: /^proxy\d*$/.test(vlessOut.tag ?? '') ? '' : (vlessOut.tag ?? ''),
        };
    }

    const vlessOuts = (config.outbounds ?? []).filter(o => o.protocol === 'vless');
    state.vless_entries = vlessOuts.map(reconstructVlessUri).filter(Boolean);
    if (state.vless_entries.length === 0) {
        state.vless_entries = [{ name: '', uri: '' }];
    }

    // --- Routing ---
    const routing = config.routing;
    if (routing) {
        state.routing_enabled  = true;
        state.domain_strategy  = routing.domainStrategy ?? 'IPIfNonMatch';
        state.default_outbound = 'proxy';
        state.block_bittorrent = false;
        state.rules = [];

        for (const rule of routing.rules ?? []) {
            if (rule.network === 'tcp,udp') {
                state.default_outbound = rule.balancerTag ?? rule.outboundTag ?? 'proxy';
                continue;
            }
            if (Array.isArray(rule.protocol) && rule.protocol.includes('bittorrent')) {
                state.block_bittorrent = true;
                continue;
            }
            const action = rule.outboundTag ?? 'proxy';
            if (rule.domain?.length) {
                const grouped = {};
                for (const d of rule.domain) {
                    let db = 'geosite.dat', tag = d;
                    if (d.startsWith('geosite:')) {
                        db = 'geosite.dat'; tag = d.slice(8);
                    } else if (d.startsWith('ext:')) {
                        const parts = d.split(':'); db = parts[1]; tag = parts[2];
                    }
                    (grouped[db] ??= []).push(tag);
                }
                for (const [db, values] of Object.entries(grouped)) {
                    state.rules.push({ db, values, action });
                }
            }
            if (rule.ip?.length) {
                const grouped = {};
                for (const ip of rule.ip) {
                    if (ip.startsWith('geoip:')) {
                        (grouped['geoip.dat'] ??= []).push(ip.slice(6));
                    } else if (ip.startsWith('ext:')) {
                        const parts = ip.split(':'); (grouped[parts[1]] ??= []).push(parts[2]);
                    } else {
                        (grouped['geoip.dat'] ??= []).push(ip);
                    }
                }
                for (const [db, values] of Object.entries(grouped)) {
                    state.rules.push({ db, values, action });
                }
            }
        }
    } else {
        state.routing_enabled  = false;
        state.domain_strategy  = 'IPIfNonMatch';
        state.default_outbound = 'proxy';
        state.block_bittorrent = false;
        state.rules            = [];
    }

    // --- DNS ---
    const dns = config.dns;
    if (dns) {
        state.dns_enabled         = true;
        state.dns_query_strategy  = dns.queryStrategy  ?? 'UseIPv4';
        state.dns_domain_strategy = dns.domainStrategy ?? 'IPIfNonMatch';

        const DNS_ADDR_TO_PRESET = {
            'https://8.8.8.8/dns-query':   'google_doh',
            'https://1.1.1.1/dns-query':   'cloudflare_doh',
            'https://77.88.8.8/dns-query': 'yandex_doh',
            '8.8.8.8':                     'google_dns',
            '1.1.1.1':                     'cloudflare_dns',
            '77.88.8.8':                   'yandex_dns',
        };

        const servers        = dns.servers ?? [];
        const plainStrings   = servers.filter(s => typeof s === 'string');
        const objectEntries  = servers.filter(s => typeof s === 'object' && s !== null);

        const fallbackAddr     = plainStrings[plainStrings.length - 1] ?? '';
        const nonFallbackPlain = plainStrings.slice(0, -1);

        const FALLBACK_OPTIONS = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1', '9.9.9.9'];
        if (FALLBACK_OPTIONS.includes(fallbackAddr)) {
            state.dns_fallback_preset = fallbackAddr;
            state.dns_fallback_custom = '';
        } else if (fallbackAddr) {
            state.dns_fallback_preset = 'custom';
            state.dns_fallback_custom = fallbackAddr;
        } else {
            state.dns_fallback_preset = '8.8.8.8';
            state.dns_fallback_custom = '';
        }

        state.dns_servers = [];
        for (const addr of nonFallbackPlain) {
            const preset = DNS_ADDR_TO_PRESET[addr];
            state.dns_servers.push(preset ? { preset } : { preset: 'custom', custom: addr, name: '' });
        }
        for (const entry of objectEntries) {
            const addr   = entry.address ?? '';
            const preset = DNS_ADDR_TO_PRESET[addr];
            state.dns_servers.push(preset ? { preset } : { preset: 'custom', custom: addr, name: '' });
        }

        state.dns_rules = [];
        objectEntries.forEach((entry, idx) => {
            const serverListIdx = nonFallbackPlain.length + idx;
            if (!entry.domains?.length) return;
            const grouped = {};
            for (const d of entry.domains) {
                let db = 'geosite.dat', tag = d;
                if (d.startsWith('geosite:'))      { db = 'geosite.dat'; tag = d.slice(8); }
                else if (d.startsWith('geoip:'))   { db = 'geoip.dat';   tag = d.slice(6); }
                else if (d.startsWith('ext:'))     { const p = d.split(':'); db = p[1]; tag = p[2]; }
                (grouped[db] ??= []).push(tag);
            }
            for (const [db, values] of Object.entries(grouped)) {
                state.dns_rules.push({ db, values, server_idx: serverListIdx });
            }
        });
    } else {
        state.dns_enabled         = false;
        state.dns_query_strategy  = 'UseIPv4';
        state.dns_domain_strategy = 'IPIfNonMatch';
        state.dns_fallback_preset = '8.8.8.8';
        state.dns_fallback_custom = '';
        state.dns_servers         = [];
        state.dns_rules           = [];
    }

    // --- Log ---
    const log      = config.log;
    const loglevel = log?.loglevel ?? 'none';
    if (log && loglevel !== 'none') {
        state.log_enabled = true;
        state.log_level   = loglevel;
        if (log.access) {
            const sep   = Math.max(log.access.lastIndexOf('/'), log.access.lastIndexOf('\\'));
            state.log_dir = sep >= 0 ? log.access.slice(0, sep) : '';
        } else {
            state.log_dir = '';
        }
    } else {
        state.log_enabled = false;
        state.log_level   = 'warning';
        state.log_dir     = '';
    }

    // --- Balancer ---
    const balancer = (config.routing?.balancers ?? [])[0];
    if (balancer) {
        state.balancer_enabled  = true;
        state.balancer_strategy = balancer.strategy?.type ?? 'random';
    } else {
        state.balancer_enabled  = false;
        state.balancer_strategy = 'random';
    }
    const obs = config.observatory;
    if (obs) {
        state.observatory_probe_url      = obs.probeUrl      ?? 'https://www.google.com/generate_204';
        state.observatory_probe_interval = obs.probeInterval ?? '10s';
    } else {
        state.observatory_probe_url      = 'https://www.google.com/generate_204';
        state.observatory_probe_interval = '10s';
    }

    // --- Mux ---
    const mux = (config.outbounds ?? []).find(o => o.protocol === 'vless')?.mux;
    if (mux?.enabled) {
        state.mux_enabled           = true;
        state.mux_concurrency       = mux.concurrency       ?? 8;
        state.mux_xudp_concurrency  = mux.xudpConcurrency   ?? 8;
        state.mux_xudp_proxy_udp443 = mux.xudpProxyUDP443   ?? 'reject';
    } else {
        state.mux_enabled           = false;
        state.mux_concurrency       = 8;
        state.mux_xudp_concurrency  = 8;
        state.mux_xudp_proxy_udp443 = 'reject';
    }

    return state;
}

const importFileInput = document.getElementById('import-file');
const importBtn       = document.getElementById('import-btn');

importBtn?.addEventListener('click', () => importFileInput?.click());

importFileInput?.addEventListener('change', () => {
    const file = importFileInput.files?.[0];
    if (!file) return;
    importFileInput.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);
            if (typeof config !== 'object' || config === null || !config.inbounds) {
                throw new Error('not a config');
            }
            const state = parseConfigJson(config);
            applyState(state);
            saveState();
        } catch {
            showError(t('import_error'));
        }
    };
    reader.readAsText(file);
});

// ============================================================
//  Result helpers
// ============================================================

// ============================================================
//  Help modal
// ============================================================

const helpModal = document.getElementById('help');

function openHelp() {
    helpModal.classList.remove('hidden');
    errorBackdrop.classList.remove('hidden');
}

function closeHelp() {
    helpModal.classList.add('hidden');
    errorBackdrop.classList.add('hidden');
}

document.getElementById('help-btn').addEventListener('click', openHelp);
document.getElementById('help-close').addEventListener('click', closeHelp);

// ============================================================
//  Result helpers
// ============================================================

function closeResult() {
    resultBox.classList.add('hidden');
    errorBackdrop.classList.add('hidden');
}

function closeError() {
    errorBox.classList.add('hidden');
    errorBackdrop.classList.add('hidden');
}

document.getElementById('result-close').addEventListener('click', closeResult);
document.getElementById('error-close').addEventListener('click', closeError);
errorBackdrop.addEventListener('click', () => {
    closeError();
    closeHelp();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeError();
        closeHelp();
    }
});

function showError(msg) {
    errorText.textContent = msg;
    resultBox.classList.add('hidden');
    errorBox.classList.remove('hidden');
    errorBackdrop.classList.remove('hidden');
}

function showResult(json) {
    resultPre.textContent = JSON.stringify(json, null, 2);
    errorBox.classList.add('hidden');
    resultBox.classList.remove('hidden');
    errorBackdrop.classList.remove('hidden');
}

function hideAll() {
    closeResult();
    closeError();
    closeHelp();
}

// ============================================================
//  Copy / Download
// ============================================================

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultPre.textContent).then(() => {
        const label = copyBtn.querySelector('.btn-label');
        label.textContent = t('copy_success');
        setTimeout(() => { label.textContent = t('copy_btn'); }, 1500);
    });
});

downloadBtn.addEventListener('click', () => {
    const blob = new Blob([resultPre.textContent], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(url);
});
