/**
 * TaskMaster - Professional To-Do App
 * Main Application Logic
 */

// --- State Management ---
const state = {
    tasks: [],
    filter: 'all', // all, active, completed
    sortBy: 'createdAt-desc', // createdAt-desc, createdAt-asc, priority-desc, dueDate-asc
    darkMode: localStorage.getItem('theme') === 'dark'
};

// --- DOM Elements ---
const elements = {
    taskList: document.getElementById('task-list'),
    taskInput: document.getElementById('task-input'),
    priorityInput: document.getElementById('priority-input'),
    dueDateInput: document.getElementById('due-date-input'),
    addBtn: document.getElementById('add-btn'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    sortSelect: document.getElementById('sort-by'),
    themeToggle: document.getElementById('theme-toggle'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
    progressBar: document.getElementById('progress-bar'),
    progressStats: document.getElementById('progress-stats'),
    progressMessage: document.getElementById('progress-message'),
    clearCompletedBtn: document.getElementById('clear-completed'),
    toastContainer: document.getElementById('toast-container'),
    confettiCanvas: document.getElementById('confetti-canvas'),
    nlpPreview: document.getElementById('nlp-preview')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    fetchTasks();
    setupEventListeners();
    requestNotificationPermission();
    setInterval(checkReminders, 60000); // Check every minute
});

// --- API Interactions ---
const API_URL = 'http://localhost:3000/api/tasks';

async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        state.tasks = tasks;
        renderTasks();
        updateProgress();
    } catch (error) {
        showToast('Error loading tasks', 'error');
        console.error(error);
    }
}

async function createTask(task) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create task');
        }

        const newTask = await response.json();
        state.tasks.push(newTask);
        renderTasks();
        updateProgress();
        return newTask;
    } catch (error) {
        showToast(error.message, 'error');
        console.error(error);
    }
}

async function updateTask(id, updates) {
    // Optimistic Update
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    const originalTask = { ...state.tasks[taskIndex] };

    if (taskIndex > -1) {
        state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updates };
        renderTasks(); // Re-render to reflect changes immediately
        updateProgress();
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Failed to update');

        // If completing, trigger confetti
        if (updates.completed && updates.completed === true && !originalTask.completed) {
            triggerConfetti();
        }

    } catch (error) {
        // Revert on error
        state.tasks[taskIndex] = originalTask;
        renderTasks();
        updateProgress();
        showToast('Error updating task', 'error');
    }
}

async function deleteTask(id) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    const taskToDelete = state.tasks[taskIndex];

    // Optimistic Remove
    state.tasks.splice(taskIndex, 1);
    renderTasks();
    updateProgress();

    // Show Undo Toast
    showToast('Task deleted', 'info', {
        actionText: 'Undo',
        onAction: () => {
            // Re-create task if Undo clicked
            createTask(taskToDelete);
        }
    });

    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Delete failed', error);
    }
}

