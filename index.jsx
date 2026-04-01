import { React } from 'uebersicht';

// 1. Initial State with 3 Columns
export const initialState = {
  columns: {
    todo: [],
    // doing: [],
    done: []
  },
  inputValue: ''
};

// 2. Update Logic (State Management)
export const updateState = (event, previousState) => {
  const state = { ...initialState, ...previousState };
  const { columns } = state;

  switch (event.type) {
    case 'CHANGE_INPUT':
      return { ...state, inputValue: event.value };

    case 'ADD_TASK':
      if (!state.inputValue.trim()) return state;
      return {
        ...state,
        columns: {
          ...columns,
          todo: [...columns.todo, state.inputValue.trim()]
        },
        inputValue: ''
      };

    case 'MOVE_TASK':
      const { from, to, index } = event;
      const task = columns[from][index];
      // Remove from source
      const newSource = columns[from].filter((_, i) => i !== index);
      // Add to destination
      const newDest = [...columns[to], task];
      
      return {
        ...state,
        columns: { ...columns, [from]: newSource, [to]: newDest }
      };

    case 'REMOVE_TASK':
      return {
        ...state,
        columns: {
          ...columns,
          [event.column]: columns[event.column].filter((_, i) => i !== event.index)
        }
      };

    default:
      return state;
  }
};

// 3. Styles (Horizontal Kanban Layout)
export const className = `
  left: 50%;
  top: 25%;
  transform: translate(-50%, -50%);
  width: 900px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: rgba(255,255,255,255);

  /* Global box-sizing for all widget elements */
  * { box-sizing: border-box; }

  h3 { 
    margin: 0 0 20px 0; 
    font-size: 14px; 
    text-transform: uppercase; 
    opacity: 1; 
    letter-spacing: 1.5px;
    
    /* Centering logic */
    text-align: center; 
    width: 100%; 
  }

  .input-group { 
    display: flex; 
    gap: 8px; 
    margin-bottom: 20px; 
    /* Formula: (Total Width - Total Gaps) / 2 */
    width: calc((100% - 20px) / 2); 
  }

  input { 
    flex: 1; 
    background: rgba(255,255,255,0.1); 
    border: 1px solid rgba(255,255,255,0.2); 
    color: white; 
    padding: 10px; 
    border-radius: 6px; 
    outline: none; 
    font-size: 14px;
  }

  button.add-btn { 
    background: rgba(0, 0, 0, 0.4); 
    border: none; 
    color: white; 
    padding: 10px 15px; 
    border-radius: 6px; 
    cursor: pointer; 
    font-weight: 600;
  }

  .board {
    display: flex;
    gap: 20px;
    width: 100%;
  }

  .column {
    flex: 1;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 15px;
    min-height: 300px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .action-btn { 
    background: rgba(255, 255, 255, 0.1); 
    border: none; 
    color: white; 
    font-size: 10px; 
    padding: 6px 10px; /* Slightly larger for easier clicking */
    border-radius: 4px; 
    cursor: pointer; /* This changes the cursor to the hand icon */
    transition: background 0.2s, transform 0.1s;
    display: inline-flex;
    align-items: center;
  }

  .action-btn:hover { 
    background: rgba(255, 255, 255, 0.25); 
    transform: translateY(-1px); /* Subtle lift effect */
  }

  .delete-btn:hover { 
    background: rgba(255, 59, 48, 0.4); /* Red tint on hover for delete */
    color: white;
  }

  /* ... keep card styles from previous version ... */
`;

// 4. Component View
export const render = (state, dispatch) => {
  const { columns = { todo: [], done: [] }, inputValue = "" } = state || {};

  const renderCard = (task, index, currentColumn) => (
    <div className="card" key={`${currentColumn}-${index}`}>
      {task}
      <div className="card-actions">
        {currentColumn !== 'todo' && (
          <button className="action-btn" onClick={() => dispatch({ type: 'MOVE_TASK', from: currentColumn, to: 'todo', index })}>⇠ Todo</button>
        )}
        {currentColumn === 'todo' && (
          <button className="action-btn" onClick={() => dispatch({ type: 'MOVE_TASK', from: 'todo', to: 'done', index })}>Done ⇢</button>
        )}
        <button className="action-btn delete-btn" onClick={() => dispatch({ type: 'REMOVE_TASK', column: currentColumn, index })}>✕</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="input-group">
        <input 
          type="text" 
          value={inputValue} 
          onChange={(e) => dispatch({ type: 'CHANGE_INPUT', value: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && dispatch({ type: 'ADD_TASK' })}
          placeholder="Add task to 'Todo'..."
        />
        <button className="add-btn" onClick={() => dispatch({ type: 'ADD_TASK' })}>Add</button>
      </div>

      <div className="board">
        <div className="column">
          <h3>To Do</h3>
          {columns.todo.map((task, i) => renderCard(task, i, 'todo'))}
        </div>
        <div className="column">
          <h3>Done</h3>
          {columns.done.map((task, i) => renderCard(task, i, 'done'))}
        </div>
      </div>
    </div>
  );
};