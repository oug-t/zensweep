// src/lib/game/input/vim.ts
// vim actions are processed in routes/+page.svelte
export type VimAction = 
  | { type: 'MOVE_CURSOR'; dx: number; dy: number }
  | { type: 'REVEAL' }      
  | { type: 'FLAG' }        
  | { type: 'SMART' }       
  | { type: 'DIGIT'; value: string } 
  | { type: 'ZERO' }
  | { type: 'GO_TOP' }      
  | { type: 'GO_BOTTOM' }   
  | { type: 'START_ROW' }       
  | { type: 'NEXT_UNREVEALED' } 
  | { type: 'PREV_UNREVEALED' }
  | { type: 'NEXT_UNREVEALED_VERTICAL' }
  | { type: 'PREV_UNREVEALED_VERTICAL' }
  | { type: 'START_SEARCH' }    
  | { type: 'NEXT_MATCH' }      
  | { type: 'PREV_MATCH' }      
  | null;

export function handleVimKey(key: string): VimAction {
  if (/^[1-9]$/.test(key)) return { type: 'DIGIT', value: key };

  switch (key) {
    case '0': return { type: 'ZERO' };
    case '_': return { type: 'START_ROW' };

    // --- SEARCH ---
    case '/': return { type: 'START_SEARCH' };
    case 'n': return { type: 'NEXT_MATCH' };
    case 'N': return { type: 'PREV_MATCH' };

    // --- MOVEMENT (WASD Removed) ---
    case 'h': case 'ArrowLeft':  return { type: 'MOVE_CURSOR', dx: -1, dy: 0 };
    case 'j': case 'ArrowDown':  return { type: 'MOVE_CURSOR', dx: 0, dy: 1 };
    case 'k': case 'ArrowUp':    return { type: 'MOVE_CURSOR', dx: 0, dy: -1 };
    case 'l': case 'ArrowRight': return { type: 'MOVE_CURSOR', dx: 1, dy: 0 };
    
    // --- SKIPS ---
    case 'w': return { type: 'NEXT_UNREVEALED' };
    case 'b': return { type: 'PREV_UNREVEALED' };

    // --- VERTICAL UNREVEALED MOVEMENT ---
    case '{': return { type: 'PREV_UNREVEALED_VERTICAL' };  
    case '}': return { type: 'NEXT_UNREVEALED_VERTICAL' };

    // --- ACTIONS ---
    case 'i': case 'Enter': return { type: 'REVEAL' };
    case ' ': return { type: 'SMART' };
    case 'f': return { type: 'FLAG' };
    
    // --- ADVANCED MOTIONS ---
    case '$': return { type: 'MOVE_CURSOR', dx: 999, dy: 0 };  
    case 'G': return { type: 'GO_BOTTOM' }; 
    case 'g': return { type: 'GO_TOP' };    
    
    default: return null;
  }
}
