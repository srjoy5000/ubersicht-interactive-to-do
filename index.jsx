import { React } from "uebersicht";

const STORAGE_KEY = "uebersicht-kanban-state";
let GLOBAL_DRAG = null;

// 1. Load and Migrate Initial State
const loadInitialState = () => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  const parsedData = savedData ? JSON.parse(savedData) : null;

  const state = {
    columns: { todo: [], doing: [], done: [], ...(parsedData?.columns || {}) },
    limits: { todo: 5, doing: 5, done: 5 },
    limitsEnabled: {
      todo: false,
      doing: false,
      done: false,
      ...(parsedData?.limitsEnabled || {}),
    },
    hiddenColumns: {
      todo: false,
      doing: false,
      done: false,
      ...(parsedData?.hiddenColumns || {}),
    },
    boardHidden: parsedData?.boardHidden || false,
    activeTask: parsedData?.activeTask || null,
    dragging: null,
    dropTarget: null,
    dragOverItem: null,
    editing: null,
  };

  if (parsedData?.limits) {
    ["todo", "doing", "done"].forEach((col) => {
      if (
        parsedData.limits[col] !== null &&
        parsedData.limits[col] !== undefined
      ) {
        state.limits[col] = parsedData.limits[col];
        if (!parsedData.limitsEnabled) {
          state.limitsEnabled[col] = true;
        }
      }
    });
  }

  return state;
};

export const initialState = loadInitialState();

// 2. Helper to save and return
const saveAndReturn = (newState) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      columns: newState.columns,
      limits: newState.limits,
      limitsEnabled: newState.limitsEnabled,
      hiddenColumns: newState.hiddenColumns,
      boardHidden: newState.boardHidden,
      activeTask: newState.activeTask,
    }),
  );
  return newState;
};

