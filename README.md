# Zsweep

**Zsweep** is a minimalist, customizable Minesweeper experience designed for focus and productivity. Inspired by modern minimalist tools, it provides a clean, distraction-free environment to track your progress and refine your sweeping skills.

---

## Core Features

### 🎮 Game Modes
- **Time Mode**: Clear as many grids as possible within a time limit.
- **Standard Mode**: Traditional Minesweeper pacing and rules.

### 🎨 Customization
- Fully themeable UI via an integrated command palette.

### 📊 Progress Tracking
- Integrated with **Supabase** to save your sweep history, including:
  - Accuracy
  - Total cells cleared
  - Time spent

### 🧘 Minimalist Design
- Built with **SvelteKit** and **Tailwind CSS** for a fast, responsive, and aesthetic experience.

---

## Keybinds

Efficiency is at the heart of Zsweep. You can navigate almost the entire app without a mouse:

| Key      | Action                                                                 |
|----------|------------------------------------------------------------------------|
| `Tab`    | Restart a sweep (Home) / Return to Home (About)                         |
| `Esc`    | Open Command Palette / Search Themes                                    |
| `Space`  | Toggle flag on hovered cell / Attempt chord                             |
| `Arrows` | Navigate menus and palettes                                             |

---

## Stats Explained

- **Accuracy**  
  The percentage of safe cells clicked without hitting a mine or placing incorrect flags.

- **Cells Swept**  
  The total volume of safe grid space successfully cleared across your sessions.

- **Time**  
  The total duration spent actively sweeping on a single grid.

---

## Design Inspiration & Appreciation

Zsweep’s visual language and philosophy draw inspiration from **Monkeytype**.  
Special appreciation goes to the Monkeytype project for demonstrating how thoughtful minimalism, strong typography, and keyboard-first interaction can create a focused and enjoyable user experience. Zsweep adapts these ideas into a Minesweeper context while maintaining its own identity.

---

## Tech Stack

- **Framework**: SvelteKit  
- **Database / Auth**: Supabase  
- **Styling**: Tailwind CSS  
- **Icons**: Lucide Svelte  

---

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/oug-t/zsweep.git

