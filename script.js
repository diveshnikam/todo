const STORAGE_KEY = "nested_todo_app_data_v5";

const todoInput = document.getElementById("todoInput");
const addTodoButton = document.getElementById("addTodoButton");
const todoList = document.getElementById("todoList");
const errorMessage = document.getElementById("errorMessage");
const filterButtons = document.querySelectorAll(".filter-btn");
const topLevelDropZone = document.getElementById("topLevelDropZone");

let todos = loadTodos();
let currentFilter = getFilterFromHash();
let activeSubtaskParentId = null;
let subtaskErrorMessage = "";
let dragData = null;

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadTodos() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeParentTodo).map(syncParentCompletion);
  } catch (error) {
    return [];
  }
}

function normalizeParentTodo(todo) {
  return {
    id: todo?.id || createId(),
    text: String(todo?.text || ""),
    completed: Boolean(todo?.completed),
    children: Array.isArray(todo?.children)
      ? todo.children.map((child) => ({
          id: child?.id || createId(),
          text: String(child?.text || ""),
          completed: Boolean(child?.completed)
        }))
      : []
  };
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function persistAndRender() {
  saveTodos();
  renderApp();
}

function showMainError(message) {
  errorMessage.textContent = message;
}

function clearMainError() {
  errorMessage.textContent = "";
}

function getFilterFromHash() {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (hash === "all" || hash === "active" || hash === "completed") {
    return hash;
  }
  return "all";
}

function setFilter(filter) {
  window.location.hash = filter;
}

function updateFilterButtons() {
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === currentFilter);
  });
}

function matchesFilter(item, filter) {
  if (filter === "all") return true;
  if (filter === "active") return item.completed === false;
  if (filter === "completed") return item.completed === true;
  return true;
}

function syncParentCompletion(parent) {
  if (!parent.children) {
    return parent;
  }

  if (parent.children.length === 0) {
    return {
      ...parent,
      completed: false
    };
  }

  const allChildrenCompleted = parent.children.every((child) => child.completed);

  return {
    ...parent,
    completed: allChildrenCompleted
  };
}

function syncAllParents() {
  todos = todos.map((todo) => syncParentCompletion(todo));
}

function addTodo() {
  const text = todoInput.value.trim();

  if (text === "") {
    showMainError("Please enter a task before adding.");
    return;
  }

  todos.push({
    id: createId(),
    text,
    completed: false,
    children: []
  });

  todoInput.value = "";
  clearMainError();
  persistAndRender();
}

function toggleParent(parentId) {
  todos = todos.map((todo) => {
    if (todo.id !== parentId) return todo;

    const newCompletedState = !todo.completed;

    if (todo.children.length === 0) {
      return {
        ...todo,
        completed: newCompletedState
      };
    }

    return {
      ...todo,
      completed: newCompletedState,
      children: todo.children.map((child) => ({
        ...child,
        completed: newCompletedState
      }))
    };
  });

  persistAndRender();
}

function toggleChild(parentId, childId) {
  todos = todos.map((todo) => {
    if (todo.id !== parentId) return todo;

    const updatedChildren = todo.children.map((child) => {
      if (child.id !== childId) return child;
      return {
        ...child,
        completed: !child.completed
      };
    });

    return syncParentCompletion({
      ...todo,
      children: updatedChildren
    });
  });

  persistAndRender();
}

function deleteParent(parentId) {
  todos = todos.filter((todo) => todo.id !== parentId);

  if (activeSubtaskParentId === parentId) {
    activeSubtaskParentId = null;
    subtaskErrorMessage = "";
  }

  persistAndRender();
}

function deleteChild(parentId, childId) {
  todos = todos.map((todo) => {
    if (todo.id !== parentId) return todo;

    const updatedChildren = todo.children.filter((child) => child.id !== childId);

    return syncParentCompletion({
      ...todo,
      children: updatedChildren
    });
  });

  persistAndRender();
}

