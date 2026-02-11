# TaskMaster - Professional To-Do App

A modern, professional-grade To-Do application built with Node.js and Vanilla JavaScript.

## Features

- **Project Management**: Add, edit, delete, and complete tasks.
- **Task Details**: Set priorities (Low, Medium, High), due dates, and reminders.
- **Natural Language Input**: Type "Meeting Friday at 2pm" to auto-set dates.
- **Calendar Integration**: Export tasks to your default calendar app (.ics).
- **Strict Validation**: Tasks require a due date and time for better time management.
- **Persistence**: Tasks are saved locally (server-side JSON), so they persist across restarts.
- **Smart Reminders**: Get notified when a task is due (System Notifications & In-App Toasts).
- **Organization**: Sort tasks by Date, Priority, or Due Date. Filter by Active or Completed.
- **Visuals**: 
    - **Modern Aesthetics**: Vibrant gradients and Glassmorphism design.
    - **Dark Mode**: Deep Slate theme with auto-detection.
    - **Interactive Elements**: Hover effects, micro-animations, and confetti celebration.
    - **Progress Tracking**: Visual progress bar and encouraging messages.
- **Productivity**: 
    - **Smart Reminders**: Toggle reminders with visual indicators.
    - **Overdue Tracking**: Failed tasks are highlighted in red.
    - **Improved Inputs**: High-visibility date picker and explicit "Add Task" button.
    - **Keyboard Shortcuts**: 'Enter' to add, 'Esc' to cancel edits.

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML5, CSS3 (Variables, Flexbox), JavaScript (ES6+)
- **Data**: JSON file storage (`data/tasks.json`)
- **No External Database required**

## Setup & Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Server**:
    ```bash
    npm start
    ```
    Or for development with auto-restart (requires nodemon):
    ```bash
    npm run dev
    ```

3.  **Open in Browser**:
    Visit [http://localhost:3000](http://localhost:3000)

## Architecture

- **MVC-ish**: The frontend handles the View and Controller logic, while the backend acts as the Model/API layer.
- **Clean Code**: Modular functions, optimistic UI updates for perceived performance, and separated concerns.
