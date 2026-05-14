/**
 * Kalvium CGPA Dashboard - Original Version (Restored)
 */

const SUBJECTS = [
    { id: 'bocs',  name: 'BOCS',  fullName: 'Basics of Computer Science', credits: 4, type: 'bocs_lthtl' },
    { id: 'bewd',  name: 'BEWD',  fullName: 'Backend & Web Development', credits: 5, type: 'bewd_dbms' },
    { id: 'dbms',  name: 'DBMS',  fullName: 'Database Management Systems', credits: 3, type: 'bewd_dbms' },
    { id: 'mern',  name: 'MERN',  fullName: 'MERN Stack Development', credits: 4, type: 'mern' },
    { id: 'lthtl', name: 'LTHTL', fullName: 'Learn to Hack, Think and Lead', credits: 4, type: 'bocs_lthtl' },
];

const TOTAL_CREDITS = 20;
const LS_KEY = 'kalvium_cgpa_v2';
const LS_HISTORY = 'kalvium_history_v2';
const LS_THEME = 'kalvium_theme';
const LS_BANNER = 'kalvium_banner';

let state = {};
let history = [];
let trendChart = null;
let saveTimer = null;
let deleteSemId = null;

function init() {
    loadState();
    loadHistory();
    applyTheme(localStorage.getItem(LS_THEME) || 'dark');
    renderSubjects();
    recalcAll();
    renderHistory();
    renderTrendChart();
    setFooterTime();
    if (localStorage.getItem(LS_BANNER) === 'dismissed') {
        const b = document.getElementById('welcome-banner');
        if (b) b.style.display = 'none';
    }
}

// Logic & Calculations
function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) state = JSON.parse(raw);
    } catch { state = {}; }
    SUBJECTS.forEach(s => {
        if (!state[s.id]) state[s.id] = { ca1:0, ca2:0, ca3:0, ca4:0, ca5:0, att:0 };
    });
}

function getAttMark(att) {
    const a = parseFloat(att) || 0;
    if (a >= 90) return 5;
    if (a >= 85) return 4;
    if (a >= 80) return 3;
    if (a >= 75) return 2;
    return 0;
}

function calcTotalMarks(subj, data) {
    const { ca1=0, ca2=0, ca3=0, ca4=0, ca5=0, att=0 } = data;
    const g = getAttMark(att);
    const [b, c, d, e, f] = [+ca1, +ca2, +ca3, +ca4, +ca5];
    let raw = 0;

    switch (subj.type) {
        case 'bocs_lthtl':
            raw = ((19/40)*(b+c+d) + (19/60)*(e+f) + g);
            break;
        case 'bewd_dbms':
            raw = ((95/3)*(b/40 + Math.max(c,d)/40 + Math.max(e,f)/60) + g);
            break;
        case 'mern':
            raw = ((95/4)*(b/40 + c/40 + d/40 + Math.max(e,f)/60) + g);
            break;
    }
    return Math.min(100, Math.round(raw * 100) / 100);
}

function gradePointFromTotal(total) {
    if (total <= 30) return 0;
    // Formula: Jx = INT((TotalMarks-1)/10) + 1
    // 91-100: 10, 81-90: 9, 71-80: 8, 61-70: 7, 51-60: 6, 41-50: 5, 31-40: 4
    return Math.floor((total - 1) / 10) + 1;
}

function gradeLabelFromGP(gp) {
    const map = {
        10: { letter: 'O',  cls: 'grade-o' },
        9:  { letter: 'A+', cls: 'grade-a' },
        8:  { letter: 'A',  cls: 'grade-a' },
        7:  { letter: 'B+', cls: 'grade-b' },
        6:  { letter: 'B',  cls: 'grade-b' },
        5:  { letter: 'C+', cls: 'grade-c' }, // C+ as requested
        4:  { letter: 'C',  cls: 'grade-c' }  // C as requested
    };
    return map[gp] || { letter: 'F', cls: 'grade-f' };
}

function recalcAll() {
    let weightedGP = 0;
    const totals = {};
    const grades = {};

    SUBJECTS.forEach(s => {
        const total = calcTotalMarks(s, state[s.id]);
        const gp = gradePointFromTotal(total);
        totals[s.id] = total;
        grades[s.id] = gp;
        weightedGP += (gp * s.credits);

        // Update card UI
        const ptEl = document.getElementById(`pts-${s.id}`);
        if (ptEl) ptEl.textContent = (total/10).toFixed(4); // Displaying raw points/10 as before
        const totEl = document.getElementById(`total-${s.id}`);
        if (totEl) totEl.textContent = total.toFixed(2);
        const gradeEl = document.getElementById(`grade-${s.id}`);
        if (gradeEl) {
            const lbl = gradeLabelFromGP(gp);
            gradeEl.textContent = lbl.letter;
            gradeEl.className = `grade-badge ${lbl.cls}`;
        }
    });

    const cgpa = Math.round((weightedGP / TOTAL_CREDITS) * 100) / 100;
    const hasData = SUBJECTS.some(s => Object.values(state[s.id]).some(v => v > 0));

    // Summary
    document.getElementById('summary-cgpa').textContent = hasData ? cgpa.toFixed(2) : '—';
    document.getElementById('summary-grade').textContent = hasData ? getOverallGrade(cgpa) : '—';
    document.getElementById('summary-status').textContent = hasData ? getStatus(cgpa) : '—';
    document.getElementById('cgpa-display').textContent = hasData ? cgpa.toFixed(2) : '—';
    
    const badge = document.getElementById('cgpa-badge');
    if (badge) {
        badge.textContent = hasData ? `Grade ${getOverallGrade(cgpa)}` : 'No Data';
    }

    const bar = document.getElementById('cgpa-progress-bar');
    if (bar) bar.style.width = hasData ? `${(cgpa / 10) * 100}%` : '0%';

    renderBreakdown(totals, grades);
}

