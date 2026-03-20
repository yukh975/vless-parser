// ============================================================
//  Constants & defaults
// ============================================================

const DEFAULT_DATABASES = ['geosite.dat', 'geoip.dat'];

// Preset values shown as datalist suggestions in the rule value field
const PRESETS = {
    domain: [
        { value: 'ru-blocked',                  label: 'ru-blocked — заблокированные в РФ (antifilter + re:filter)' },
        { value: 'ru-blocked-all',              label: 'ru-blocked-all — все заблокированные в РФ (700k+, осторожно)' },
        { value: 'ru-available-only-inside',    label: 'ru-available-only-inside — доступно только внутри РФ' },
        { value: 'antifilter-download',         label: 'antifilter-download — antifilter.download (700k, осторожно)' },
        { value: 'antifilter-download-community', label: 'antifilter-download-community — community.antifilter.download' },
        { value: 'refilter',                    label: 'refilter — re:filter' },
        { value: 'category-ads-all',            label: 'category-ads-all — рекламные домены' },
        { value: 'win-spy',                     label: 'win-spy — слежка Windows' },
        { value: 'win-update',                  label: 'win-update — обновления Windows' },
        { value: 'win-extra',                   label: 'win-extra — прочие домены Windows' },
        { value: 'ru',                          label: 'ru — российские домены' },
    ],
    ip: [
        { value: 'private', label: 'private — локальные адреса (LAN)' },
        { value: 'ru',      label: 'ru — российские IP-адреса' },
    ],
};

const DEFAULT_RULES = [
    { rule_type: 'ip',     db: 'geoip.dat',  values: ['private'],          action: 'direct' },
    { rule_type: 'domain', db: 'geosite.dat', values: ['ru'],               action: 'direct' },
    { rule_type: 'ip',     db: 'geoip.dat',  values: ['ru'],               action: 'direct' },
    { rule_type: 'domain', db: 'geosite.dat', values: ['category-ads-all'], action: 'block'  },
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
const addDbBtn       = document.getElementById('add-db-btn');
const addDbForm      = document.getElementById('add-db-form');
const newDbName      = document.getElementById('new-db-name');
const confirmDbBtn   = document.getElementById('confirm-db-btn');
const cancelDbBtn    = document.getElementById('cancel-db-btn');

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
        inbound_ip:   document.getElementById('inbound_ip').value,
        inbound_port: document.getElementById('inbound_port').value,
        vless_link:   document.getElementById('vless_link').value,
        databases,
        rules: collectRules(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// Auto-save on any input change
document.addEventListener('input', saveState);
document.addEventListener('change', saveState);

// ============================================================
//  Database manager
// ============================================================

function renderDatabases() {
    dbListEl.innerHTML = '';
    databases.forEach((name, idx) => {
        const tag = document.createElement('div');
        tag.className = 'db-tag';
        tag.innerHTML = `
            <span class="db-tag-name">${name}</span>
            <button type="button" class="remove-btn db-remove" title="Удалить">✕</button>
        `;
        tag.querySelector('.db-remove').addEventListener('click', () => {
            databases.splice(idx, 1);
            renderDatabases();
            renderAllRuleDbSelects();
            saveState();
        });
        dbListEl.appendChild(tag);
    });
}

function getDbsForType(ruleType) {
    const prefix = ruleType === 'ip' ? 'geoip' : 'geosite';
    return databases.filter(name => name.startsWith(prefix));
}

addDbBtn.addEventListener('click', () => {
    addDbForm.classList.toggle('hidden');
    newDbName.focus();
});

cancelDbBtn.addEventListener('click', () => {
    addDbForm.classList.add('hidden');
    newDbName.value = '';
});

confirmDbBtn.addEventListener('click', () => {
    const name = newDbName.value.trim();
    if (!name) return;

    if (databases.includes(name)) {
        newDbName.focus();
        return;
    }

    databases.push(name);
    renderDatabases();
    renderAllRuleDbSelects();
    addDbForm.classList.add('hidden');
    newDbName.value = '';
    saveState();
});

newDbName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmDbBtn.click(); }
    if (e.key === 'Escape') cancelDbBtn.click();
});

