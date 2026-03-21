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

    // Highlight the active language button
    document.getElementById('lang-en').classList.toggle('active', currentLang === 'en');
    document.getElementById('lang-ru').classList.toggle('active', currentLang === 'ru');
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LS_LANG, lang);
    applyLang();

    // Re-render rule rows so all dynamic picker strings update
    const rules = collectRules();
    rulesContainer.innerHTML = '';
    rules.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));

    // Re-render DNS rows
    const dnsRules = collectDns();
    dnsContainer.innerHTML = '';
    dnsRules.forEach(rule => dnsContainer.appendChild(createDnsRow(rule)));
}

document.getElementById('lang-en').addEventListener('click', () => setLang('en'));
document.getElementById('lang-ru').addEventListener('click', () => setLang('ru'));

// ============================================================
//  Constants & defaults
// ============================================================

const DEFAULT_DATABASES = ['geosite.dat', 'geoip.dat']; // fallback if server unavailable

const DNS_PRESETS = {
    google_doh:     'https://dns.google/dns-query',
    cloudflare_doh: 'https://cloudflare-dns.com/dns-query',
};

const DEFAULT_RULES = [
    { db: 'geoip.dat',   values: ['private'],          action: 'direct' },
    { db: 'geosite.dat', values: ['ru'],               action: 'direct' },
    { db: 'geoip.dat',   values: ['ru'],               action: 'direct' },
    { db: 'geosite.dat', values: ['category-ads-all'], action: 'block'  },
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

const dbListEl       = document.getElementById('db-list');
const rulesContainer = document.getElementById('routing-rules');
const addRuleBtn     = document.getElementById('add-rule-btn');
const dnsContainer   = document.getElementById('dns-rules');
const addDnsBtn      = document.getElementById('add-dns-btn');

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
        socks5_auth:       document.getElementById('socks5_auth').checked,
        socks5_user:       document.getElementById('socks5_user').value,
        socks5_pass:       document.getElementById('socks5_pass').value,
        vless_link:        document.getElementById('vless_link').value,
        block_bittorrent:  document.getElementById('block_bittorrent').checked,
        default_outbound:  document.getElementById('default_outbound').value,
        domain_strategy:   document.getElementById('domain_strategy').value,
        dns_enabled:       document.getElementById('dns_enabled').checked,
        dns_fallback:      document.getElementById('dns_fallback').value,
        dns_rules:         collectDns(),
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

// Toggle DNS fields visibility
const dnsEnabledCheckbox = document.getElementById('dns_enabled');
const dnsFields          = document.getElementById('dns-fields');

dnsEnabledCheckbox.addEventListener('change', () => {
    dnsFields.classList.toggle('hidden', !dnsEnabledCheckbox.checked);
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

const vlessTextarea = document.getElementById('vless_link');

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

vlessTextarea.addEventListener('input', () => autoResize(vlessTextarea));

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

        const searchInput = document.createElement('input');
        searchInput.type         = 'text';
        searchInput.placeholder  = t('picker_search');
        searchInput.autocomplete = 'off';

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

        searchWrap.appendChild(searchInput);
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
    async function openDropdown(currentDb) {
        dropdown.classList.remove('hidden');

        if (knownTags === null) {
            const loading = document.createElement('div');
            loading.className   = 'picker-loading';
            loading.textContent = t('picker_loading');
            dropdown.insertBefore(loading, chipsRow);

            const tags = await fetchTags(currentDb);
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
            const currentDb = wrapper.closest('.rule-row')?.querySelector('.rule-db')?.value ?? initDb;
            openDropdown(currentDb);
        }
    });

    document.addEventListener('click', () => dropdown.classList.add('hidden'));
    dropdown.addEventListener('click', e => e.stopPropagation());

    updateTrigger();

    wrapper.getValues   = () => [...selected];
    wrapper.resetPicker = () => {
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

function createRuleRow({ db = 'geosite.dat', values = [], action = 'proxy', rule_type, value } = {}) {
    // Back-compat: support legacy single-value and rule_type fields
    if (!values.length && value) values = [value];
    if (!db && rule_type) db = rule_type === 'ip' ? 'geoip.dat' : 'geosite.dat';

    const row = document.createElement('div');
    row.className = 'rule-row';

    const dbSelect = buildDbSelect(db);

    const picker = buildValuePicker(db, values);
    picker.className += ' rule-values';

    const actionSelect = document.createElement('select');
    actionSelect.className = 'rule-action';
    actionSelect.innerHTML = `
        <option value="direct" ${action === 'direct' ? 'selected' : ''}>direct</option>
        <option value="proxy"  ${action === 'proxy'  ? 'selected' : ''}>proxy</option>
        <option value="block"  ${action === 'block'  ? 'selected' : ''}>block</option>
    `;

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
//  DNS rows
// ============================================================

function createDnsRow({ preset = 'google_doh', custom = '', db = 'geosite.dat', values = [] } = {}) {
    const row = document.createElement('div');
    row.className = 'dns-row';

    // Address group: preset select + optional custom input
    const addrGroup = document.createElement('div');
    addrGroup.className = 'dns-addr-group';

    const presetSelect = document.createElement('select');
    presetSelect.className = 'dns-preset';
    [
        ['google_doh',     t('dns_preset_google')],
        ['cloudflare_doh', t('dns_preset_cloudflare')],
        ['custom',         t('dns_preset_custom')],
    ].forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (val === preset) opt.selected = true;
        presetSelect.appendChild(opt);
    });

    const customInput = document.createElement('input');
    customInput.type        = 'text';
    customInput.className   = 'dns-custom';
    customInput.placeholder = 'https://...';
    customInput.value       = custom;
    customInput.classList.toggle('hidden', preset !== 'custom');

    presetSelect.addEventListener('change', () => {
        customInput.classList.toggle('hidden', presetSelect.value !== 'custom');
        saveState();
    });

    addrGroup.appendChild(presetSelect);
    addrGroup.appendChild(customInput);

    const dbSelect = buildDbSelect(db);
    dbSelect.className = 'rule-db dns-db';

    const picker = buildValuePicker(db, values);
    picker.className += ' rule-values';

    const removeBtn = document.createElement('button');
    removeBtn.type      = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.title     = t('remove_title');
    removeBtn.textContent = '✕';

    dbSelect.addEventListener('change', () => { picker.resetPicker(); saveState(); });
    removeBtn.addEventListener('click', () => { row.remove(); saveState(); });

    row.appendChild(addrGroup);
    row.appendChild(dbSelect);
    row.appendChild(picker);
    row.appendChild(removeBtn);

    return row;
}

function collectDns() {
    return [...dnsContainer.querySelectorAll('.dns-row')].map(row => ({
        preset: row.querySelector('.dns-preset').value,
        custom: row.querySelector('.dns-custom').value.trim(),
        db:     row.querySelector('.rule-db').value,
        values: row.querySelector('.rule-values')?.getValues?.() ?? [],
    }));
}

addDnsBtn.addEventListener('click', () => {
    dnsContainer.appendChild(createDnsRow());
    saveState();
});

// ============================================================
//  Init
// ============================================================

(async function init() {
    // Apply saved or default language first
    applyLang();

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

    const state = loadState();

    databases = serverDbs;
    renderDatabases();

    if (state) {
        document.getElementById('inbound_ip').value         = state.inbound_ip       ?? '0.0.0.0';
        document.getElementById('inbound_port').value       = state.inbound_port     ?? '10808';
        document.getElementById('socks5_auth').checked      = state.socks5_auth      ?? false;
        document.getElementById('socks5_user').value        = state.socks5_user      ?? '';
        document.getElementById('socks5_pass').value        = state.socks5_pass      ?? '';
        socks5AuthFields.classList.toggle('hidden', !state.socks5_auth);
        document.getElementById('vless_link').value          = state.vless_link       ?? '';
        document.getElementById('block_bittorrent').checked  = state.block_bittorrent ?? false;
        document.getElementById('default_outbound').value    = state.default_outbound ?? 'proxy';
        document.getElementById('domain_strategy').value     = state.domain_strategy  ?? 'IPIfNonMatch';
        document.getElementById('dns_enabled').checked       = state.dns_enabled  ?? false;
        document.getElementById('dns_fallback').value        = state.dns_fallback ?? '';
        dnsFields.classList.toggle('hidden', !state.dns_enabled);
        dnsContainer.innerHTML = '';
        if (Array.isArray(state.dns_rules)) {
            state.dns_rules.forEach(r => dnsContainer.appendChild(createDnsRow(r)));
        }
        document.getElementById('log_enabled').checked       = state.log_enabled       ?? false;
        document.getElementById('log_dir').value             = state.log_dir           ?? '';
        document.getElementById('log_level').value           = state.log_level         ?? 'warning';
        logFields.classList.toggle('hidden', !state.log_enabled);
        autoResize(vlessTextarea);

        rulesContainer.innerHTML = '';
        const rules = Array.isArray(state.rules) && state.rules.length ? state.rules : DEFAULT_RULES;
        rules.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
    } else {
        loadDefaultRules();
    }
})();

// ============================================================
//  Form submit
// ============================================================

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAll();

    const ip   = document.getElementById('inbound_ip').value.trim();
    const port = parseInt(document.getElementById('inbound_port').value, 10);
    const link = document.getElementById('vless_link').value.trim();

    if (!link.startsWith('vless://')) {
        showError(t('err_vless_prefix'));
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
                socks5_auth:      document.getElementById('socks5_auth').checked,
                socks5_user:      document.getElementById('socks5_user').value.trim(),
                socks5_pass:      document.getElementById('socks5_pass').value,
                vless_link:       link,
                block_bittorrent:  document.getElementById('block_bittorrent').checked,
                default_outbound:  document.getElementById('default_outbound').value,
                domain_strategy:   document.getElementById('domain_strategy').value,
                dns_enabled:  document.getElementById('dns_enabled').checked,
                dns_fallback: document.getElementById('dns_fallback').value.trim(),
                dns_rules:    collectDns(),
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
    document.getElementById('socks5_auth').checked      = false;
    document.getElementById('socks5_user').value        = '';
    document.getElementById('socks5_pass').value        = '';
    socks5AuthFields.classList.add('hidden');
    document.getElementById('block_bittorrent').checked = false;
    document.getElementById('default_outbound').value   = 'proxy';
    document.getElementById('domain_strategy').value    = 'IPIfNonMatch';
    document.getElementById('dns_enabled').checked = false;
    document.getElementById('dns_fallback').value  = '';
    dnsFields.classList.add('hidden');
    dnsContainer.innerHTML = '';
    document.getElementById('log_enabled').checked      = false;
    document.getElementById('log_dir').value            = '';
    document.getElementById('log_level').value          = 'warning';
    logFields.classList.add('hidden');
    loadDefaultRules();
    hideAll();
    localStorage.removeItem(LS_KEY);
});

// ============================================================
//  Result helpers
// ============================================================

function closeError() {
    errorBox.classList.add('hidden');
    errorBackdrop.classList.add('hidden');
}

document.getElementById('error-close').addEventListener('click', closeError);
errorBackdrop.addEventListener('click', closeError);

function showError(msg) {
    errorText.textContent = msg;
    errorBox.classList.remove('hidden');
    errorBackdrop.classList.remove('hidden');
    resultBox.classList.add('hidden');
}

function showResult(json) {
    resultPre.textContent = JSON.stringify(json, null, 2);
    resultBox.classList.remove('hidden');
    errorBox.classList.add('hidden');
}

function hideAll() {
    resultBox.classList.add('hidden');
    closeError();
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