function getOverallGrade(cgpa) {
    if (cgpa >= 9) return 'O';
    if (cgpa >= 8) return 'A+';
    if (cgpa >= 7) return 'A';
    if (cgpa >= 6) return 'B+';
    if (cgpa >= 5) return 'B';
    if (cgpa >= 4) return 'C';
    return 'F';
}

function getStatus(cgpa) {
    if (cgpa >= 8.5) return 'Excellent';
    if (cgpa >= 7) return 'Good';
    if (cgpa >= 5) return 'Pass';
    return 'At Risk';
}

// Rendering
function renderSubjects() {
    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = SUBJECTS.map(s => {
        const d = state[s.id];
        return `
            <div class="subject-card" id="card-${s.id}">
                <div class="card-header">
                    <div class="subj-info">
                        <h3>${s.name}</h3>
                        <p>${s.fullName} (${s.credits} Credits)</p>
                    </div>
                    <div class="card-score">
                        <div class="score-num" id="total-${s.id}">0.00</div>
                        <div class="score-lbl">Total Marks</div>
                    </div>
                </div>
                <div class="ca-grid">
                    ${[1,2,3,4,5].map(n => `
                        <div class="input-group">
                            <label>CA${n}</label>
                            <input type="number" class="ca-input" value="${d['ca'+n] || ''}" 
                                oninput="handleInput('${s.id}', 'ca${n}', this, ${n<=3?40:60})">
                        </div>
                    `).join('')}
                    <div class="input-group">
                        <label>Att%</label>
                        <input type="number" class="ca-input" value="${d.att || ''}" 
                            oninput="handleInput('${s.id}', 'att', this, 100)">
                    </div>
                </div>
                <div class="card-footer">
                    <span id="grade-${s.id}" class="grade-badge">—</span>
                    <span class="pts-display">SGPA Pts: <strong id="pts-${s.id}">0.0000</strong></span>
                </div>
            </div>
        `;
    }).join('');
}

function renderBreakdown(totals, grades) {
    const table = document.getElementById('cgpa-breakdown-table');
    table.innerHTML = SUBJECTS.map(s => {
        const lbl = gradeLabelFromGP(grades[s.id]);
        return `
            <div class="breakdown-row">
                <span class="br-name">${s.name}</span>
                <span class="br-dots"></span>
                <span class="br-grade ${lbl.cls}">${lbl.letter}</span>
                <span class="br-gp">GP ${grades[s.id]}</span>
            </div>
        `;
    }).join('');
}

// Events
function handleInput(subjId, field, el, max) {
    let val = parseFloat(el.value);
    if (isNaN(val)) val = 0;
    if (val > max) { val = max; el.value = max; }
    if (val < 0) { val = 0; el.value = 0; }
    
    state[subjId][field] = val;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
        const now = new Date();
        document.getElementById('summary-time').textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        recalcAll();
    }, 300);
}

// Themes
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LS_THEME, theme);
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// History & Modals (Restored logic)
function addSemesterSnapshot() {
    const cgpa = document.getElementById('summary-cgpa').textContent;
    if (cgpa === '—') return;
    history.push({ id: Date.now(), cgpa, date: new Date().toLocaleDateString() });
    localStorage.setItem(LS_HISTORY, JSON.stringify(history));
    renderHistory();
    renderTrendChart();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    if (history.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    list.style.display = 'block';
    empty.style.display = 'none';
    list.innerHTML = history.slice().reverse().map(h => `
        <div class="history-item">
            <div class="hist-info">
                <span class="hist-cgpa">${h.cgpa}</span>
                <span class="hist-date">${h.date}</span>
            </div>
            <button class="btn-del" onclick="deleteHistory(${h.id})">🗑️</button>
        </div>
    `).join('');
}

function deleteHistory(id) {
    history = history.filter(h => h.id !== id);
    localStorage.setItem(LS_HISTORY, JSON.stringify(history));
    renderHistory();
    renderTrendChart();
}

function renderTrendChart() {
    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;
    if (trendChart) trendChart.destroy();
    
    const data = history.slice(-10);
    if (data.length === 0) {
        document.getElementById('chart-empty').style.display = 'flex';
        return;
    }
    document.getElementById('chart-empty').style.display = 'none';

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'CGPA',
                data: data.map(d => d.cgpa),
                borderColor: '#6366f1',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.1)'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 10 } }
        }
    });
}

function openFormulaModal() { document.getElementById('formula-modal').classList.add('active'); }
function closeFormulaModal() { document.getElementById('formula-modal').classList.remove('active'); }
function openResetModal() { document.getElementById('reset-modal').classList.add('active'); }
function closeResetModal() { document.getElementById('reset-modal').classList.remove('active'); }
function confirmReset() {
    state = {};
    history = [];
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_HISTORY);
    location.reload();
}

function dismissBanner() {
    document.getElementById('welcome-banner').style.display = 'none';
    localStorage.setItem(LS_BANNER, 'dismissed');
}

function setFooterTime() {
    const now = new Date();
    document.getElementById('footer-time').textContent = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(LS_HISTORY);
        if (raw) history = JSON.parse(raw);
    } catch { history = []; }
}

document.addEventListener('DOMContentLoaded', init);
