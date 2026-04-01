import { React } from 'uebersicht';

const STORAGE_KEY = 'uebersicht-kanban-state';

// 1. Try to load existing data
const savedData = localStorage.getItem(STORAGE_KEY);
const parsedData = savedData ? JSON.parse(savedData) : null;

// 2. Initial State
export const initialState = {
  columns: parsedData?.columns || { todo: [], done: [] },
  dragging: null,
  dropTarget: null,
  editing: null // Tracks which task is currently being edited: { column, index }
};

// 3. Helper to save and return
const saveAndReturn = (newState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns: newState.columns }));
  return newState;
};

// 4. Update Logic
export const updateState = (event, previousState) => {
  const state = { ...previousState };

  switch (event.type) {
    case 'ADD_TASK': {
      const content = event.value.trim();
      if (!content) return state;

      return saveAndReturn({
        ...state,
        columns: {
          ...state.columns,
          [event.column]: [...state.columns[event.column], content]
        }
      });
    }

    case 'MOVE_TASK': {
      const { from, to, index } = event;
      const task = state.columns[from][index];
      const newFrom = state.columns[from].filter((_, i) => i !== index);
      const newTo = [...state.columns[to], task];

      return saveAndReturn({
        ...state,
        columns: { ...state.columns, [from]: newFrom, [to]: newTo },
        dragging: null,
        dropTarget: null
      });
    }

    case 'REMOVE_TASK': {
      return saveAndReturn({
        ...state,
        columns: {
          ...state.columns,
          [event.column]: state.columns[event.column].filter((_, i) => i !== event.index)
        }
      });
    }

    case 'CLEAR_COLUMN': {
      return saveAndReturn({
        ...state,
        columns: { ...state.columns, [event.column]: [] }
      });
    }

    // --- Edit Task Logic ---
    case 'START_EDIT':
      return { ...state, editing: { column: event.column, index: event.index } };

    case 'CANCEL_EDIT':
      return { ...state, editing: null };

    case 'SAVE_EDIT': {
      const content = event.value.trim();
      // If they deleted all the text, just remove the task entirely
      if (!content) {
        return saveAndReturn({
          ...state,
          columns: {
            ...state.columns,
            [event.column]: state.columns[event.column].filter((_, i) => i !== event.index)
          },
          editing: null
        });
      }

      // Otherwise, save the new text
      const updatedColumn = [...state.columns[event.column]];
      updatedColumn[event.index] = content;

      return saveAndReturn({
        ...state,
        columns: { ...state.columns, [event.column]: updatedColumn },
        editing: null
      });
    }

    // --- Temporary UI States ---
    case 'SET_DRAG_START':
      return { ...state, dragging: event.data };

    case 'SET_DROP_TARGET':
      return { ...state, dropTarget: event.column };

    default:
      return state;
  }
};

// 5. Styles
export const className = `
  left: 50%;
  top: 60px;
  transform: translateX(-50%);
  width: 700px;
  max-height: calc(100vh - 120px);
  display: flex;
  
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: white;

  * { box-sizing: border-box; }

  .board {
    display: flex;
    gap: 25px;
    width: 100%;
  }

  .column {
    flex: 1;
    background: rgba(20, 20, 20, 0.4);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.2s ease-in-out;
    min-height: 350px;
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .clear-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.3);
    font-size: 10px;
    text-transform: uppercase;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: rgba(255, 69, 58, 0.2);
    color: #ff453a;
  }

  .column.drag-over {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    transform: scale(1.02);
  }

  h3 {
    margin: 0 0 20px 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
    color: rgba(255, 255, 255, 1);
  }

  .task-list { 
    flex: 1; 
    overflow-y: auto; 
    padding-right: 5px; 
  }

  .card {
    background: rgba(255, 255, 255, 0.08);
    margin-bottom: 12px;
    padding: 14px;
    border-radius: 10px;
    font-size: 14px;
    cursor: grab;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  }

  .card:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
  }

  .card.is-dragging {
    opacity: 0.4;
    transform: scale(0.95);
  }

  .task-text {
    flex: 1;
    cursor: text;
    line-height: 1.4;
    padding-right: 10px;
    word-break: break-word;
  }

  .edit-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 6px;
    padding: 6px 10px;
    color: white;
    font-size: 14px;
    outline: none;
    margin-right: 10px;
    font-family: inherit;
  }

  .del-btn {
    border: none;
    background: none;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    font-size: 16px;
    padding: 0 5px;
    transition: color 0.2s;
  }

  .del-btn:hover { color: #ff453a; }

  .add-zone {
    margin-top: 15px;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 15px;
  }

  .add-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px;
    color: white;
    font-size: 13px;
    outline: none;
    transition: border 0.2s;
  }

  .add-input:focus { border-color: rgba(255, 255, 255, 0.3); }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
`;