// 3. Update Logic (Reducer)
export const updateState = (event, previousState) => {
  const state = { ...previousState };
  const currentColumnTasks = state.columns[event.column] || [];
  const currentTaskCount = currentColumnTasks.length;

  switch (event.type) {
    case "TOGGLE_BOARD":
      return saveAndReturn({ ...state, boardHidden: !state.boardHidden });

    case "ADD_TASK": {
      const content = event.value.trim();
      if (!content) return state;

      const isEnabled = state.limitsEnabled[event.column];
      const limitVal = parseInt(state.limits[event.column], 10);

      if (
        isEnabled &&
        !isNaN(limitVal) &&
        currentTaskCount >= Math.max(1, limitVal)
      ) {
        return state;
      }

      return saveAndReturn({
        ...state,
        columns: {
          ...state.columns,
          [event.column]: [...currentColumnTasks, content],
        },
        hiddenColumns: { ...state.hiddenColumns, [event.column]: false },
      });
    }

    case "TOGGLE_VISIBILITY":
      return saveAndReturn({
        ...state,
        hiddenColumns: {
          ...state.hiddenColumns,
          [event.column]: !state.hiddenColumns[event.column],
        },
      });

    case "TOGGLE_LIMIT": {
      const isCurrentlyEnabled = state.limitsEnabled[event.column];
      let currentLimit = parseInt(state.limits[event.column], 10) || 5;

      if (!isCurrentlyEnabled && currentLimit < currentTaskCount) {
        currentLimit = currentTaskCount;
      }

      return saveAndReturn({
        ...state,
        limits: { ...state.limits, [event.column]: currentLimit },
        limitsEnabled: {
          ...state.limitsEnabled,
          [event.column]: !isCurrentlyEnabled,
        },
      });
    }

    case "UPDATE_LIMIT":
      return saveAndReturn({
        ...state,
        limits: { ...state.limits, [event.column]: event.value },
      });

    case "ENFORCE_LIMIT_BOUNDS": {
      let val = parseInt(state.limits[event.column], 10);
      if (isNaN(val)) val = Math.max(5, currentTaskCount);
      else if (val < currentTaskCount) val = currentTaskCount;

      return saveAndReturn({
        ...state,
        limits: { ...state.limits, [event.column]: val },
      });
    }

    case "MOVE_TASK": {
      const { from, to, fromIndex, toIndex } = event;

      if (
        !state.columns[from] ||
        state.columns[from][fromIndex] === undefined
      ) {
        return {
          ...state,
          dragging: null,
          dropTarget: null,
          dragOverItem: null,
        };
      }

      const task = state.columns[from][fromIndex];
      const destColumnTasks = state.columns[to] || [];
      const isEnabled = state.limitsEnabled[to];
      const limitVal = parseInt(state.limits[to], 10);

      if (
        isEnabled &&
        !isNaN(limitVal) &&
        destColumnTasks.length >= Math.max(1, limitVal)
      ) {
        return {
          ...state,
          dragging: null,
          dropTarget: null,
          dragOverItem: null,
        };
      }

      const newFrom = state.columns[from].filter((_, i) => i !== fromIndex);
      const newTo = [...destColumnTasks];

      if (toIndex !== undefined && toIndex !== null)
        newTo.splice(toIndex, 0, task);
      else newTo.push(task);

      // If moving away from 'doing' and it was the active task, remove highlight
      const newActiveTask =
        from === "doing" && task === state.activeTask ? null : state.activeTask;

      return saveAndReturn({
        ...state,
        columns: { ...state.columns, [from]: newFrom, [to]: newTo },
        activeTask: newActiveTask,
        dragging: null,
        dropTarget: null,
        dragOverItem: null,
      });
    }

    case "REORDER_TASK": {
      const { column, fromIndex, toIndex } = event;

      if (
        !state.columns[column] ||
        state.columns[column][fromIndex] === undefined
      ) {
        return {
          ...state,
          dragging: null,
          dropTarget: null,
          dragOverItem: null,
        };
      }

      const tasks = [...currentColumnTasks];
      const [task] = tasks.splice(fromIndex, 1);
      const insertIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
      tasks.splice(insertIndex, 0, task);

      return saveAndReturn({
        ...state,
        columns: { ...state.columns, [column]: tasks },
        dragging: null,
        dropTarget: null,
        dragOverItem: null,
      });
    }

    case "REMOVE_TASK": {
      const removedContent = currentColumnTasks[event.index];
      const wasActive =
        state.activeTask === removedContent && event.column === "doing";

      return saveAndReturn({
        ...state,
        columns: {
          ...state.columns,
          [event.column]: currentColumnTasks.filter(
            (_, i) => i !== event.index,
          ),
        },
        activeTask: wasActive ? null : state.activeTask,
      });
    }

    case "CLEAR_COLUMN":
      return saveAndReturn({
        ...state,
        columns: { ...state.columns, [event.column]: [] },
        activeTask: event.column === "doing" ? null : state.activeTask,
      });

    case "START_EDIT":
      return {
        ...state,
        editing: { column: event.column, index: event.index },
      };

    case "CANCEL_EDIT":
      return { ...state, editing: null };

    case "SAVE_EDIT": {
      const content = event.value.trim();
      const oldContent = currentColumnTasks[event.index];
      const wasActive =
        state.activeTask === oldContent && event.column === "doing";

      if (!content) {
        return saveAndReturn({
          ...state,
          columns: {
            ...state.columns,
            [event.column]: currentColumnTasks.filter(
              (_, i) => i !== event.index,
            ),
          },
          editing: null,
          activeTask: wasActive ? null : state.activeTask,
        });
      }

      const updatedColumn = [...currentColumnTasks];
      updatedColumn[event.index] = content;
      return saveAndReturn({
        ...state,
        columns: { ...state.columns, [event.column]: updatedColumn },
        editing: null,
        activeTask: wasActive ? content : state.activeTask,
      });
    }

    case "TOGGLE_ACTIVE":
      return saveAndReturn({
        ...state,
        activeTask: state.activeTask === event.task ? null : event.task,
      });

    case "SET_DRAG_START":
      return { ...state, dragging: event.data };
    case "SET_DROP_TARGET":
      return { ...state, dropTarget: event.column };
    case "SET_DRAG_OVER_ITEM":
      return { ...state, dragOverItem: event.data };
    case "CLEAR_DRAG_STATE":
      return { ...state, dragging: null, dropTarget: null, dragOverItem: null };
    default:
      return state;
  }
};

