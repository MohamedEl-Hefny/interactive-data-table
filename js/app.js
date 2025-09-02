// ------------------------
// Auth check
// ------------------------
const currentUser = localStorage.getItem('currentUser');
if (!currentUser) {
    alert('You must be logged in to access this page.');
    window.location.href = 'login.html';
}

// ------------------------
// Listen for logout (storage event)
// ------------------------
window.addEventListener('storage', (e) => {
    if (e.key === 'currentUser' && !e.newValue) {
        alert('You have been logged out.');
        window.location.href = 'login.html';
    }
});

// ------------------------
// Utilities
// ------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const debounce = (fn, ms = 300) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); } };
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const toKey = (row) => `${row.API || ''}::${row.Link || ''}`;
const isURL = (s) => { try { new URL(s); return true; } catch { return false; } }

// ------------------------
// State & Persistence
// ------------------------
const STORAGE_KEY = 'publicapis_localEdits_v1';
const state = {
    remote: [],
    dataset: [],
    sort: { key: 'API', dir: 'asc' },
    page: 1,
    perPage: 10,
    search: '',
    filters: { category: '', https: '', auth: '' },
    edits: { added: [], updated: {}, deleted: [] },
};

function loadEdits() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return; const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') state.edits = parsed; } catch (e) { console.warn('Failed to parse saved edits', e); }
}
function saveEdits() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.edits)); }
function resetEdits() { state.edits = { added: [], updated: {}, deleted: [] }; saveEdits(); rebuildDataset(); toast('Local edits cleared'); }

// ------------------------
// Fetch & Build Dataset
// ------------------------
async function fetchData() {
    try {
        // Try the live mirror
        const res = await fetch("https://api.publicapis.org/entries");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        return (json && json.entries) ? json.entries : [];
    } catch (err) {
        console.warn("Remote API failed, falling back to local db/resources.json", err);
        const res2 = await fetch("./resources.json");
        const json2 = await res2.json();
        return Array.isArray(json2.entries) ? json2.entries : [];
    }
}

function applyEdits(base) {
    const deleted = new Set(state.edits.deleted);
    const updated = state.edits.updated || {};
    // apply updates & deletions
    const merged = base.filter(r => !deleted.has(r.id)).map(r => updated[r.id] ? { ...r, ...updated[r.id] } : r);
    // add additions (ensure id exists)
    const additions = (state.edits.added || []).map(r => ({ id: r.id || toKey(r) || uid(), ...r }));
    // avoid accidental duplicates with same id
    const exists = new Set(merged.map(r => r.id));
    const extra = additions.filter(r => !exists.has(r.id));
    return [...merged, ...extra];
}

function rebuildDataset() {
    state.dataset = applyEdits(state.remote);
    renderAll();
}

// ------------------------
// Filters, Search, Sort, Paginate
// ------------------------
function getWorkingSet() {
    let rows = [...state.dataset];

    // search
    const q = state.search.trim().toLowerCase();
    if (q) {
        rows = rows.filter(r =>
            [r.API, r.Description, r.Category].some(v => (v || '').toString().toLowerCase().includes(q))
        );
    }

    // filters
    if (state.filters.category) { rows = rows.filter(r => r.Category === state.filters.category); }
    if (state.filters.https) { rows = rows.filter(r => String(r.HTTPS) === state.filters.https); }
    if (state.filters.auth) {
        if (state.filters.auth === 'none') rows = rows.filter(r => !r.Auth);
        else if (state.filters.auth === 'apikey') rows = rows.filter(r => (r.Auth || '').toLowerCase().includes('api'));
        else if (state.filters.auth === 'oauth') rows = rows.filter(r => (r.Auth || '').toLowerCase().includes('oauth'));
    }

    // sort
    const { key, dir } = state.sort;
    rows.sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        let cmp = 0;
        if (typeof va === 'boolean' || typeof vb === 'boolean') cmp = (va === vb) ? 0 : (va ? 1 : -1);
        else cmp = String(va || '').localeCompare(String(vb || ''), undefined, { sensitivity: 'base' });
        return dir === 'asc' ? cmp : -cmp;
    });

    return rows;
}

function paginate(rows) {
    const total = rows.length;
    const per = state.perPage;
    const pages = Math.max(1, Math.ceil(total / per));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * per;
    const sliced = rows.slice(start, start + per);
    return { total, pages, start, end: Math.min(total, start + per), sliced };
}

// ------------------------
// Renderers
// ------------------------
function renderTable() {
    const tbody = $('#tableBody');
    const rows = getWorkingSet();
    const page = paginate(rows);

    // showing text
    $('#showing').textContent = page.total ? `Showing ${page.start + 1}–${page.end} of ${page.total.toLocaleString()}` : 'No results';

    if (!page.total) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty">No results match your filters.</td></tr>`;
        renderPagination(1, 1);
        return;
    }

    tbody.innerHTML = page.sliced.map(r => rowHTML(r)).join('');

    // mark sort indicators
    $$('thead th').forEach(th => th.removeAttribute('data-sort-dir'));
    const th = document.querySelector(`thead th[data-key="${state.sort.key}"]`);
    if (th) th.setAttribute('data-sort-dir', state.sort.dir);

    renderPagination(state.page, page.pages);
}