function openSubtaskInput(parentId) {
  activeSubtaskParentId = parentId;
  subtaskErrorMessage = "";
  renderApp();

  setTimeout(() => {
    const input = document.querySelector(`[data-subtask-input-for="${parentId}"]`);
    if (input) input.focus();
  }, 0);
}

function closeSubtaskInput() {
  activeSubtaskParentId = null;
  subtaskErrorMessage = "";
  renderApp();
}

function addSubtask(parentId, text) {
  todos = todos.map((todo) => {
    if (todo.id !== parentId) return todo;

    return syncParentCompletion({
      ...todo,
      children: [
        ...todo.children,
        {
          id: createId(),
          text,
          completed: false
        }
      ]
    });
  });

  activeSubtaskParentId = null;
  subtaskErrorMessage = "";
  persistAndRender();
}

function getParentIndex(parentId) {
  return todos.findIndex((todo) => todo.id === parentId);
}

function getChildIndex(parentId, childId) {
  const parent = todos.find((todo) => todo.id === parentId);
  if (!parent) return -1;
  return parent.children.findIndex((child) => child.id === childId);
}

function removeChildFromParent(parentId, childId) {
  let removedChild = null;

  todos = todos.map((todo) => {
    if (todo.id !== parentId) return todo;

    removedChild = todo.children.find((child) => child.id === childId) || null;

    return syncParentCompletion({
      ...todo,
      children: todo.children.filter((child) => child.id !== childId)
    });
  });

  return removedChild;
}

function insertChildIntoParent(parentId, child, insertIndex = null) {
  todos = todos.map((todo) => {
    if (todo.id !== parentId) return todo;

    const newChildren = [...todo.children];

    if (insertIndex === null || insertIndex < 0 || insertIndex > newChildren.length) {
      newChildren.push(child);
    } else {
      newChildren.splice(insertIndex, 0, child);
    }

    return syncParentCompletion({
      ...todo,
      children: newChildren
    });
  });
}

function getDropPosition(event, element) {
  const rect = element.getBoundingClientRect();
  const middleY = rect.top + rect.height / 2;
  return event.clientY < middleY ? "before" : "after";
}

function moveParentRelative(parentId, targetParentId, position = "before") {
  if (parentId === targetParentId) return;

  const fromIndex = getParentIndex(parentId);
  const toIndex = getParentIndex(targetParentId);

  if (fromIndex === -1 || toIndex === -1) return;

  const updated = [...todos];
  const [movedParent] = updated.splice(fromIndex, 1);

  let targetIndexAfterRemoval = updated.findIndex((todo) => todo.id === targetParentId);

  if (targetIndexAfterRemoval === -1) {
    updated.push(movedParent);
  } else {
    if (position === "after") {
      targetIndexAfterRemoval += 1;
    }
    updated.splice(targetIndexAfterRemoval, 0, movedParent);
  }

  todos = updated;
  persistAndRender();
}

function moveParentToEnd(parentId) {
  const fromIndex = getParentIndex(parentId);
  if (fromIndex === -1) return;

  const updated = [...todos];
  const [movedParent] = updated.splice(fromIndex, 1);
  updated.push(movedParent);
  todos = updated;
  persistAndRender();
}

function moveChildToParentEnd(sourceParentId, childId, targetParentId) {
  if (!sourceParentId || !childId || !targetParentId) return;

  const removedChild = removeChildFromParent(sourceParentId, childId);
  if (!removedChild) return;

  insertChildIntoParent(targetParentId, removedChild, null);
  syncAllParents();
  persistAndRender();
}