// --- Rendering ---
function renderTasks() {
    const filteredTasks = filterTasks(state.tasks);
    const sortedTasks = sortTasks(filteredTasks);

    elements.taskList.innerHTML = '';

    if (sortedTasks.length === 0) {
        let msg = 'No tasks found. Add one!';
        if (state.filter === 'completed') msg = 'No completed tasks yet.';
        if (state.filter === 'failed') msg = 'No failed tasks! Great job keeping up!';

        elements.taskList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                <p>${msg}</p>
            </div>
        `;
        return;
    }

    const template = document.getElementById('task-template');
    const now = new Date();

    sortedTasks.forEach(task => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.task-item');
        const checkbox = clone.querySelector('.task-checkbox');
        const title = clone.querySelector('.task-title');
        const priority = clone.querySelector('.task-priority');
        const dueDate = clone.querySelector('.task-due-date');
        const dateText = clone.querySelector('.date-text');
        const deleteBtn = clone.querySelector('.delete-btn');
        const reminderBtn = clone.querySelector('.reminder-btn');

        // Check Overdue Status
        const dateStr = task.dueAt || task.dueDate;
        let isFailed = false;
        if (dateStr && !task.completed && new Date(dateStr) < now) {
            isFailed = true;
            item.classList.add('failed');
        }

        // V2: Calendar Button
        const actionsDiv = clone.querySelector('.task-actions');
        const calendarBtn = document.createElement('button');
        calendarBtn.className = 'icon-btn calendar-btn';
        calendarBtn.title = 'Add to Calendar';
        calendarBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path><path d="M12 2v10"></path></svg>';
        calendarBtn.addEventListener('click', () => exportToCalendar(task));
        actionsDiv.insertBefore(calendarBtn, deleteBtn);

        item.dataset.id = task.id;
        if (task.completed) item.classList.add('completed');

        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => {
            updateTask(task.id, { completed: checkbox.checked });
        });

        title.textContent = task.title;
        title.addEventListener('blur', () => {
            const newTitle = title.textContent.trim();
            if (newTitle && newTitle !== task.title) {
                updateTask(task.id, { title: newTitle });
            } else if (!newTitle) {
                title.textContent = task.title; // Revert if empty
            }
        });
        title.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                title.blur();
            }
        });

        priority.textContent = isFailed ? 'Overdue' : task.priority;
        priority.classList.add(task.priority);
        if (isFailed) priority.style.backgroundColor = 'var(--danger-color)';
        if (isFailed) priority.style.color = 'white';


        if (dateStr) {
            const date = new Date(dateStr);
            dateText.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // Should not happen with strict validation, but good safety
            dateText.textContent = "No Date";
        }

        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        // Reminder Logic (Toggle)
        const hasReminder = task.reminderAt && new Date(task.reminderAt) > new Date();

        if (hasReminder) {
            reminderBtn.classList.add('active');
            // Optional: Fill the icon for better visibility
            reminderBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>';
        } else {
            reminderBtn.classList.remove('active');
            reminderBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>';
        }

        reminderBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent row click issues if any
            const dateStr = task.dueAt || task.dueDate;

            if (!dateStr) {
                showToast('Set a due date first to add a reminder.', 'error');
                return;
            }

            if (hasReminder) {
                // Turn OFF
                updateTask(task.id, { reminderAt: null });
                showToast('Reminder removed.', 'info');
            } else {
                // Turn ON
                const remTime = new Date(dateStr).getTime() - 15 * 60000; // 15 mins before
                if (remTime < new Date().getTime()) {
                    showToast('Task is already due or in the past!', 'warning');
                    return;
                }
                updateTask(task.id, { reminderAt: new Date(remTime).toISOString() });
                showToast('Reminder set for 15 mins before due.', 'success');
            }
        });

        elements.taskList.appendChild(clone);
    });
}

function filterTasks(tasks) {
    if (state.filter === 'active') return tasks.filter(t => !t.completed);
    if (state.filter === 'completed') return tasks.filter(t => t.completed);
    if (state.filter === 'failed') {
        const now = new Date();
        return tasks.filter(t => !t.completed && (t.dueAt || t.dueDate) && new Date(t.dueAt || t.dueDate) < now);
    }
    return tasks;
}

function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        const dateA = a.dueAt || a.dueDate || 0;
        const dateB = b.dueAt || b.dueDate || 0;

        if (state.sortBy === 'createdAt-desc') return new Date(b.createdAt) - new Date(a.createdAt);
        if (state.sortBy === 'createdAt-asc') return new Date(a.createdAt) - new Date(b.createdAt);
        if (state.sortBy === 'priority-desc') {
            const map = { high: 3, medium: 2, low: 1 };
            return map[b.priority] - map[a.priority];
        }
        if (state.sortBy === 'dueDate-asc') {
            return new Date(dateA) - new Date(dateB);
        }
        return 0;
    });
}

function updateProgress() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    elements.progressBar.style.width = `${percent}%`;
    elements.progressStats.textContent = `${completed}/${total}`;

    const messages = [
        "Let's get to work!",
        "Good start!",
        "Keep it up!",
        "Almost there!",
        "You're a productivity machine!"
    ];
    // Simple logic for message
    let msgIndex = 0;
    if (percent > 0) msgIndex = 1;
    if (percent > 30) msgIndex = 2;
    if (percent > 70) msgIndex = 3;
    if (percent === 100) msgIndex = 4;

    if (total === 0) msgIndex = 0;

    elements.progressMessage.textContent = messages[msgIndex];
}

// --- Event Listeners ---
function setupEventListeners() {
    elements.addBtn.addEventListener('click', handleAddTask);
    elements.taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddTask();
    });

    // V2: NLP Input Listener
    let debounceTimer;
    elements.taskInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            handleNLP(e.target.value);
        }, 500);
    });

    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.filter;
            renderTasks();
        });
    });

    elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderTasks();
    });

    elements.themeToggle.addEventListener('click', toggleTheme);

    elements.clearCompletedBtn.addEventListener('click', () => {
        const completedTasks = state.tasks.filter(t => t.completed);
        completedTasks.forEach(t => deleteTask(t.id));
    });
}

// --- V2: NLP Logic ---
function handleNLP(text) {
    if (!window.chrono || !text) {
        elements.nlpPreview.style.display = 'none';
        return;
    }

    const results = window.chrono.parse(text);
    if (results.length > 0) {
        const result = results[0];
        const date = result.start.date();

        // Feedback UI
        elements.nlpPreview.style.display = 'flex';
        elements.nlpPreview.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path><path d="M12 2v10"></path></svg>
            <span>Detected: ${date.toLocaleString()}</span>
        `;

        // Auto-fill (Visual only, user can override)
        // Adjust for timezone offset for input[type="datetime-local"]
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
        elements.dueDateInput.value = localISOTime;
    } else {
        elements.nlpPreview.style.display = 'none';
    }
}

