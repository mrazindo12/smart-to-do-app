const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Helper to read tasks
const readTasks = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading tasks:", err);
        return [];
    }
};

// Helper to write tasks
const writeTasks = (tasks) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
    } catch (err) {
        console.error("Error writing tasks:", err);
    }
};

// GET /api/tasks
app.get('/api/tasks', (req, res) => {
    const tasks = readTasks();
    res.json(tasks);
});

// POST /api/tasks
app.post('/api/tasks', (req, res) => {
    const tasks = readTasks();
    // V2: Strict Validation
    if (!req.body.title || !req.body.dueAt) {
        return res.status(400).json({ message: 'Title and Due Date/Time are required.' });
    }

    const newTask = {
        id: crypto.randomUUID(),
        ...req.body,
        createdAt: new Date().toISOString()
    };

    // Check if ID is provided (e.g. from frontend optimistic UI)
    if (req.body.id) {
        newTask.id = req.body.id;
    } else {
        // Fallback ID generation
        newTask.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    tasks.push(newTask);
    writeTasks(tasks);
    res.status(201).json(newTask);
});

// PUT /api/tasks/:id
app.put('/api/tasks/:id', (req, res) => {
    const tasks = readTasks();
    const taskIndex = tasks.findIndex(t => t.id === req.params.id);

    if (taskIndex > -1) {
        // V2 Strict Validation for Updates if dueAt/title are being changed to empty? 
        // Spec says "Block task creation", but for edits it implies similar constraints.
        // Let's ensure if they update, they can't remove dueAt.
        if (req.body.dueAt === "" || req.body.dueAt === null) {
            return res.status(400).json({ message: 'Task must have a due date/time.' });
        }

        tasks[taskIndex] = { ...tasks[taskIndex], ...req.body };
        writeTasks(tasks);
        res.json(tasks[taskIndex]);
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req, res) => {
    let tasks = readTasks();
    const newTasks = tasks.filter(t => t.id !== req.params.id);

    if (tasks.length !== newTasks.length) {
        writeTasks(newTasks);
        res.json({ message: 'Task deleted' });
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