function moveChildRelative(sourceParentId, childId, targetParentId, targetChildId, position = "before") {
  if (!sourceParentId || !childId || !targetParentId || !targetChildId) return;
  if (sourceParentId === targetParentId && childId === targetChildId) return;

  const removedChild = removeChildFromParent(sourceParentId, childId);
  if (!removedChild) return;

  let targetIndex = getChildIndex(targetParentId, targetChildId);

  if (targetIndex === -1) {
    insertChildIntoParent(targetParentId, removedChild, null);
  } else {
    if (position === "after") {
      targetIndex += 1;
    }
    insertChildIntoParent(targetParentId, removedChild, targetIndex);
  }

  syncAllParents();
  persistAndRender();
}

function promoteChildToTopLevel(sourceParentId, childId) {
  const removedChild = removeChildFromParent(sourceParentId, childId);
  if (!removedChild) return;

  todos.push({
    id: removedChild.id,
    text: removedChild.text,
    completed: removedChild.completed,
    children: []
  });

  syncAllParents();
  persistAndRender();
}

function removeDragHighlights() {
  document.querySelectorAll(".drag-over").forEach((element) => {
    element.classList.remove("drag-over");
  });
}

function handleParentDragStart(event, parentId) {
  dragData = {
    type: "parent",
    parentId
  };

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", parentId);

  requestAnimationFrame(() => {
    event.currentTarget.classList.add("dragging");
  });
}

function handleChildDragStart(event, parentId, childId) {
  event.stopPropagation();

  dragData = {
    type: "child",
    parentId,
    childId
  };

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", childId);

  requestAnimationFrame(() => {
    event.currentTarget.classList.add("dragging");
  });
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  dragData = null;
  removeDragHighlights();
}

function createEmptyState() {
  const emptyDiv = document.createElement("div");
  emptyDiv.className = "empty-state";
  emptyDiv.textContent = "No tasks to show.";
  todoList.appendChild(emptyDiv);
}

