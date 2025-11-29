// State Management
const state = {
    allQuestions: [], // Store all loaded questions
    questions: [], // Current set questions
    currentQuestionIndex: 0,
    currentSetIndex: 0,
    userAnswers: {}, // { questionId: { selectedIndex, isCorrect, timestamp } }
    stats: {
        totalAttempted: 0,
        correctCount: 0,
        wrongCount: 0,
        setStats: {} // { setIndex: { attempted, correct, wrong } }
    }
};

// DOM Elements
const elements = {
    views: {
        quiz: document.getElementById('quiz-view'),
        dashboard: document.getElementById('dashboard-view'),
        history: document.getElementById('history-view')
    },
    nav: {
        quiz: document.getElementById('btn-quiz'),
        dashboard: document.getElementById('btn-dashboard'),
        history: document.getElementById('btn-history')
    },
    quiz: {
        progress: document.getElementById('quiz-progress'),
        currentNum: document.getElementById('q-current'),
        totalNum: document.getElementById('q-total'),
        questionText: document.getElementById('question-text'),
        optionsContainer: document.getElementById('options-container'),
        explanationContainer: document.getElementById('explanation-container'),
        explanationText: document.getElementById('explanation-text'),
        visualAid: document.getElementById('visual-aid-container'),
        nextBtn: document.getElementById('btn-next'),
        prevBtn: document.getElementById('btn-prev')
    },
    dashboard: {
        total: document.getElementById('stat-total'),
        accuracy: document.getElementById('stat-accuracy'),
        correct: document.getElementById('stat-correct'),
        resetBtn: document.getElementById('btn-reset'),
        chartCanvas: document.getElementById('performance-chart'),
        setsGrid: document.getElementById('sets-grid')
    },
    history: {
        list: document.getElementById('history-list')
    }
};

// Charts
let explanationChart = null;
let performanceChart = null;
function updateDashboard() {
    const { totalAttempted, correctCount } = state.stats;
    const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

    elements.dashboard.total.textContent = totalAttempted;
    elements.dashboard.accuracy.textContent = `${accuracy}%`;
    elements.dashboard.correct.textContent = correctCount;
}

function renderPerformanceChart() {
    if (performanceChart) performanceChart.destroy();

    const ctx = elements.dashboard.chartCanvas.getContext('2d');
    performanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Wrong'],
            datasets: [{
                data: [state.stats.correctCount, state.stats.wrongCount],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#fff' } }
            }
        }
    });
}

function resetProgress() {
    if (confirm('Are you sure you want to reset all progress?')) {
        localStorage.removeItem('ir38_progress');
        localStorage.removeItem('ir38_answers');
        localStorage.removeItem('ir38_current_set');
        state.stats = {
            totalAttempted: 0,
            correctCount: 0,
            wrongCount: 0,
            setStats: {}
        };
        state.userAnswers = {};
        state.currentQuestionIndex = 0;
        state.currentSetIndex = 0;
        updateDashboard();
        renderPerformanceChart();
        selectSet(0);
        alert('Progress reset.');
    }
}

// History Logic
function renderHistory() {
    elements.history.list.innerHTML = '';
    const answers = Object.entries(state.userAnswers).sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));

    if (answers.length === 0) {
        elements.history.list.innerHTML = '<div class="empty-state" style="text-align:center; padding:2rem; color:#94a3b8;">No history yet.</div>';
        return;
    }

    answers.forEach(([qId, data]) => {
        const question = state.allQuestions.find(q => q.id == qId);
        if (!question) return;

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div>
                <div style="font-weight:600; margin-bottom:4px;">Q${qId}: ${question.question.substring(0, 50)}...</div>
                <div style="font-size:0.85rem; color:#94a3b8;">${new Date(data.timestamp).toLocaleDateString()}</div>
            </div>
            <div class="h-status ${data.isCorrect ? 'correct' : 'wrong'}">
                ${data.isCorrect ? 'Correct' : 'Wrong'}
            </div>
        `;
        elements.history.list.appendChild(item);
    });
}
