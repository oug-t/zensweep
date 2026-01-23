import type { Cell } from '$lib/minesweeper';

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
	| { type: 'START_SEARCH' }
	| { type: 'NEXT_MATCH' }
	| { type: 'PREV_MATCH' }
	| null;

export function handleVimKey(key: string): VimAction {
	if (/^[1-9]$/.test(key)) return { type: 'DIGIT', value: key };

	switch (key) {
		case '0':
			return { type: 'ZERO' };
		case '_':
			return { type: 'START_ROW' };

		case '/':
			return { type: 'START_SEARCH' };
		case 'n':
			return { type: 'NEXT_MATCH' };
		case 'N':
			return { type: 'PREV_MATCH' };

		case 'h':
		case 'ArrowLeft':
			return { type: 'MOVE_CURSOR', dx: -1, dy: 0 };
		case 'j':
		case 'ArrowDown':
			return { type: 'MOVE_CURSOR', dx: 0, dy: 1 };
		case 'k':
		case 'ArrowUp':
			return { type: 'MOVE_CURSOR', dx: 0, dy: -1 };
		case 'l':
		case 'ArrowRight':
			return { type: 'MOVE_CURSOR', dx: 1, dy: 0 };

		case 'w':
			return { type: 'NEXT_UNREVEALED' };
		case 'b':
			return { type: 'PREV_UNREVEALED' };

		case 'i':
		case 'Enter':
			return { type: 'REVEAL' };
		case ' ':
			return { type: 'SMART' };
		case 'f':
			return { type: 'FLAG' };

		case '$':
			return { type: 'MOVE_CURSOR', dx: 999, dy: 0 };
		case 'G':
			return { type: 'GO_BOTTOM' };
		case 'g':
			return { type: 'GO_TOP' };

		default:
			return null;
	}
}

/**
 * Calculates the destination of complex Vim motions (w, b, }, {)
 * which depend on the grid state (finding the next unrevealed cell).
 */
export function calculateVimJump(
	key: string,
	multiplier: number,
	cursor: { r: number; c: number },
	grid: Cell[][],
	rows: number,
	cols: number
): { r: number; c: number } | null {
	let { r, c } = cursor;
	let jumps = multiplier;

	// 'w' -> Jump forward to next unrevealed cell
	if (key === 'w') {
		while (jumps > 0) {
			c++;
			if (c >= cols) {
				c = 0;
				r++;
			}
			let loops = 0;
			const maxLoops = rows * cols;
			// Scan until we find a closed cell or hit the end
			while (r < rows && loops < maxLoops) {
				if (grid[r]?.[c] && !grid[r][c].isOpen) break;
				c++;
				if (c >= cols) {
					c = 0;
					r++;
				}
				loops++;
			}
			jumps--;
		}
		if (r < rows) return { r, c };
	}

	// 'b' -> Jump backward to previous unrevealed cell
	if (key === 'b') {
		while (jumps > 0) {
			c--;
			if (c < 0) {
				c = cols - 1;
				r--;
			}
			let loops = 0;
			const maxLoops = rows * cols;
			while (r >= 0 && loops < maxLoops) {
				if (grid[r]?.[c] && !grid[r][c].isOpen) break;
				c--;
				if (c < 0) {
					c = cols - 1;
					r--;
				}
				loops++;
			}
			jumps--;
		}
		if (r >= 0) return { r, c };
	}

	// '}' -> Jump DOWN to next row that has unrevealed cells
	if (key === '}') {
		while (jumps > 0) {
			if (r >= rows - 1) break;
			r++;
			let found = false;
			while (r < rows) {
				// Scan row Left->Right for first closed cell
				for (let i = 0; i < cols; i++) {
					if (grid[r]?.[i] && !grid[r][i].isOpen) {
						c = i;
						found = true;
						break;
					}
				}
				if (found) break;
				r++;
			}
			jumps--;
		}
		if (r < rows) return { r, c };
	}

	// '{' -> Jump UP to previous row that has unrevealed cells
	if (key === '{') {
		while (jumps > 0) {
			if (r <= 0) break;
			r--;
			let found = false;
			while (r >= 0) {
				// Scan row Right->Left (to land on last unrevealed? or first? usually standard vim is vague here, we scan R->L)
				for (let i = cols - 1; i >= 0; i--) {
					if (grid[r]?.[i] && !grid[r][i].isOpen) {
						c = i;
						found = true;
						break;
					}
				}
				if (found) break;
				r--;
			}
			jumps--;
		}
		if (r >= 0) return { r, c };
	}

	return null;
}
