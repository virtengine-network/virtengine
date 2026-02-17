/* ─────────────────────────────────────────────────────────────
 *  Kanban Board Component — drag-and-drop task board
 * ────────────────────────────────────────────────────────────── */
import { h } from "preact";
import { useState, useCallback } from "preact/hooks";
import htm from "htm";
import { signal, computed } from "@preact/signals";
import { tasksData, tasksLoaded, showToast, runOptimistic } from "../modules/state.js";
import { apiFetch } from "../modules/api.js";
import { haptic } from "../modules/telegram.js";
import { formatRelative, truncate, cloneValue } from "../modules/utils.js";

const html = htm.bind(h);

/* ─── Column definitions ─── */
const COLUMN_MAP = {
  backlog: ["backlog", "open", "new", "todo"],
  inProgress: ["in-progress", "inprogress", "working", "active", "assigned"],
  inReview: ["in-review", "inreview", "review", "pr-open", "pr-review"],
  done: ["done", "completed", "closed", "merged", "cancelled"],
};

const COLUMNS = [
  { id: "backlog", title: "Backlog", icon: "\u{1F4CB}", color: "var(--text-secondary)" },
  { id: "inProgress", title: "In Progress", icon: "\u{1F528}", color: "var(--color-inprogress, #3b82f6)" },
  { id: "inReview", title: "In Review", icon: "\u{1F440}", color: "var(--color-inreview, #f59e0b)" },
  { id: "done", title: "Done", icon: "\u2705", color: "var(--color-done, #22c55e)" },
];

// Map column ID → canonical status for API updates
const COLUMN_TO_STATUS = {
  backlog: "todo",
  inProgress: "inprogress",
  inReview: "inreview",
  done: "done",
};

const PRIORITY_COLORS = {
  critical: "var(--color-critical, #dc2626)",
  high: "var(--color-high, #f59e0b)",
  medium: "var(--color-medium, #3b82f6)",
  low: "var(--color-low, #8b95a2)",
};

function getColumnForStatus(status) {
  const s = (status || "").toLowerCase();
  for (const [col, statuses] of Object.entries(COLUMN_MAP)) {
    if (statuses.includes(s)) return col;
  }
  return "backlog";
}

/* ─── Derived column data ─── */
const columnData = computed(() => {
  const tasks = tasksData.value || [];
  const cols = {};
  for (const col of COLUMNS) {
    cols[col.id] = [];
  }
  for (const task of tasks) {
    const col = getColumnForStatus(task.status);
    if (cols[col]) cols[col].push(task);
  }
  return cols;
});

/* ─── Drag state (module-level signals) ─── */
const dragTaskId = signal(null);
const dragOverCol = signal(null);

/* ─── KanbanCard ─── */
function KanbanCard({ task, onOpen }) {
  const onDragStart = useCallback((e) => {
    dragTaskId.value = task.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    e.currentTarget.classList.add("dragging");
  }, [task.id]);

  const onDragEnd = useCallback((e) => {
    dragTaskId.value = null;
    e.currentTarget.classList.remove("dragging");
  }, []);

  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;

  return html`
    <div
      class="kanban-card ${dragTaskId.value === task.id ? 'dragging' : ''}"
      draggable="true"
      onDragStart=${onDragStart}
      onDragEnd=${onDragEnd}
      onClick=${() => onOpen(task.id)}
    >
      <div class="kanban-card-title">${truncate(task.title || "(untitled)", 80)}</div>
      <div class="kanban-card-meta">
        ${task.priority && html`
          <span class="kanban-card-priority" style="background:${priorityColor}" title=${task.priority}></span>
        `}
        <span class="kanban-card-id">${typeof task.id === "string" ? truncate(task.id, 12) : task.id}</span>
        ${task.updated_at && html`<span>${formatRelative(task.updated_at)}</span>`}
      </div>
    </div>
  `;
}

/* ─── KanbanColumn ─── */
function KanbanColumn({ col, tasks, onOpen }) {
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverCol.value = col.id;
  }, [col.id]);

  const onDragLeave = useCallback(() => {
    if (dragOverCol.value === col.id) dragOverCol.value = null;
  }, [col.id]);

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    dragOverCol.value = null;
    const taskId = e.dataTransfer.getData("text/plain") || dragTaskId.value;
    dragTaskId.value = null;
    if (!taskId) return;

    // Find current column for the task
    const currentTask = (tasksData.value || []).find((t) => t.id === taskId);
    if (!currentTask) return;
    const currentCol = getColumnForStatus(currentTask.status);
    if (currentCol === col.id) return; // no-op same column

    const newStatus = COLUMN_TO_STATUS[col.id] || "todo";
    haptic("medium");

    // Optimistic update
    const prev = cloneValue(tasksData.value);
    try {
      await runOptimistic(
        () => {
          tasksData.value = tasksData.value.map((t) =>
            t.id === taskId ? { ...t, status: newStatus } : t,
          );
        },
        async () => {
          const res = await apiFetch("/api/tasks/update", {
            method: "POST",
            body: JSON.stringify({ taskId, status: newStatus }),
          });
          if (res?.data) {
            tasksData.value = tasksData.value.map((t) =>
              t.id === taskId ? { ...t, ...res.data } : t,
            );
          }
          return res;
        },
        () => {
          tasksData.value = prev;
        },
      );
      showToast(`Moved to ${col.title}`, "success");
    } catch {
      /* toast via apiFetch */
    }
  }, [col.id, col.title]);

  const isOver = dragOverCol.value === col.id;

  return html`
    <div
      class="kanban-column ${isOver ? 'drag-over' : ''}"
      onDragOver=${onDragOver}
      onDragLeave=${onDragLeave}
      onDrop=${onDrop}
    >
      <div class="kanban-column-header" style="border-bottom-color: ${col.color}">
        <span>${col.icon}</span>
        <span>${col.title}</span>
        <span class="kanban-count">${tasks.length}</span>
      </div>
      <div class="kanban-cards">
        ${tasks.length
          ? tasks.map((task) => html`
              <${KanbanCard} key=${task.id} task=${task} onOpen=${onOpen} />
            `)
          : html`<div class="kanban-empty-col">No tasks</div>`
        }
      </div>
    </div>
  `;
}

/* ─── KanbanBoard (main export) ─── */
export function KanbanBoard({ onOpenTask }) {
  const cols = columnData.value;

  return html`
    <div class="kanban-board">
      ${COLUMNS.map((col) => html`
        <${KanbanColumn}
          key=${col.id}
          col=${col}
          tasks=${cols[col.id] || []}
          onOpen=${onOpenTask}
        />
      `)}
    </div>
  `;
}
