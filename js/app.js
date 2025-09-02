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