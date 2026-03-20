// ============================================================
//  Constants & defaults
// ============================================================

const DEFAULT_DATABASES = ['geosite.dat', 'geoip.dat']; // fallback if server unavailable


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
const errorText      = document.getElementById('error-text');

const dbListEl       = document.getElementById('db-list');
const rulesContainer = document.getElementById('routing-rules');
const addRuleBtn     = document.getElementById('add-rule-btn');

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
        vless_link:       document.getElementById('vless_link').value,
        block_bittorrent: document.getElementById('block_bittorrent').checked,
        rules: collectRules(),
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
//  Database manager
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
//  DB select builder
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

    // --- Trigger label ---
    function updateTrigger() {
        if (selected.size === 0) {
            trigger.textContent = 'Выбрать...';
            trigger.classList.add('empty');
        } else if (selected.size === 1) {
            trigger.textContent = [...selected][0];
            trigger.classList.remove('empty');
        } else {
            trigger.textContent = `${selected.size} выбрано`;
            trigger.classList.remove('empty');
        }
    }

    // --- Chips (for values not present as checkboxes) ---
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

    function syncChips() {
        selected.forEach(val => {
            const hasCheckbox = !!dropdown.querySelector(`.picker-item[data-value="${CSS.escape(val)}"]`);
            if (!hasCheckbox) addChip(val);
        });
    }

    // --- Render checkboxes + search ---
    function renderCheckboxes(tags) {
        dropdown.querySelectorAll('.picker-search, .picker-item, .picker-sep, .picker-loading').forEach(el => el.remove());

        // Search / custom input
        const searchWrap  = document.createElement('div');
        searchWrap.className = 'picker-search';

        const searchInput = document.createElement('input');
        searchInput.type         = 'text';
        searchInput.placeholder  = 'Поиск или своё значение...';
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
                btn.textContent = `➕ Добавить «${searchInput.value.trim()}»`;
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

            // Checked first, then separator, then unchecked
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

    // --- Open (async load) ---
    async function openDropdown(currentDb) {
        dropdown.classList.remove('hidden');

        if (knownTags === null) {
            const loading = document.createElement('div');
            loading.className   = 'picker-loading';
            loading.textContent = 'Загрузка...';
            dropdown.insertBefore(loading, chipsRow);

            const tags = await fetchTags(currentDb);
            knownTags = tags;
            renderCheckboxes(knownTags);
        } else {
            const si = dropdown.querySelector('.picker-search input');
            if (si) { si.value = ''; si.focus(); si.dispatchEvent(new Event('input')); }
        }
    }

    // --- Toggle ---
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
    // Back-compat
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
    removeBtn.type      = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.title     = 'Удалить';
    removeBtn.textContent = '✕';

    dbSelect.addEventListener('change', () => { picker.resetPicker(); saveState(); });
    removeBtn.addEventListener('click', () => { row.remove(); saveState(); });

    row.appendChild(dbSelect);
    row.appendChild(picker);
    row.appendChild(actionSelect);
    row.appendChild(removeBtn);

    return row;
}

function renderAllRuleDbSelects() {
    rulesContainer.querySelectorAll('.rule-row').forEach(row => {
        const currentDb = row.querySelector('.rule-db')?.value ?? 'geosite.dat';
        const newDbSel  = buildDbSelect(currentDb);
        row.replaceChild(newDbSel, row.querySelector('.rule-db'));
    });
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
//  Init
// ============================================================

(async function init() {
    // Load available databases from server
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
        document.getElementById('vless_link').value         = state.vless_link       ?? '';
        document.getElementById('block_bittorrent').checked = state.block_bittorrent ?? false;
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
        showError('VLESS-ссылка должна начинаться с vless://');
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
                vless_link:       link,
                block_bittorrent: document.getElementById('block_bittorrent').checked,
                routing_rules:    collectRules(),
            }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            showError(data.error ?? `Ошибка сервера: ${res.status}`);
        } else {
            showResult(data);
        }
    } catch (err) {
        showError('Не удалось связаться с сервером: ' + err.message);
    } finally {
        submitBtn.disabled = false;
    }
});

// ============================================================
//  Clear
// ============================================================

clearBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('inbound_ip').value         = '0.0.0.0';
    document.getElementById('inbound_port').value       = '10808';
    document.getElementById('block_bittorrent').checked = false;
    loadDefaultRules();
    hideAll();
    localStorage.removeItem(LS_KEY);
});

// ============================================================
//  Result helpers
// ============================================================

function showError(msg) {
    errorBox.classList.remove('hidden');
    errorText.textContent = msg;
    resultBox.classList.add('hidden');
}

function showResult(json) {
    resultPre.textContent = JSON.stringify(json, null, 2);
    resultBox.classList.remove('hidden');
    errorBox.classList.add('hidden');
}

function hideAll() {
    resultBox.classList.add('hidden');
    errorBox.classList.add('hidden');
}

// ============================================================
//  Copy / Download
// ============================================================

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultPre.textContent).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = '✓ Скопировано';
        setTimeout(() => { copyBtn.textContent = orig; }, 1500);
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
