# Nested Todo App

A responsive single-page Todo application built with **HTML, CSS, and Vanilla JavaScript**.  
This app supports **1-level nested subtasks**, **drag-and-drop reordering**, **filtering by status**, and **localStorage persistence**.

## Live Demo
https://todo-ten-zeta-91.vercel.app/#all


## Features

- Add top-level todos
- Add subtasks under parent tasks
- 1-level nested structure for clear hierarchy
- Mark tasks and subtasks as completed
- Delete parent tasks or individual subtasks
- Drag and drop parent tasks to reorder them
- Drag and drop subtasks:
  - reorder within the same parent
  - move to a different parent
  - promote to top-level
- Filter tasks using:
  - All
  - Active
  - Completed
- URL hash-based routing:
  - `#all`
  - `#active`
  - `#completed`
- Automatically saves all changes in `localStorage`
- Responsive design for desktop and mobile

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- HTML5 Drag and Drop API
- localStorage

## How It Works

This project is a nested todo manager where each top-level task can contain subtasks.  
The application keeps the interface simple while supporting useful task management behaviors such as completion tracking, filtering, and drag-and-drop task movement.

### Task behavior
- Users can create a new top-level task from the main input
- Each parent task has an **Add Subtask** action
- Subtasks are displayed visually indented under their parent
- Deleting a parent task removes the parent and all of its subtasks
- Deleting a subtask removes only that subtask

### Completion logic
- A subtask can be marked complete independently
- Parent task completion is synchronized with child completion
- If all subtasks are completed, the parent is shown as completed
- Toggling a parent task can also update all of its subtasks

### Drag and drop behavior
- Dragging a parent task moves it along with its subtasks
- Dragging a subtask allows it to:
  - move under another parent
  - reorder relative to another subtask
  - become a top-level task by dropping it in the root drop area

### Filtering
The app supports three views:
- **All**: shows every task
- **Active**: shows incomplete tasks
- **Completed**: shows completed tasks

The selected view is synced with the browser URL hash for a cleaner user experience and direct navigation.

### Persistence
All task data is stored in browser `localStorage`, so tasks remain available after refresh.

## Project Structure

```bash
nested-todo-app/
│
├── index.html
├── style.css
├── script.js
└── README.md