function rowHTML(r) {
    const httpsTag = r.HTTPS ? '<span class="tag ok">HTTPS</span>' : '<span class="tag warn">HTTP</span>';
    const authText = r.Auth || '';
    const cors = r.Cors || '';
    const safe = (s) => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const link = r.Link && isURL(r.Link) ? `<a class="link" href="${safe(r.Link)}" target="_blank" rel="noreferrer noopener">Open ↗</a>` : '';
    return `<tr data-id="${r.id}">
      <td data-col="API">${safe(r.API)}</td>
      <td data-col="Description">${safe(r.Description)}</td>
      <td data-col="Category">${safe(r.Category)}</td>
      <td data-col="HTTPS" data-type="bool">${httpsTag}</td>
      <td data-col="Auth">${safe(authText)}</td>
      <td data-col="Cors">${safe(cors)}</td>
      <td data-col="Link">${link}</td>
      <td class="col-actions">
        <button class="btn-ghost btn-edit">Edit</button>
        <button class="btn-danger btn-del">Delete</button>
      </td>
    </tr>`;
}

function renderPagination(page, pages) {
    const nav = $('#pagination');
    const btn = (label, disabled, on) => `<button ${disabled ? 'disabled' : ''} data-action="${on}">${label}</button>`;

    const items = [];
    items.push(btn('« First', page <= 1, 'first'));
    items.push(btn('‹ Prev', page <= 1, 'prev'));
    // window of pages
    const win = 2; // show current ±2
    const start = Math.max(1, page - win);
    const end = Math.min(pages, page + win);
    for (let p = start; p <= end; p++) {
        items.push(`<button class="page" ${p === page ? 'aria-current="page"' : ''} data-page="${p}">${p}</button>`);
    }
    items.push(btn('Next ›', page >= pages, 'next'));
    items.push(btn('Last »', page >= pages, 'last'));

    nav.innerHTML = items.join('');
}


function renderAll() {
    renderTable();
}

