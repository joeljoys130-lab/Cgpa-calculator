/**
 * Kalvium CGPA Dashboard - Core Logic
 */

const SUBJECTS = [
    { id: 'bocs', name: 'BOCS', fullName: 'Breadth of Computer Science', credits: 4, type: 'bocs' },
    { id: 'bewd', name: 'BEWD', fullName: 'Backend Web Development', credits: 5, type: 'bewd_dbms' },
    { id: 'dbms', name: 'DBMS', fullName: 'Database Management System', credits: 3, type: 'bewd_dbms' },
    { id: 'mern', name: 'MERN', fullName: 'Full Stack / MERN', credits: 4, type: 'mern' },
    { id: 'lthtl', name: 'LTHTL', fullName: 'Learning How to Learn', credits: 4, type: 'lthtl' }
];

let state = JSON.parse(localStorage.getItem('kalvium_state')) || {};
let history = JSON.parse(localStorage.getItem('kalvium_history')) || [];
let radarChart = null;

// Initialize
function init() {
    renderSubjects();
    initChart();
    updateAll();
    renderHistory();
    applyTheme(localStorage.getItem('kalvium_theme') || 'dark');
}

// Rendering
function renderSubjects() {
    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = SUBJECTS.map(s => {
        const d = state[s.id] || { cas: [0,0,0,0,0], att: 0 };
        return `
            <div class="subject-card" id="card-${s.id}">
                <div class="card-top">
                    <div class="subj-info">
                        <h3>${s.name}</h3>
                        <p>${s.fullName}</p>
                    </div>
                    <div class="subj-score">
                        <div class="score-val" id="total-${s.id}">0.00</div>
                        <div class="score-label">Total Marks</div>
                    </div>
                </div>
                <div class="inputs-grid">
                    <div class="input-box">
                        <label>CA1 (40)</label>
                        <input type="number" value="${d.cas[0]}" oninput="updateState('${s.id}', 0, this.value, 40)">
                    </div>
                    <div class="input-box">
                        <label>CA2 (40)</label>
                        <input type="number" value="${d.cas[1]}" oninput="updateState('${s.id}', 1, this.value, 40)">
                    </div>
                    <div class="input-box">
                        <label>CA3 (40)</label>
                        <input type="number" value="${d.cas[2]}" oninput="updateState('${s.id}', 2, this.value, 40)">
                    </div>
                    <div class="input-box">
                        <label>CA4 (60)</label>
                        <input type="number" value="${d.cas[3]}" oninput="updateState('${s.id}', 3, this.value, 60)">
                    </div>
                    <div class="input-box">
                        <label>CA5 (60)</label>
                        <input type="number" value="${d.cas[4]}" oninput="updateState('${s.id}', 4, this.value, 60)">
                    </div>
                    <div class="input-box">
                        <label>Att. %</label>
                        <input type="number" value="${d.att}" oninput="updateState('${s.id}', 'att', this.value, 100)">
                    </div>
                </div>
                <div class="card-footer">
                    <div class="footer-stat">
                        <span>Credits: ${s.credits}</span>
                        <span>Points: <b id="pts-${s.id}">0</b></span>
                    </div>
                    <span class="grade-pill" id="grade-${s.id}">—</span>
                </div>
            </div>
        `;
    }).join('');
}

// Logic & Calculation
function updateState(subjId, field, value, max) {
    if (!state[subjId]) state[subjId] = { cas: [0,0,0,0,0], att: 0 };
    
    let val = parseFloat(value) || 0;
    if (val > max) val = max;
    if (val < 0) val = 0;

    if (field === 'att') {
        state[subjId].att = val;
    } else {
        state[subjId].cas[field] = val;
    }

    localStorage.setItem('kalvium_state', JSON.stringify(state));
    updateAll();
}

function calculateAttendanceMarks(pct) {
    if (pct >= 90) return 5;
    if (pct >= 85) return 4;
    if (pct >= 80) return 3;
    if (pct >= 75) return 2;
    return 0;
}