// 4. Styles
export const className = `
  left: 50%;
  top: 60px;
  transform: translateX(-50%);
  width: 1050px; 
  max-width: 95vw;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column; 
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: white;

  * { box-sizing: border-box; }

  .global-toggle-btn {
    background: rgba(20, 20, 20, 0.5);
    background: rgba(255, 255, 255, 0);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0);
    color: rgba(255, 255, 255, 0);
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    cursor: pointer;
    margin-bottom: 20px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0);
  }
  .global-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    background: rgba(20, 20, 20, 0.5);
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
  }
  .board-container { width: 100%; display: flex; justify-content: center; }
  .board { display: flex; gap: 20px; width: 100%; }

  .column {
    flex: 1 1 0; 
    min-width: 0;
    background: rgba(20, 20, 20, 0.4);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.2s ease-in-out;
    min-height: 200px;
    max-height: calc(100vh - 160px);
    display: flex;
    flex-direction: column;
  }
  .column.drag-over {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
  }

  .column-header { display: flex; flex-direction: column; gap: 12px; margin-bottom: 15px; }
  .header-top { display: flex; justify-content: space-between; align-items: center; min-height: 24px; }
  .header-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; gap: 10px; }
  .header-title-group { display: flex; align-items: center; gap: 12px; }
  .header-actions { display: flex; gap: 5px; flex-shrink: 0; }
  .limit-group { display: flex; align-items: center; gap: 6px; }
  
  .count-badge {
    background: rgba(255, 255, 255, 0.1);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
  }

  .limit-input-container { display: flex; align-items: center; gap: 6px; visibility: visible; }
  .limit-input-container.hidden { visibility: hidden; }
  .limit-label { font-size: 10px; color: rgba(255, 255, 255, 0.4); font-weight: 700; }

  .limit-toggle-btn {
    width: 75px; text-align: center; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0);
    color: rgba(255, 255, 255, 0.5); font-size: 10px; padding: 4px 0; border-radius: 4px;
    cursor: pointer; transition: all 0.2s; font-weight: bold; letter-spacing: 0.5px; white-space: nowrap;
  }
  .limit-toggle-btn:hover { background: rgba(48, 209, 88, 0.25); color: #30d158; }
  .limit-toggle-btn.on:hover { background: rgba(48, 209, 88, 0.25); }
  
  .limit-input-inline {
    width: 45px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; padding: 3px 4px;
    color: rgba(255, 255, 255, 0.5); font-size: 11px; outline: none; text-align: center;
    font-family: inherit; font-weight: bold;
  }

  .action-btn {
    background: none; border: none; color: rgba(255, 255, 255, 0.4); font-size: 10px;
    text-transform: uppercase; cursor: pointer; padding: 4px 8px; border-radius: 4px;
    transition: all 0.2s; white-space: nowrap;
  }
  .action-btn.fixed-width { width: 50px; text-align: center; padding: 4px 0; }
  .action-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }
  .action-btn.danger:hover { background: rgba(255, 69, 58, 0.2); color: #ff453a; }

  h3 {
    margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 2px; color: rgba(255, 255, 255, 1); white-space: nowrap; cursor: default;
    transform: scale(1.15); transform-origin: left center; text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
  }

  .task-list { flex: 1; overflow-y: auto; padding-right: 5px; padding-top: 5px; min-height: 50px; }
  
  .card {
    background: rgba(255, 255, 255, 0.08); margin-bottom: 12px; padding: 14px; border-radius: 10px;
    font-size: 14px; cursor: grab; display: flex; justify-content: space-between; align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.05); transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s, border 0.2s;
    position: relative;
  }
  .card:hover { background: rgba(255, 255, 255, 0.12); }
  .card.is-dragging { opacity: 0.3; }
  .card.drag-over-indicator::before {
    content: ''; position: absolute; top: -7px; left: 0; right: 0; height: 2px;
    background-color: #ffffff; border-radius: 2px; z-index: 10; pointer-events: none; 
  }
  
  .card.is-active {
    background: rgba(48, 209, 88, 0.15);
    border: 1px solid rgba(48, 209, 88, 0.4);
    box-shadow: 0 0 12px rgba(48, 209, 88, 0.15);
  }
  
  .card-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .drop-indicator-bottom {
    height: 2px;
    background-color: #ffffff;
    border-radius: 2px;
    margin: 6px 0 10px 0; 
    pointer-events: none;
  }

  .task-text { flex: 1; cursor: text; line-height: 1.4; padding-right: 10px; word-break: break-word; }
  .edit-input {
    flex: 1; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 6px; padding: 6px 10px; color: white; font-size: 14px; outline: none;
    margin-right: 10px; font-family: inherit;
  }

  .active-btn { 
    border: none; background: none; color: rgba(255, 255, 255, 0.2); cursor: pointer; 
    font-size: 14px; padding: 0 2px; transition: all 0.2s; 
  }
  .active-btn:hover { color: rgba(48, 209, 88, 0.6); }
  .active-btn.active { color: #30d158; text-shadow: 0 0 8px rgba(48, 209, 88, 0.4); }

  .del-btn { border: none; background: none; color: rgba(255, 255, 255, 0.3); cursor: pointer; font-size: 16px; padding: 0 2px; transition: color 0.2s; }
  .del-btn:hover { color: #ff453a; }

  .add-zone { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; }
  .add-input {
    width: 100%; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px; padding: 10px; color: white; font-size: 13px; outline: none; transition: border 0.2s;
  }
  .add-input:focus { border-color: rgba(255, 255, 255, 0.3); }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); } 
`;