// ------------------------
// Events
// ------------------------
function attachEvents() {
    // Sorting
    $('thead').addEventListener('click', (e) => {
        const th = e.target.closest('th.sortable');
        if (!th) return;
        const key = th.getAttribute('data-key');
        if (state.sort.key === key) { state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc'; }
        else { state.sort.key = key; state.sort.dir = 'asc'; }
        renderTable();
    });

    // Pagination
    $('#pagination').addEventListener('click', (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        const pageAttr = btn.getAttribute('data-page');
        const action = btn.getAttribute('data-action');
        if (pageAttr) { state.page = parseInt(pageAttr, 10); renderTable(); return; }
        if (action === 'first') { state.page = 1; }
        if (action === 'prev') { state.page = Math.max(1, state.page - 1); }
        if (action === 'next') { state.page = state.page + 1; }
        if (action === 'last') {
            const pages = Math.max(1, Math.ceil(getWorkingSet().length / state.perPage));
            state.page = pages;
        }
        renderTable();
    });

    // Search (debounced)
    $('#searchInput').addEventListener('input', debounce(e => {
        state.search = e.target.value; state.page = 1; renderTable();
    }, 250));

    // Filters
    $('#categoryFilter').addEventListener('change', e => { state.filters.category = e.target.value; state.page = 1; renderTable(); });
    $('#httpsFilter').addEventListener('change', e => { state.filters.https = e.target.value; state.page = 1; renderTable(); });
    $('#authFilter').addEventListener('change', e => { state.filters.auth = e.target.value; state.page = 1; renderTable(); });

    // Per-page
    $('#perPageSelect').addEventListener('change', e => { state.perPage = parseInt(e.target.value, 10); state.page = 1; renderTable(); });

    // Add new
    $('#addBtn').addEventListener('click', () => { toggleCreateForm(true); });
    $('#cancelNewBtn').addEventListener('click', () => { toggleCreateForm(false); });
    $('#saveNewBtn').addEventListener('click', onCreateSubmit);

    // Table actions (edit/delete)
    $('#tableBody').addEventListener('click', (e) => {
        const tr = e.target.closest('tr'); if (!tr) return;
        const id = tr.getAttribute('data-id');
        if (e.target.classList.contains('btn-del')) { onDeleteRow(id); }
        if (e.target.classList.contains('btn-edit')) { onEditRow(tr, id); }
        if (e.target.classList.contains('btn-save')) { onSaveEdit(tr, id); }
        if (e.target.classList.contains('btn-cancel')) { onCancelEdit(tr, id); }
    });

    // Retry fetch
    $('#retryBtn').addEventListener('click', init);

    // Export
    $('#exportBtn').addEventListener('click', exportJSON);

    // Reset edits
    $('#resetEditsBtn').addEventListener('click', () => {
        if (confirm('This will remove all locally added/edited/deleted rows. Continue?')) resetEdits();
    });
}

function toggleCreateForm(show) {
    const el = $('#createForm');
    el.classList.toggle('show', !!show);
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (show) { $('#fAPI').focus(); }
    else { clearCreateForm(); }
}
function clearCreateForm() { ['fAPI', 'fDescription', 'fCategory', 'fLink'].forEach(id => { $('#' + id).value = ''; }); $('#fHTTPS').value = 'true'; $('#fAuth').value = ''; }

function onCreateSubmit() {
    const API = $('#fAPI').value.trim();
    const Description = $('#fDescription').value.trim();
    const Category = $('#fCategory').value.trim();
    const HTTPS = $('#fHTTPS').value === 'true';
    const Auth = $('#fAuth').value.trim();
    const Link = $('#fLink').value.trim();

    if (!API || !Description || !Category || !Link) return alert('Please fill in all required fields (*)');
    if (!isURL(Link)) return alert('Link must be a valid URL starting with http:// or https://');

    const newRow = { id: uid(), API, Description, Category, HTTPS, Auth, Cors: 'unknown', Link };
    state.edits.added.push(newRow); saveEdits();
    rebuildDataset();
    toggleCreateForm(false);
    toast('Entry added');
}

function onDeleteRow(id) {
    if (!confirm('Delete this row? This only affects your local view.')) return;
    // If row was added locally, remove it from added; otherwise mark as deleted
    const idx = state.edits.added.findIndex(r => r.id === id);
    if (idx > -1) { state.edits.added.splice(idx, 1); }
    else {
        if (!state.edits.deleted.includes(id)) state.edits.deleted.push(id);
        // also drop any pending update for same id
        delete state.edits.updated[id];
    }
    saveEdits();
    rebuildDataset();
    toast('Row deleted');
}

function onEditRow(tr, id) {
    if (tr.classList.contains('row-editing')) return; // already editing
    tr.classList.add('row-editing');
    const get = (col) => tr.querySelector(`[data-col="${col}"]`);
    const readText = (el) => el?.textContent?.trim() || '';

    const current = {
        API: readText(get('API')),
        Description: readText(get('Description')),
        Category: readText(get('Category')),
        HTTPS: (get('HTTPS')?.textContent || '').toLowerCase().includes('https'),
        Auth: readText(get('Auth')),
        Cors: readText(get('Cors')),
        Link: get('Link')?.querySelector('a')?.getAttribute('href') || ''
    };

    get('API').innerHTML = `<input value="${escapeAttr(current.API)}" />`;
    get('Description').innerHTML = `<input value="${escapeAttr(current.Description)}" />`;
    get('Category').innerHTML = `<input value="${escapeAttr(current.Category)}" />`;
    get('HTTPS').innerHTML = `<select><option value="true" ${current.HTTPS ? 'selected' : ''}>Yes</option><option value="false" ${!current.HTTPS ? 'selected' : ''}>No</option></select>`;
    get('Auth').innerHTML = `<input value="${escapeAttr(current.Auth)}" />`;
    get('Cors').innerHTML = `<input value="${escapeAttr(current.Cors)}" />`;
    get('Link').innerHTML = `<input value="${escapeAttr(current.Link)}" />`;

    const actions = tr.querySelector('.col-actions');
    actions.innerHTML = `<button class="btn-primary btn-save">Save</button> <button class="btn-ghost btn-cancel">Cancel</button>`;
}

function onSaveEdit(tr, id) {
    const getVal = (col) => tr.querySelector(`[data-col="${col}"] input, [data-col="${col}"] select`).value.trim();
    const API = getVal('API');
    const Description = getVal('Description');
    const Category = getVal('Category');
    const HTTPS = getVal('HTTPS') === 'true';
    const Auth = getVal('Auth');
    const Cors = getVal('Cors');
    const Link = getVal('Link');

    if (!API || !Description || !Category || !Link) { alert('Please fill in required fields'); return; }
    if (!isURL(Link)) { alert('Link must be a valid URL'); return; }

    // If this row was locally added, update it in-place; else record update
    const addIdx = state.edits.added.findIndex(r => r.id === id);
    const payload = { id, API, Description, Category, HTTPS, Auth, Cors, Link };
    if (addIdx > -1) { state.edits.added[addIdx] = payload; }
    else state.edits.updated[id] = payload;

    saveEdits();
    rebuildDataset();
    toast('Changes saved');
}

function onCancelEdit(tr, id) { rebuildDataset(); }

function exportJSON() {
    const data = getWorkingSet();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'public-apis-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

// ------------------------
// Init
// ------------------------
async function init() {
    $('#errorBanner').classList.remove('show');
    loadEdits();
    try {
        const data = await fetchData();
        // assign IDs so edits/deletions work
        state.remote = data.map(e => ({ id: toKey(e) || uid(), ...e }));
    } catch (err) {
        console.error('Failed to fetch data', err);
        $('#errorBanner').classList.add('show');
        state.remote = [];
    }
    rebuildDataset();
    attachEvents();
}

// kick off
init();