function renderTodos() {
  todoList.innerHTML = "";

  const visibleTodos = [];

  todos.forEach((todo) => {
    const visibleChildren =
      currentFilter === "all"
        ? todo.children
        : todo.children.filter((child) => matchesFilter(child, currentFilter));

    const parentMatches = matchesFilter(todo, currentFilter);

    if (parentMatches || visibleChildren.length > 0) {
      visibleTodos.push({
        todo,
        visibleChildren
      });
    }
  });

  if (visibleTodos.length === 0) {
    createEmptyState();
    return;
  }

  visibleTodos.forEach(({ todo, visibleChildren }) => {
    const parentLi = document.createElement("li");
    parentLi.className = "todo-item";
    parentLi.draggable = true;

    parentLi.addEventListener("dragstart", (event) => {
      handleParentDragStart(event, todo.id);
    });

    parentLi.addEventListener("dragend", handleDragEnd);

    parentLi.addEventListener("dragover", (event) => {
      if (!dragData) return;

      if (dragData.type === "parent" && dragData.parentId !== todo.id) {
        event.preventDefault();
        parentLi.classList.add("drag-over");
      }

      if (dragData.type === "child") {
        event.preventDefault();
        parentLi.classList.add("drag-over");
      }
    });

    parentLi.addEventListener("dragleave", () => {
      parentLi.classList.remove("drag-over");
    });

    parentLi.addEventListener("drop", (event) => {
      event.preventDefault();
      parentLi.classList.remove("drag-over");

      if (!dragData) return;

      if (dragData.type === "parent") {
        const position = getDropPosition(event, parentLi);
        moveParentRelative(dragData.parentId, todo.id, position);
      } else if (dragData.type === "child") {
        moveChildToParentEnd(dragData.parentId, dragData.childId, todo.id);
      }

      dragData = null;
      removeDragHighlights();
    });

    const parentRow = document.createElement("div");
    parentRow.className = "todo-row";

    const leftDiv = document.createElement("div");
    leftDiv.className = "todo-left";

    const parentCheckbox = document.createElement("input");
    parentCheckbox.type = "checkbox";
    parentCheckbox.checked = todo.completed;
    parentCheckbox.addEventListener("change", () => {
      toggleParent(todo.id);
    });

    const parentText = document.createElement("span");
    parentText.className = "todo-text";
    parentText.textContent = todo.text;

    if (todo.completed) {
      parentText.classList.add("completed");
    }

    leftDiv.appendChild(parentCheckbox);
    leftDiv.appendChild(parentText);

    const actionDiv = document.createElement("div");
    actionDiv.className = "todo-actions";

    const addSubtaskBtn = document.createElement("button");
    addSubtaskBtn.className = "action-btn add-subtask-btn";
    addSubtaskBtn.textContent = "Add Subtask";
    addSubtaskBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openSubtaskInput(todo.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deleteParent(todo.id);
    });

    actionDiv.appendChild(addSubtaskBtn);
    actionDiv.appendChild(deleteBtn);

    parentRow.appendChild(leftDiv);
    parentRow.appendChild(actionDiv);
    parentLi.appendChild(parentRow);

    if (activeSubtaskParentId === todo.id) {
      const subtaskInputContainer = document.createElement("div");
      subtaskInputContainer.className = "subtask-input-container";

      const subtaskInputRow = document.createElement("div");
      subtaskInputRow.className = "subtask-input-row";

      const subtaskInput = document.createElement("input");
      subtaskInput.type = "text";
      subtaskInput.placeholder = "Add a subtask...";
      subtaskInput.className = "subtask-input";
      subtaskInput.setAttribute("data-subtask-input-for", todo.id);
      subtaskInput.autocomplete = "off";

      const subtaskAddBtn = document.createElement("button");
      subtaskAddBtn.className = "subtask-add-btn";
      subtaskAddBtn.textContent = "Add Task";

      const subtaskError = document.createElement("p");
      subtaskError.className = "error-message";
      subtaskError.textContent = subtaskErrorMessage;

      const handleSubtaskSubmit = () => {
        const text = subtaskInput.value.trim();

        if (text === "") {
          subtaskErrorMessage = "Please enter a subtask before adding.";
          subtaskError.textContent = subtaskErrorMessage;
          return;
        }

        addSubtask(todo.id, text);
      };

      subtaskInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          handleSubtaskSubmit();
        }
      });

      subtaskInput.addEventListener("input", () => {
        if (subtaskInput.value.trim() !== "") {
          subtaskErrorMessage = "";
          subtaskError.textContent = "";
        }
      });

      subtaskAddBtn.addEventListener("click", handleSubtaskSubmit);

      subtaskInputRow.appendChild(subtaskInput);
      subtaskInputRow.appendChild(subtaskAddBtn);
      subtaskInputContainer.appendChild(subtaskInputRow);
      subtaskInputContainer.appendChild(subtaskError);

      parentLi.appendChild(subtaskInputContainer);
    }

    if (visibleChildren.length > 0) {
      const childList = document.createElement("ul");
      childList.className = "subtask-list";

      visibleChildren.forEach((child) => {
        const childLi = document.createElement("li");
        childLi.className = "subtask-item";
        childLi.draggable = true;

        childLi.addEventListener("dragstart", (event) => {
          handleChildDragStart(event, todo.id, child.id);
        });

        childLi.addEventListener("dragend", handleDragEnd);

        childLi.addEventListener("dragover", (event) => {
          if (!dragData || dragData.type !== "child") return;
          if (dragData.parentId === todo.id && dragData.childId === child.id) return;

          event.preventDefault();
          event.stopPropagation();
          childLi.classList.add("drag-over");
        });

        childLi.addEventListener("dragleave", () => {
          childLi.classList.remove("drag-over");
        });

        childLi.addEventListener("drop", (event) => {
          event.preventDefault();
          event.stopPropagation();
          childLi.classList.remove("drag-over");

          if (!dragData || dragData.type !== "child") return;
          if (dragData.parentId === todo.id && dragData.childId === child.id) return;

          const position = getDropPosition(event, childLi);

          moveChildRelative(
            dragData.parentId,
            dragData.childId,
            todo.id,
            child.id,
            position
          );

          dragData = null;
          removeDragHighlights();
        });

        const childRow = document.createElement("div");
        childRow.className = "todo-row";

        const childLeftDiv = document.createElement("div");
        childLeftDiv.className = "todo-left";

        const childCheckbox = document.createElement("input");
        childCheckbox.type = "checkbox";
        childCheckbox.checked = child.completed;
        childCheckbox.addEventListener("change", () => {
          toggleChild(todo.id, child.id);
        });

        const childText = document.createElement("span");
        childText.className = "todo-text";
        childText.textContent = child.text;

        if (child.completed) {
          childText.classList.add("completed");
        }

        childLeftDiv.appendChild(childCheckbox);
        childLeftDiv.appendChild(childText);

        const childActions = document.createElement("div");
        childActions.className = "todo-actions";

        const childDeleteBtn = document.createElement("button");
        childDeleteBtn.className = "action-btn delete-btn";
        childDeleteBtn.textContent = "Delete";
        childDeleteBtn.addEventListener("click", () => {
          deleteChild(todo.id, child.id);
        });

        childActions.appendChild(childDeleteBtn);

        childRow.appendChild(childLeftDiv);
        childRow.appendChild(childActions);
        childLi.appendChild(childRow);

        childList.appendChild(childLi);
      });

      parentLi.appendChild(childList);
    }

    todoList.appendChild(parentLi);
  });
}

