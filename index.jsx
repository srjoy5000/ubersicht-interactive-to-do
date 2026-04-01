import { React } from 'uebersicht';

// 1. Initial State - Strictly 2 Columns
export const initialState = {
  columns: {
    todo: [],
    done: []
  },
  columnInputs: {
    todo: '',
    done: ''
  },
  dragging: null,    // { fromColumn, index }
  dropTarget: null   // string (column key)
};

// 2. Update Logic
export const updateState = (event, previousState) => {
  const state = { ...previousState };

  switch (event.type) {
    case 'CHANGE_INPUT':
      return {
        ...state,
        columnInputs: { ...state.columnInputs, [event.column]: event.value }
      };

    case 'ADD_TASK':
      const content = state.columnInputs[event.column].trim();
      if (!content) return state;
      return {
        ...state,
        columns: {
          ...state.columns,
          [event.column]: [...state.columns[event.column], content]
        },
        columnInputs: { ...state.columnInputs, [event.column]: '' }
      };

    case 'SET_DRAG_START':
      return { ...state, dragging: event.data };

    case 'SET_DROP_TARGET':
      return { ...state, dropTarget: event.column };

    case 'MOVE_TASK':
      const { from, to, index } = event;
      const task = state.columns[from][index];
      
      const newFrom = state.columns[from].filter((_, i) => i !== index);
      const newTo = [...state.columns[to], task];

      return {
        ...state,
        columns: { ...state.columns, [from]: newFrom, [to]: newTo },
        dragging: null,
        dropTarget: null
      };

    case 'REMOVE_TASK':
      return {
        ...state,
        columns: {
          ...state.columns,
          [event.column]: state.columns[event.column].filter((_, i) => i !== event.index)
        }
      };
    
    case 'CLEAR_COLUMN':
      return {
        ...state,
        columns: {
          ...state.columns,
          [event.column]: []
        }
      };

    default:
      return state;
  }
};

// 3. Styles with Animations
export const className = `
  left: 50%;
  top: 30%;
  transform: translate(-50%, -50%);
  width: 700px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: white;

  * { box-sizing: border-box; }

  .board {
    display: flex;
    gap: 25px;
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

  /* Visual feedback when holding a card over a column */
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
    color: rgba(255, 255, 255, 0.5);
  }

  .task-list { flex: 1; }

  .card {
    background: rgba(255, 255, 255, 0.08);
    margin-bottom: 12px;
    padding: 14px;
    border-radius: 10px;
    font-size: 14px;
    cursor: grab;
    display: flex;
    justify-content: space-between;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  }

  .card:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
  }

  /* Style for the card being dragged */
  .card.is-dragging {
    opacity: 0.4;
    transform: scale(0.95);
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

  .add-input:focus {
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

// 4. Component View
export const render = (state, dispatch) => {
  if (!state) return null;
  const { columns, columnInputs, dragging, dropTarget } = state;

  const handleDragStart = (e, col, idx) => {
    dispatch({ type: 'SET_DRAG_START', data: { fromColumn: col, index: idx } });
    // Ghost image setup
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
              return (
                <div 
                  className={`card ${isDragging ? 'is-dragging' : ''}`}
                  key={`${colKey}-${i}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, colKey, i)}
                >
                  <span>{task}</span>
                  <button 
                    className="del-btn" 
                    onClick={() => dispatch({ type: 'REMOVE_TASK', column: colKey, index: i })}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div className="add-zone">
            <input 
              className="add-input"
              placeholder="+ Add task..."
              value={columnInputs[colKey]}
              onChange={(e) => dispatch({ type: 'CHANGE_INPUT', column: colKey, value: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && dispatch({ type: 'ADD_TASK', column: colKey })}
            />
          </div>
        </div>
      ))}
    </div>
  );
};