// 6. Component View
export const render = (state, dispatch) => {
  if (!state) return null;
  const { columns, dragging, dropTarget, editing } = state;

  const handleDragStart = (e, col, idx) => {
    // Prevent drag if we are currently editing
    if (editing) {
      e.preventDefault();
      return;
    }
    dispatch({ type: 'SET_DRAG_START', data: { fromColumn: col, index: idx } });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    if (dropTarget !== col) {
      dispatch({ type: 'SET_DROP_TARGET', column: col });
    }
  };

  const handleDrop = (e, toCol) => {
    e.preventDefault();
    if (dragging && dragging.fromColumn !== toCol) {
      dispatch({
        type: 'MOVE_TASK',
        from: dragging.fromColumn,
        to: toCol,
        index: dragging.index
      });
    } else {
      dispatch({ type: 'SET_DROP_TARGET', column: null });
    }
  };

  return (
    <div className="board">
      {['todo', 'done'].map((colKey) => (
        <div
          className={`column ${dropTarget === colKey ? 'drag-over' : ''}`}
          key={colKey}
          onDragOver={(e) => handleDragOver(e, colKey)}
          onDragLeave={() => dispatch({ type: 'SET_DROP_TARGET', column: null })}
          onDrop={(e) => handleDrop(e, colKey)}
        >
          <div className="column-header">
            <h3>{colKey === 'todo' ? 'To Do' : 'Completed'}</h3>
            {columns[colKey].length > 0 && (
              <button
                className="clear-btn"
                onClick={() => dispatch({ type: 'CLEAR_COLUMN', column: colKey })}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="task-list">
            {columns[colKey].map((task, i) => {
              const isDragging = dragging?.fromColumn === colKey && dragging?.index === i;
              const isEditing = editing?.column === colKey && editing?.index === i;

              return (
                <div
                  className={`card ${isDragging ? 'is-dragging' : ''}`}
                  key={`${colKey}-${i}`}
                  draggable={!isEditing}
                  onDragStart={(e) => handleDragStart(e, colKey, i)}
                >
                  {isEditing ? (
                    <input 
                      className="edit-input"
                      defaultValue={task}
                      autoFocus
                      onBlur={(e) => dispatch({ type: 'SAVE_EDIT', column: colKey, index: i, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.keyCode === 229) return; // IME check
                        if (e.key === 'Enter') {
                          dispatch({ type: 'SAVE_EDIT', column: colKey, index: i, value: e.target.value });
                        } else if (e.key === 'Escape') {
                          dispatch({ type: 'CANCEL_EDIT' });
                        }
                      }}
                    />
                  ) : (
                    <span 
                      className="task-text"
                      onDoubleClick={() => dispatch({ type: 'START_EDIT', column: colKey, index: i })}
                    >
                      {task}
                    </span>
                  )}

                  {!isEditing && (
                    <button
                      className="del-btn"
                      onClick={() => dispatch({ type: 'REMOVE_TASK', column: colKey, index: i })}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="add-zone">
            <input
              className="add-input"
              placeholder="+ Add task..."
              onKeyDown={(e) => {
                if (e.keyCode === 229) return;
                if (e.key === 'Enter') {
                  const content = e.target.value.trim();
                  if (content) {
                    dispatch({ type: 'ADD_TASK', column: colKey, value: content });
                    e.target.value = '';
                    const inputElement = e.target;
                    setTimeout(() => inputElement.focus(), 10);
                  }
                }
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};