// 5. UI Components

const Card = ({ task, index, colKey, state, dispatch }) => {
  const { dragging, dragOverItem, editing, activeTask } = state;
  const isDraggingMe =
    (GLOBAL_DRAG?.fromCol || dragging?.fromColumn) === colKey &&
    (GLOBAL_DRAG?.fromIndex || dragging?.index) === index;
  const isBeingHoveredOver =
    dragOverItem?.column === colKey && dragOverItem?.index === index;
  const isEditing = editing?.column === colKey && editing?.index === index;
  const isActive = colKey === "doing" && activeTask === task;

  return (
    <div
      className={`card ${isDraggingMe ? "is-dragging" : ""} ${isBeingHoveredOver && !isDraggingMe ? "drag-over-indicator" : ""} ${isActive ? "is-active" : ""}`}
      draggable={!isEditing}
      onDragStart={(e) => {
        if (isEditing) return e.preventDefault();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `${colKey}:${index}`);
        GLOBAL_DRAG = { fromCol: colKey, fromIndex: index };
        dispatch({
          type: "SET_DRAG_START",
          data: { fromColumn: colKey, index },
        });
      }}
      onDragEnd={() => {
        GLOBAL_DRAG = null;
        dispatch({ type: "CLEAR_DRAG_STATE" });
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (dragOverItem?.column !== colKey || dragOverItem?.index !== index) {
          dispatch({
            type: "SET_DRAG_OVER_ITEM",
            data: { column: colKey, index },
          });
        }
      }}
    >
      {isEditing ? (
        <input
          className="edit-input"
          defaultValue={task}
          autoFocus
          onBlur={(e) =>
            dispatch({
              type: "SAVE_EDIT",
              column: colKey,
              index,
              value: e.target.value,
            })
          }
          onKeyDown={(e) => {
            if (e.keyCode === 229) return;
            if (e.key === "Enter")
              dispatch({
                type: "SAVE_EDIT",
                column: colKey,
                index,
                value: e.target.value,
              });
            else if (e.key === "Escape") dispatch({ type: "CANCEL_EDIT" });
          }}
        />
      ) : (
        <span
          className="task-text"
          onDoubleClick={() =>
            dispatch({ type: "START_EDIT", column: colKey, index })
          }
        >
          {task}
        </span>
      )}
      {!isEditing && (
        <div className="card-actions">
          {colKey === "doing" && (
            <button
              className={`active-btn ${isActive ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "TOGGLE_ACTIVE", task });
              }}
              title="Set as Current Task"
            >
              ●
            </button>
          )}
          <button
            className="del-btn"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "REMOVE_TASK", column: colKey, index });
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

const ColumnHeader = ({ colKey, state, dispatch }) => {
  const { columns, limits, limitsEnabled, hiddenColumns } = state;
  const currentTaskCount = (columns[colKey] || []).length;
  const isEnabled = limitsEnabled[colKey];

  return (
    <div className="column-header">
      <div className="header-top">
        <div className="header-title-group">
          <h3>
            {colKey === "todo"
              ? "To Do"
              : colKey === "doing"
                ? "Doing"
                : "Completed"}
          </h3>
        </div>
        <span className="count-badge">Count: {currentTaskCount}</span>
      </div>

      <div className="header-bottom">
        <div className="limit-group">
          <button
            className={`limit-toggle-btn ${isEnabled ? "on" : "off"}`}
            onClick={() => dispatch({ type: "TOGGLE_LIMIT", column: colKey })}
          >
            {isEnabled ? "Limit: ON" : "Limit: OFF"}
          </button>
          <div
            className={`limit-input-container ${!isEnabled ? "hidden" : ""}`}
          >
            <span className="limit-label">MAX</span>
            <input
              className="limit-input-inline"
              type="number"
              min={currentTaskCount}
              value={limits[colKey]}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_LIMIT",
                  column: colKey,
                  value: e.target.value,
                })
              }
              onBlur={() =>
                dispatch({ type: "ENFORCE_LIMIT_BOUNDS", column: colKey })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") e.target.blur();
              }}
            />
          </div>
        </div>

        <div className="header-actions">
          <button
            className="action-btn fixed-width"
            onClick={() =>
              dispatch({ type: "TOGGLE_VISIBILITY", column: colKey })
            }
          >
            {hiddenColumns[colKey] ? "Show" : "Hide"}
          </button>
          {currentTaskCount > 0 && (
            <button
              className="action-btn danger"
              onClick={() => dispatch({ type: "CLEAR_COLUMN", column: colKey })}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const KanbanColumn = ({ colKey, state, dispatch }) => {
  const {
    columns,
    limits,
    limitsEnabled,
    hiddenColumns,
    dragging,
    dropTarget,
    dragOverItem,
  } = state;
  const currentTaskCount = (columns[colKey] || []).length;
  const isEnabled = limitsEnabled[colKey];
  const limitVal = parseInt(limits[colKey], 10);

  const isFull =
    isEnabled && !isNaN(limitVal) && currentTaskCount >= Math.max(1, limitVal);
  const isDraggingFromHere =
    (GLOBAL_DRAG?.fromCol || dragging?.fromColumn) === colKey;

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (hiddenColumns[colKey]) return;

    const fromCol = GLOBAL_DRAG?.fromCol ?? dragging?.fromColumn;
    const fromIndex = GLOBAL_DRAG?.fromIndex ?? dragging?.index;

    if (fromCol === undefined || fromIndex === undefined) {
      GLOBAL_DRAG = null;
      return dispatch({ type: "CLEAR_DRAG_STATE" });
    }

    const dropIndex =
      dragOverItem?.column === colKey ? dragOverItem.index : undefined;

    if (fromCol === colKey) {
      const targetIndex =
        dropIndex !== undefined ? dropIndex : currentTaskCount;

      if (targetIndex !== fromIndex && targetIndex !== fromIndex + 1) {
        dispatch({
          type: "REORDER_TASK",
          column: colKey,
          fromIndex,
          toIndex: targetIndex,
        });
      }
    } else {
      dispatch({
        type: "MOVE_TASK",
        from: fromCol,
        to: colKey,
        fromIndex,
        toIndex: dropIndex,
      });
    }

    GLOBAL_DRAG = null;
    dispatch({ type: "CLEAR_DRAG_STATE" });
  };

  return (
    <div
      className={`column ${dropTarget === colKey && !hiddenColumns[colKey] ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (isFull && !isDraggingFromHere)
          return (e.dataTransfer.dropEffect = "none");
        e.dataTransfer.dropEffect = "move";

        if (hiddenColumns[colKey]) return;
        if (dropTarget !== colKey)
          dispatch({ type: "SET_DROP_TARGET", column: colKey });

        const target = e.target;
        if (
          target.classList.contains("column") ||
          target.classList.contains("task-list") ||
          target.classList.contains("add-zone")
        ) {
          if (
            dragOverItem?.column !== colKey ||
            dragOverItem?.index !== currentTaskCount
          ) {
            dispatch({
              type: "SET_DRAG_OVER_ITEM",
              data: { column: colKey, index: currentTaskCount },
            });
          }
        }
      }}
      onDragEnter={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          dispatch({ type: "SET_DROP_TARGET", column: null });
        }
      }}
      onDrop={handleDrop}
    >
      <ColumnHeader colKey={colKey} state={state} dispatch={dispatch} />

      {!hiddenColumns[colKey] && (
        <div className="task-list">
          {(columns[colKey] || []).map((task, i) => (
            <Card
              key={`${colKey}-${i}`}
              task={task}
              index={i}
              colKey={colKey}
              state={state}
              dispatch={dispatch}
            />
          ))}

          {dragOverItem?.column === colKey &&
            dragOverItem?.index === currentTaskCount && (
              <div className="drop-indicator-bottom" />
            )}
        </div>
      )}

      <div className="add-zone">
        <input
          className="add-input"
          placeholder="+ Add task..."
          onKeyDown={(e) => {
            if (e.keyCode === 229) return;
            if (e.key === "Enter") {
              const content = e.target.value.trim();
              if (content) {
                dispatch({ type: "ADD_TASK", column: colKey, value: content });
                e.target.value = "";
                setTimeout(() => e.target.focus(), 10);
              }
            }
          }}
        />
      </div>
    </div>
  );
};

// 6. Component View Wrapper
export const render = (state, dispatch) => {
  if (!state) return null;

  return (
    <>
      <button
        className="global-toggle-btn"
        onClick={() => dispatch({ type: "TOGGLE_BOARD" })}
      >
        {state.boardHidden ? "Show Kanban Board" : "Hide Kanban Board"}
      </button>

      {!state.boardHidden && (
        <div className="board-container">
          <div className="board">
            {["todo", "doing", "done"].map((colKey) => (
              <KanbanColumn
                key={colKey}
                colKey={colKey}
                state={state}
                dispatch={dispatch}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};