// --- V2: Strict Validation & Creation ---
function handleAddTask() {
    const title = elements.taskInput.value.trim();
    const dueAt = elements.dueDateInput.value;

    // Reset errors
    elements.dueDateInput.classList.remove('input-error');
    elements.taskInput.classList.remove('input-error');

    // Validation
    if (!title) {
        elements.taskInput.classList.add('input-error');
        elements.taskInput.focus();
        showToast('Please enter a task title.', 'error');
        return;
    }

    if (!dueAt) {
        elements.dueDateInput.classList.add('input-error');
        elements.dueDateInput.focus();
        showToast('Please set a due date and time.', 'error');
        return;
    }

    // Extract title without the date text if NLP was used? 
    // For V2 simple, we keep the original text or we could strip it. 
    // Spec says "Parse and extract... Display parsed values...". 
    // Let's assume user accepts the extraction in the fields.

    // We can allow the user to clean up the title if they want, 
    // but typically NLP tasks remove the date string.
    // Let's try to remove the matched text if chrono found it.
    let finalTitle = title;
    if (window.chrono) {
        const results = window.chrono.parse(title);
        if (results.length > 0) {
            // Remove the text that matched the date
            // Simple approach: string replacement (risky if duplicates)
            // Better: strip based on index, but keep it simple.
            // Actually, for this iteration, let's keep the full text so context isn't lost
            // unless user manually deletes it.
        }
    }

    const task = {
        title: finalTitle,
        priority: elements.priorityInput.value,
        dueAt: dueAt, // V2 field
        completed: false,
        nlpSourceText: title // V2 field
    };

    createTask(task).then(() => {
        elements.taskInput.value = '';
        elements.dueDateInput.value = '';
        elements.nlpPreview.style.display = 'none';
    });
}

// --- V2: Calendar Export ---
function exportToCalendar(task) {
    if (!task.dueAt && !task.dueDate) {
        showToast('No due date to export.', 'error');
        return;
    }

    const startDate = new Date(task.dueAt || task.dueDate);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration default

    const formatDate = (date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TaskMaster//ToDo App//EN',
        'BEGIN:VEVENT',
        `UID:${task.id}@taskmaster.app`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${task.title}`,
        `DESCRIPTION:Priority: ${task.priority}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${task.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Event exported! Check your downloads.', 'success');
}

// --- Theme ---
function toggleTheme() {
    state.darkMode = !state.darkMode;
    localStorage.setItem('theme', state.darkMode ? 'dark' : 'light');
    applyTheme();
}

function applyTheme() {
    if (state.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        elements.moonIcon.style.display = 'block';
        elements.sunIcon.style.display = 'none';
    } else {
        document.documentElement.removeAttribute('data-theme');
        elements.moonIcon.style.display = 'none';
        elements.sunIcon.style.display = 'block';
    }
}

// --- Notifications & Reminders ---
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

function checkReminders() {
    const now = new Date().getTime();
    state.tasks.forEach(task => {
        if (!task.completed && task.reminderAt) {
            const reminderTime = new Date(task.reminderAt).getTime();
            // Check if reminder is due (within last minute or just passed)
            // To avoid double triggers, we could check a 'reminded' flag or close proximity
            if (reminderTime <= now && reminderTime > now - 60000) {
                triggerNotification(task);
            }
        }
    });
}

function triggerNotification(task) {
    // System Notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Reminder: ${task.title}`, {
            body: `Due: ${new Date(task.dueAt || task.dueDate).toLocaleString()}`,
        });
    }

    // In-App Toast
    showToast(`Reminder: ${task.title}`, 'info');

    // Visual cue
    const taskEl = document.querySelector(`.task-item[data-id="${task.id}"]`);
    if (taskEl) {
        taskEl.style.animation = 'pulse 2s infinite';
        setTimeout(() => taskEl.style.animation = '', 6000);
    }
}

// --- Toast System ---
function showToast(message, type = 'info', options = {}) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    if (options.actionText && options.onAction) {
        const actionBtn = document.createElement('button');
        actionBtn.textContent = options.actionText;
        actionBtn.onclick = () => {
            options.onAction();
            toast.remove();
        };
        toast.appendChild(actionBtn);
    }

    elements.toastContainer.appendChild(toast);

    // Auto remove
    const timeout = options.duration || 5000;
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, timeout);
}

// Basic Confetti implementation
function triggerConfetti() {
    const canvas = elements.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    const particleCount = 100;
    const colors = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6'];

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            r: Math.random() * 4 + 2, // radius
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10 - 5, // initial upward burst
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngle: 0,
            tiltAngleIncremental: (Math.random() * 0.07) + 0.05
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let remainingParticles = false;

        particles.forEach((p, i) => {
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2; // Gravity
            p.x += Math.sin(p.tiltAngle) * 2;
            p.tilt = Math.sin(p.tiltAngle) * 15;

            // Apply velocity
            p.x += p.dx;
            p.y += p.dy;

            // Friction
            p.dx *= 0.95;
            p.dy *= 0.95;
            // Gravity addition
            p.dy += 0.2;

            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + (p.r / 2), p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.r / 2));
            ctx.stroke();

            if (p.y < window.innerHeight) {
                remainingParticles = true;
            }
        });

        if (remainingParticles) {
            requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    draw();
}

// Handle resize for confetti
window.addEventListener('resize', () => {
    elements.confettiCanvas.width = window.innerWidth;
    elements.confettiCanvas.height = window.innerHeight;
});