function calculateSubjectTotal(subj, data) {
    const { cas, att } = data;
    const g = calculateAttendanceMarks(att);
    const [b, c, d, e, f] = cas;
    let raw = 0;

    switch (subj.type) {
        case 'bocs':
        case 'lthtl':
            // (19/40)*(B+C+D) + (19/60)*(E+F) + G
            raw = ((19/40)*(b + c + d) + (19/60)*(e + f) + g);
            break;
        case 'bewd_dbms':
            // (95/3)*(B/40 + MAX(C,D)/40 + MAX(E,F)/60) + G
            raw = ((95/3)*(b/40 + Math.max(c, d)/40 + Math.max(e, f)/60) + g);
            break;
        case 'mern':
            // (95/4)*(B/40 + C/40 + D/40 + MAX(E,F)/60) + G
            raw = ((95/4)*(b/40 + c/40 + d/40 + Math.max(e, f)/60) + g);
            break;
    }
    return Math.min(100, Math.round(raw * 100) / 100);
}

function getPointAndGrade(total) {
    if (total <= 30) return { pt: 0, grade: 'F' };
    
    // Formula: Jx = INT((TotalMarks - 1) / 10) + 1
    const pt = Math.floor((total - 1) / 10) + 1;
    const grades = { 10:'O', 9:'A+', 8:'A', 7:'B+', 6:'B', 5:'C', 4:'D' };
    
    return { pt, grade: grades[pt] || 'F' };
}

function updateAll() {
    let weightedSum = 0;
    const chartValues = [];

    SUBJECTS.forEach(s => {
        const data = state[s.id] || { cas: [0,0,0,0,0], att: 0 };
        const total = calculateSubjectTotal(s, data);
        const { pt, grade } = getPointAndGrade(total);

        document.getElementById(`total-${s.id}`).textContent = total.toFixed(2);
        document.getElementById(`pts-${s.id}`).textContent = pt;
        document.getElementById(`grade-${s.id}`).textContent = grade;
        
        weightedSum += (pt * s.credits);
        chartValues.push(total);
    });

    const cgpa = Math.round((weightedSum / 20) * 100) / 100;
    document.getElementById('display-cgpa').textContent = cgpa.toFixed(2);
    document.getElementById('display-grade').textContent = getOverallGrade(cgpa);

    updateChart(chartValues);
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

// Chart
function initChart() {
    const ctx = document.getElementById('radarChart').getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: SUBJECTS.map(s => s.id.toUpperCase()),
            datasets: [{
                label: 'Performance',
                data: [0,0,0,0,0],
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            scales: {
                r: {
                    min: 0, max: 100,
                    grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    angleLines: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    pointLabels: { color: isDark ? '#94a3b8' : '#64748b' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChart(data) {
    if (radarChart) {
        radarChart.data.datasets[0].data = data;
        radarChart.update();
    }
}

// History
function saveSnapshot() {
    const cgpa = document.getElementById('display-cgpa').textContent;
    if (cgpa === '0.00') return showToast('Enter some marks first!');
    
    const entry = {
        id: Date.now(),
        cgpa,
        date: new Date().toLocaleDateString(),
        name: `Semester ${history.length + 1}`
    };
    
    history.push(entry);
    localStorage.setItem('kalvium_history', JSON.stringify(history));
    renderHistory();
    showToast('Snapshot saved successfully!');
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (history.length === 0) {
        list.innerHTML = '<p class="empty-state">No snapshots saved yet.</p>';
        return;
    }
    
    list.innerHTML = history.slice().reverse().map(h => `
        <div class="history-item">
            <div class="hist-meta">
                <span class="hist-name">${h.name}</span>
                <span class="hist-date">${h.date}</span>
            </div>
            <span class="hist-val">${h.cgpa}</span>
        </div>
    `).join('');
}

function clearHistory() {
    if (confirm('Clear all history?')) {
        history = [];
        localStorage.setItem('kalvium_history', JSON.stringify(history));
        renderHistory();
    }
}

// UI Actions
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kalvium_theme', theme);
    document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
    if (radarChart) {
        radarChart.options.scales.r.grid.color = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        radarChart.update();
    }
}

function resetAll() {
    if (confirm('Are you sure you want to reset all marks?')) {
        state = {};
        localStorage.removeItem('kalvium_state');
        renderSubjects();
        updateAll();
        showToast('All data reset.');
    }
}

function openFormulaModal() { document.getElementById('formula-modal').style.display = 'grid'; }
function closeFormulaModal() { document.getElementById('formula-modal').style.display = 'none'; }

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', init);
