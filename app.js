// Configuration and Subject Data
const SUBJECTS = [
    { id: 'bocs', name: 'BOCS', credits: 4, type: 'bocs' },
    { id: 'bewd', name: 'BEWD', credits: 5, type: 'bewd_dbms' },
    { id: 'dbms', name: 'DBMS', credits: 3, type: 'bewd_dbms' },
    { id: 'mern', name: 'MERN', credits: 4, type: 'mern' },
    { id: 'lthtl', name: 'LTHTL', credits: 4, type: 'lthtl' }
];

let marksChart = null;

// Initialize the application
function init() {
    renderTable();
    updateCalculations();
    initChart();
}

// Render the subjects table rows
function renderTable() {
    const tbody = document.getElementById('subjects-body');
    tbody.innerHTML = SUBJECTS.map(s => `
        <tr id="row-${s.id}">
            <td title="${s.name}"><strong>${s.id.toUpperCase()}</strong></td>
            <td>
                <div class="ca-inputs">
                    <input type="number" class="ca" data-subj="${s.id}" data-idx="0" placeholder="B" min="0" max="40" oninput="updateCalculations()">
                    <input type="number" class="ca" data-subj="${s.id}" data-idx="1" placeholder="C" min="0" max="40" oninput="updateCalculations()">
                    <input type="number" class="ca" data-subj="${s.id}" data-idx="2" placeholder="D" min="0" max="40" oninput="updateCalculations()">
                </div>
            </td>
            <td>
                <div class="ca-inputs">
                    <input type="number" class="ca" data-subj="${s.id}" data-idx="3" placeholder="E" min="0" max="60" oninput="updateCalculations()">
                    <input type="number" class="ca" data-subj="${s.id}" data-idx="4" placeholder="F" min="0" max="60" oninput="updateCalculations()">
                </div>
            </td>
            <td>
                <input type="number" class="att-pct" data-subj="${s.id}" placeholder="%" min="0" max="100" oninput="updateCalculations()">
            </td>
            <td id="att-marks-${s.id}" class="calculated">0</td>
            <td class="calculated">${s.credits}</td>
            <td id="total-${s.id}" class="calculated">0.00</td>
            <td id="points-${s.id}" class="calculated">0</td>
            <td><span id="grade-${s.id}" class="grade-badge">—</span></td>
        </tr>
    `).join('');
}

// Attendance marks logic (G section)
function calculateAttendanceMarks(pct) {
    if (pct >= 90) return 5;
    if (pct >= 85) return 4;
    if (pct >= 80) return 3;
    if (pct >= 75) return 2;
    return 0;
}

// Grade to Points mapping logic
function getGradePointsAndLabel(total) {
    const ix = parseFloat(total) || 0;
    if (ix <= 30) return { points: 0, label: 'F' };
    
    // Formula: Jx = INT((Ix-1)/10)+1
    const points = Math.floor((ix - 1) / 10) + 1;
    
    const labels = {
        10: 'O',
        9: 'A+',
        8: 'A',
        7: 'B+',
        6: 'B',
        5: 'C',
        4: 'D'
    };
    
    return { 
        points: Math.max(0, points), 
        label: labels[points] || (points < 4 ? 'F' : '—')
    };
}

// Subject-specific formula implementations (I section)
function calculateTotalMarks(subj, cas, g) {
    const b = cas[0] || 0, c = cas[1] || 0, d = cas[2] || 0, e = cas[3] || 0, f = cas[4] || 0;
    let raw = 0;

    switch (subj.type) {
        case 'bocs':
            // i2 = ROUND(((19/40)(SUM(B2:D2))+(19/60)(SUM(E2:F2))+G2),2)
            raw = ((19/40)*(b + c + d) + (19/60)*(e + f) + g);
            break;
        case 'bewd_dbms':
            // i3 = ROUND(((95/3)*(B3/40 + MAX(C3,D3)/40 + MAX(E3,F3)/60) + G3),2)
            raw = ((95/3)*(b/40 + Math.max(c, d)/40 + Math.max(e, f)/60) + g);
            break;
        case 'mern':
            // i5 = ROUND(((95/4)*(B5/40 + C5/40 + D5/40 + MAX(E5,F5)/60) + G5),2)
            raw = ((95/4)*(b/40 + c/40 + d/40 + Math.max(e, f)/60) + g);
            break;
        case 'lthtl':
            // i6 = ROUND(((19/40)(SUM(B6:D6))+(19/60)(E6+F6)+G6),2)
            raw = ((19/40)*(b + c + d) + (19/60)*(e + f) + g);
            break;
    }
    return Math.min(100, Math.round(raw * 100) / 100);
}

// Main calculation engine
function updateCalculations() {
    let totalWeightedPoints = 0;
    const chartData = [];

    SUBJECTS.forEach(s => {
        const row = document.getElementById(`row-${s.id}`);
        const caInputs = Array.from(row.querySelectorAll('.ca')).map(i => parseFloat(i.value) || 0);
        const attPct = parseFloat(row.querySelector('.att-pct').value) || 0;

        const g = calculateAttendanceMarks(attPct);
        const total = calculateTotalMarks(s, caInputs, g);
        const { points, label } = getGradePointsAndLabel(total);

        // Update UI
        document.getElementById(`att-marks-${s.id}`).textContent = g;
        document.getElementById(`total-${s.id}`).textContent = total.toFixed(2);
        document.getElementById(`points-${s.id}`).textContent = points;
        
        const gradeEl = document.getElementById(`grade-${s.id}`);
        gradeEl.textContent = label;
        gradeEl.style.background = label === 'F' ? '#fee2e2' : '#f1f5f9';
        gradeEl.style.color = label === 'F' ? '#ef4444' : '#475569';

        totalWeightedPoints += (points * s.credits);
        chartData.push(total);
    });

    // CGPA = ROUND(SUM(Ji*Hi)/20, 2)
    const cgpa = Math.round((totalWeightedPoints / 20) * 100) / 100;
    document.getElementById('cgpa-value').textContent = cgpa.toFixed(2);

    updateChart(chartData);
}

// Visualization with Chart.js
function initChart() {
    const ctx = document.getElementById('marksChart').getContext('2d');
    marksChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: SUBJECTS.map(s => s.id.toUpperCase()),
            datasets: [{
                label: 'Total Marks (Ix)',
                data: [0, 0, 0, 0, 0],
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100 }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChart(data) {
    if (marksChart) {
        marksChart.data.datasets[0].data = data;
        marksChart.update('none');
    }
}

document.addEventListener('DOMContentLoaded', init);