// ============================================================
//  Routing rules
// ============================================================

function buildDbSelect(ruleType, selectedDb) {
    const dbs = getDbsForType(ruleType);
    const select = document.createElement('select');
    select.className = 'rule-db';

    dbs.forEach(name => {
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

function buildValuePicker(ruleType, selectedValues = []) {
    const wrapper = document.createElement('div');
    wrapper.className = 'value-picker';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'value-picker-trigger';

    const dropdown = document.createElement('div');
    dropdown.className = 'value-picker-dropdown hidden';

    const presets = PRESETS[ruleType] ?? [];
    let selected = new Set(selectedValues);

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

    function buildDropdown() {
        dropdown.innerHTML = '';

        // Checkboxes for presets
        if (presets.length) {
            presets.forEach(({ value, label }) => {
                const item = document.createElement('label');
                item.className = 'picker-item';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = value;
                cb.checked = selected.has(value);
                cb.addEventListener('change', () => {
                    cb.checked ? selected.add(value) : selected.delete(value);
                    updateTrigger();
                    saveState();
                });

                const text = document.createElement('span');
                text.textContent = label;

                item.appendChild(cb);
                item.appendChild(text);
                dropdown.appendChild(item);
            });

            const sep = document.createElement('div');
            sep.className = 'picker-sep';
            dropdown.appendChild(sep);
        }

        // Custom value input
        const customRow = document.createElement('div');
        customRow.className = 'picker-custom';

        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.placeholder = ruleType === 'ip' ? 'напр. 203.0.113.0/24' : 'напр. example.com';
        customInput.autocomplete = 'off';

        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.className = 'add-btn';
        customBtn.textContent = '+';

        function addCustom() {
            const val = customInput.value.trim();
            if (!val) return;
            selected.add(val);
            updateTrigger();
            customInput.value = '';
            // Add chip if not a preset
            if (!presets.some(p => p.value === val)) {
                addCustomChip(val);
            } else {
                // Check the matching checkbox
                dropdown.querySelectorAll('.picker-item input').forEach(cb => {
                    if (cb.value === val) cb.checked = true;
                });
            }
            saveState();
        }

        customBtn.addEventListener('click', addCustom);
        customInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
        });

        customRow.appendChild(customInput);
        customRow.appendChild(customBtn);
        dropdown.appendChild(customRow);

        // Chips for already-selected custom values (not in presets)
        const chipsRow = document.createElement('div');
        chipsRow.className = 'picker-chips';
        dropdown.appendChild(chipsRow);

        function addCustomChip(val) {
            const chip = document.createElement('span');
            chip.className = 'picker-chip';
            chip.innerHTML = `${val} <button type="button">✕</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                selected.delete(val);
                chip.remove();
                updateTrigger();
                saveState();
            });
            chipsRow.appendChild(chip);
        }

        // Render existing custom values
        selected.forEach(val => {
            if (!presets.some(p => p.value === val)) {
                addCustomChip(val);
            }
        });
    }

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        document.querySelectorAll('.value-picker-dropdown').forEach(d => d.classList.add('hidden'));
        if (!isOpen) dropdown.classList.remove('hidden');
    });

    document.addEventListener('click', () => dropdown.classList.add('hidden'));
    dropdown.addEventListener('click', e => e.stopPropagation());

    buildDropdown();
    updateTrigger();

    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);

    wrapper.getValues = () => [...selected];
    wrapper.rebuild = (newType) => {
        selected = new Set();
        buildDropdown();
        updateTrigger();
    };

    return wrapper;
}

function createRuleRow({ rule_type = 'domain', db = '', values = [], action = 'proxy' } = {}) {
    // Back-compat: old format stored single `value` string
    if (!values.length && arguments[0]?.value) {
        values = [arguments[0].value];
    }

    const row = document.createElement('div');
    row.className = 'rule-row';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'rule-type';
    typeSelect.innerHTML = `
        <option value="domain" ${rule_type === 'domain' ? 'selected' : ''}>Domain</option>
        <option value="ip"     ${rule_type === 'ip'     ? 'selected' : ''}>IP</option>
    `;

    const defaultDb = db || (rule_type === 'ip' ? 'geoip.dat' : 'geosite.dat');
    const dbSelect = buildDbSelect(rule_type, defaultDb);

    const picker = buildValuePicker(rule_type, values);
    picker.className += ' rule-values';

    const actionSelect = document.createElement('select');
    actionSelect.className = 'rule-action';
    actionSelect.innerHTML = `
        <option value="direct" ${action === 'direct' ? 'selected' : ''}>direct</option>
        <option value="proxy"  ${action === 'proxy'  ? 'selected' : ''}>proxy</option>
        <option value="block"  ${action === 'block'  ? 'selected' : ''}>block</option>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.title = 'Удалить';
    removeBtn.textContent = '✕';

    typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        const newDbSelect = buildDbSelect(newType, '');
        row.replaceChild(newDbSelect, row.querySelector('.rule-db'));
        picker.rebuild(newType);
        saveState();
    });

    removeBtn.addEventListener('click', () => { row.remove(); saveState(); });

    row.appendChild(typeSelect);
    row.appendChild(dbSelect);
    row.appendChild(picker);
    row.appendChild(actionSelect);
    row.appendChild(removeBtn);

    return row;
}

function renderAllRuleDbSelects() {
    rulesContainer.querySelectorAll('.rule-row').forEach(row => {
        const ruleType  = row.querySelector('.rule-type').value;
        const currentDb = row.querySelector('.rule-db')?.value ?? '';
        const newDbSel  = buildDbSelect(ruleType, currentDb);
        row.replaceChild(newDbSel, row.querySelector('.rule-db'));
    });
}

function loadDefaultRules() {
    rulesContainer.innerHTML = '';
    DEFAULT_RULES.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
}

function collectRules() {
    return [...rulesContainer.querySelectorAll('.rule-row')].map(row => {
        const picker = row.querySelector('.rule-values');
        const values = picker?.getValues?.() ?? [];
        return {
            rule_type: row.querySelector('.rule-type').value,
            db:        row.querySelector('.rule-db')?.value ?? '',
            values,
            action:    row.querySelector('.rule-action').value,
        };
    }).filter(r => r.values.length > 0);
}

addRuleBtn.addEventListener('click', () => {
    rulesContainer.appendChild(createRuleRow());
    saveState();
});

// ============================================================
//  Init: restore from localStorage or load defaults
// ============================================================

(function init() {
    const state = loadState();

    if (state) {
        document.getElementById('inbound_ip').value   = state.inbound_ip   ?? '0.0.0.0';
        document.getElementById('inbound_port').value = state.inbound_port ?? '10808';
        document.getElementById('vless_link').value   = state.vless_link   ?? '';

        databases = Array.isArray(state.databases)
            ? state.databases.map(db => typeof db === 'object' ? db.name : db)
            : [...DEFAULT_DATABASES];
        renderDatabases();

        rulesContainer.innerHTML = '';
        const rules = Array.isArray(state.rules) && state.rules.length ? state.rules : DEFAULT_RULES;
        rules.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
    } else {
        databases = [...DEFAULT_DATABASES];
        renderDatabases();
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
                inbound_ip:    ip,
                inbound_port:  port,
                vless_link:    link,
                routing_rules: collectRules(),
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
    document.getElementById('inbound_ip').value   = '0.0.0.0';
    document.getElementById('inbound_port').value = '10808';
    databases = [...DEFAULT_DATABASES];
    renderDatabases();
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