function renderApp() {
  currentFilter = getFilterFromHash();
  updateFilterButtons();
  renderTodos();
}

addTodoButton.addEventListener("click", addTodo);

todoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTodo();
  }
});

todoInput.addEventListener("input", () => {
  if (todoInput.value.trim() !== "") {
    clearMainError();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setFilter(button.dataset.filter);
  });
});

window.addEventListener("hashchange", () => {
  currentFilter = getFilterFromHash();
  renderApp();
});

document.addEventListener("click", (event) => {
  if (activeSubtaskParentId === null) return;

  const clickedInsideSubtaskInput = event.target.closest(".subtask-input-container");
  const clickedAddSubtaskButton = event.target.closest(".add-subtask-btn");

  if (clickedInsideSubtaskInput || clickedAddSubtaskButton) {
    return;
  }

  closeSubtaskInput();
});

todoList.addEventListener("dragover", (event) => {
  if (!dragData) return;

  if (dragData.type === "child" || dragData.type === "parent") {
    event.preventDefault();
  }
});

todoList.addEventListener("drop", (event) => {
  if (!dragData) return;

  const droppedOnParent = event.target.closest(".todo-item");
  const droppedOnChild = event.target.closest(".subtask-item");

  if (droppedOnParent || droppedOnChild) {
    return;
  }

  event.preventDefault();

  if (dragData.type === "child") {
    promoteChildToTopLevel(dragData.parentId, dragData.childId);
  } else if (dragData.type === "parent") {
    moveParentToEnd(dragData.parentId);
  }

  dragData = null;
  removeDragHighlights();
});

topLevelDropZone.addEventListener("dragover", (event) => {
  if (!dragData) return;

  if (dragData.type === "child" || dragData.type === "parent") {
    event.preventDefault();
    topLevelDropZone.classList.add("drag-over");
  }
});

topLevelDropZone.addEventListener("dragleave", () => {
  topLevelDropZone.classList.remove("drag-over");
});

topLevelDropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  topLevelDropZone.classList.remove("drag-over");

  if (!dragData) return;

  if (dragData.type === "child") {
    promoteChildToTopLevel(dragData.parentId, dragData.childId);
  } else if (dragData.type === "parent") {
    moveParentToEnd(dragData.parentId);
  }

  dragData = null;
  removeDragHighlights();
});

if (!window.location.hash) {
  history.replaceState(null, "", "#all");
}

renderApp();