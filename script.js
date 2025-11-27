// State Management
const state = {
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {}, // { questionId: { selectedIndex, isCorrect, timestamp } }
    stats: {
        totalAttempted: 0,
        correctCount: 0,
        wrongCount: 0
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
        nextBtn: document.getElementById('btn-next')
    },
    dashboard: {
        total: document.getElementById('stat-total'),
        accuracy: document.getElementById('stat-accuracy'),
        correct: document.getElementById('stat-correct'),
        resetBtn: document.getElementById('btn-reset'),
        chartCanvas: document.getElementById('performance-chart')
    },
    history: {
        list: document.getElementById('history-list')
    }
};

// Charts
let explanationChart = null;
let performanceChart = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    loadProgress();
    await loadQuestions();
    setupEventListeners();
    updateDashboard();
    renderHistory();

    // Resume or start
    if (state.questions.length > 0) {
        loadQuestion(state.currentQuestionIndex);
    }
});

// Load Data
async function loadQuestions() {
    try {
        const response = await fetch('data/questions.json');
        state.questions = await response.json();
        elements.quiz.totalNum.textContent = state.questions.length;
    } catch (error) {
        console.error('Failed to load questions:', error);
        elements.quiz.questionText.textContent = "Error loading questions. Please try refreshing.";
    }
}

// Persistence
function loadProgress() {
    const savedProgress = localStorage.getItem('ir38_progress');
    const savedAnswers = localStorage.getItem('ir38_answers');

    if (savedProgress) {
        state.stats = JSON.parse(savedProgress);
    }

    if (savedAnswers) {
        state.userAnswers = JSON.parse(savedAnswers);
        // Find first unanswered question
        // This logic can be improved to actually find the first missing ID
    }
}

function saveProgress() {
    localStorage.setItem('ir38_progress', JSON.stringify(state.stats));
    localStorage.setItem('ir38_answers', JSON.stringify(state.userAnswers));
}

// Navigation
function switchView(viewName) {
    // Hide all views
    Object.values(elements.views).forEach(el => el.classList.remove('active', 'hidden'));
    Object.values(elements.views).forEach(el => el.classList.add('hidden'));

    // Show selected
    elements.views[viewName].classList.remove('hidden');
    elements.views[viewName].classList.add('active');

    // Update Nav
    Object.values(elements.nav).forEach(el => el.classList.remove('active'));
    elements.nav[viewName].classList.add('active');

    if (viewName === 'dashboard') {
        updateDashboard();
        renderPerformanceChart();
    } else if (viewName === 'history') {
        renderHistory();
    }
}

function setupEventListeners() {
    elements.nav.quiz.addEventListener('click', () => switchView('quiz'));
    elements.nav.dashboard.addEventListener('click', () => switchView('dashboard'));
    elements.nav.history.addEventListener('click', () => switchView('history'));

    elements.quiz.nextBtn.addEventListener('click', nextQuestion);
    elements.dashboard.resetBtn.addEventListener('click', resetProgress);
}

// Quiz Logic
function loadQuestion(index) {
    if (index >= state.questions.length) {
        // Quiz finished loop or show completion
        index = 0; // Loop for study mode
    }

    state.currentQuestionIndex = index;
    const question = state.questions[index];

    // Update UI
    elements.quiz.currentNum.textContent = index + 1;
    elements.quiz.questionText.textContent = question.question;
    elements.quiz.progress.style.width = `${((index + 1) / state.questions.length) * 100}%`;

    // Reset state for new question
    elements.quiz.explanationContainer.classList.add('hidden');
    elements.quiz.optionsContainer.innerHTML = '';

    // Check if already answered
    const previousAnswer = state.userAnswers[question.id];

    question.options.forEach((opt, i) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.innerHTML = `
            <div class="option-marker">${String.fromCharCode(65 + i)}</div>
            <span>${opt}</span>
        `;

        if (previousAnswer) {
            if (i === question.correctIndex) btn.classList.add('correct');
            if (i === previousAnswer.selectedIndex && i !== question.correctIndex) btn.classList.add('wrong');
            btn.classList.add('disabled');
        } else {
            btn.addEventListener('click', () => handleAnswer(i, question));
        }

        elements.quiz.optionsContainer.appendChild(btn);
    });

    if (previousAnswer) {
        showExplanation(question);
    }
}

function handleAnswer(selectedIndex, question) {
    // Prevent multiple answers
    if (state.userAnswers[question.id]) return;

    const isCorrect = selectedIndex === question.correctIndex;

    // Update Stats
    state.stats.totalAttempted++;
    if (isCorrect) state.stats.correctCount++;
    else state.stats.wrongCount++;

    // Save Answer
    state.userAnswers[question.id] = {
        selectedIndex,
        isCorrect,
        timestamp: new Date().toISOString()
    };

    saveProgress();

    // Update UI
    const buttons = elements.quiz.optionsContainer.children;
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.add('disabled');
        if (i === question.correctIndex) buttons[i].classList.add('correct');
        if (i === selectedIndex && !isCorrect) buttons[i].classList.add('wrong');
    }

    showExplanation(question);
}

function showExplanation(question) {
    elements.quiz.explanationContainer.classList.remove('hidden');
    elements.quiz.explanationText.textContent = question.explanation;

    // Destroy previous chart if exists
    if (explanationChart) {
        explanationChart.destroy();
        explanationChart = null;
    }

    const canvas = document.getElementById('explanation-chart');

    if (question.chartData) {
        canvas.style.display = 'block';
        const ctx = canvas.getContext('2d');
        explanationChart = new Chart(ctx, {
            type: question.chartData.type || 'bar',
            data: {
                labels: question.chartData.labels,
                datasets: [{
                    label: question.chartData.label,
                    data: question.chartData.data,
                    backgroundColor: ['rgba(99, 102, 241, 0.5)', 'rgba(236, 72, 153, 0.5)'],
                    borderColor: ['#6366f1', '#ec4899'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                },
                scales: {
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                }
            }
        });
    } else {
        canvas.style.display = 'none';
    }
}

function nextQuestion() {
    let nextIndex = state.currentQuestionIndex + 1;
    loadQuestion(nextIndex);
}

// Dashboard Logic
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
        state.stats = { totalAttempted: 0, correctCount: 0, wrongCount: 0 };
        state.userAnswers = {};
        state.currentQuestionIndex = 0;
        updateDashboard();
        renderPerformanceChart();
        loadQuestion(0);
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
        const question = state.questions.find(q => q.id == qId);
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
