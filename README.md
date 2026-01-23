<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://zsweep.com">
    <img src="static/images/zee.png" alt="zsweep logo" width="80" height="80">
  </a>

<h3 align="center">zsweep</h3>

  <p align="center">
  <em>
    A minimalist, keyboard-centric Minesweeper experience designed for flow state.
  </em>
</p>

<p align="center">
  <a href="https://zsweep.com">
    <strong>▶ PLAY BETA</strong>
  </a>
</p>
<br />

<p align="center">
  <a href="https://github.com/oug-t/zsweep/issues/new?labels=bug&template=bug-report.md">
    Report Bug
  </a>
  &nbsp;·&nbsp;
  <a href="https://github.com/oug-t/zsweep/issues/new?labels=enhancement&template=feature-request.md">
    Request Feature
  </a>
</p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#features">Features</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

https://github.com/user-attachments/assets/6030f51b-11f3-4d0b-ab13-0e449c9b1b93

**zsweep** is a modern reimagining of Minesweeper, inspired by the "Monkeytype" aesthetic. It strips away the clutter of traditional Windows-95 clones to focus purely on speed, accuracy, and flow state.

Most Minesweeper clones are ugly, click-heavy, and lack detailed stats. zsweep fixes this by providing:

- **Keyboard-first navigation** (Tab to restart, Esc for commands).
- **Advanced metrics** like 3BV/s (Bechtel's Board Benchmark per second).
- **A "Time Mode"** that challenges you to solve as many grids as possible in 15/30/60 seconds.

Whether you are a competitive sweeper or just looking for a zen break, zsweep is designed to feel "just right."

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Built With

- [![Svelte][svelte-badge]][svelte-url]
- [![TailwindCSS][tailwind-badge]][tailwind-url]
- [![Supabase][supabase-badge]][supabase-url]
- [![TypeScript][ts-badge]][ts-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

To get a local copy up and running for development or contribution, follow these steps.

### Prerequisites

npm

```sh
  npm install npm@latest -g
```

### Installation

1. Clone the repo

```Bash
git clone https://github.com/oug-t/zsweep
```

2. Install packages

```Bash
npm install
```

3. Setup Environment Rename .env.example to .env.

```Bash
# If you don't have Supabase keys, the game will still run, but scores won't save.
```

4. Run the server

```Bash
npm run dev
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

### 🎮 Game Modes

- Time Mode: Clear as many grids as possible within a set time limit (15s, 30s, 60s).

- Standard Mode: Classic Minesweeper pacing and rules (9x9, 16x16, 30x16).

### 📊 Stats & Progression

- 3BV/s Tracking: Measures the theoretical difficulty of a board divided by time.

- Heatmap: Visualizes your activity over the last year (GitHub style).

- Estimated Mines Swept: Tracks your total career "damage."

### 🎨 Theming

- Built-in Command Palette (Cmd+K or Esc) to switch themes instantly.

- "Explosion" particle effects on game over.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

- We are actively looking for contributors!

- Contributions are what make the open source community such an amazing place to learn, inspire, and create. Whether you are fixing a typo, optimizing the 3BV algorithm, or adding a new theme, your help is greatly appreciated.

- 🏆 Contributor Perk: All contributors who have a PR merged will be listed on the "About" page as a gratidude.

- If you have a suggestion that would make this better:

### Fork the Project

- Create your Feature Branch (git checkout -b feature/AmazingFeature)

- Commit your Changes (git commit -m 'Add some AmazingFeature')

- Push to the Branch (git push origin feature/AmazingFeature)

- Open a Pull Request

- Good First Issues: Check out the Issues tab for tickets labeled good first issue if you are new to the codebase!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributors

Thanks to these wonderful people for helping improve zsweep:

- **[@flo-bit](https://github.com/flo-bit)** - Implemented the initial Chording logic (#27)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

Distributed under the AGPLv3 License.
See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Tommy Guo - tommyguo024@outlook.com

Project Link: https://github.com/oug-t/zsweep

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Acknowledgments

- Monkeytype for the visual inspiration and philosophy.

- Supabase for making the backend effortless.

- Lucide Icons for the beautiful SVG set.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->

[contributors-shield]: https://img.shields.io/github/contributors/oug-t/zsweep.svg?style=flat
[contributors-url]: https://github.com/oug-t/zsweep/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/oug-t/zsweep.svg?style=flat
[forks-url]: https://github.com/oug-t/zsweep/network/members
[stars-shield]: https://img.shields.io/github/stars/oug-t/zsweep.svg?style=flat
[stars-url]: https://github.com/oug-t/zsweep/stargazers
[issues-shield]: https://img.shields.io/github/issues/oug-t/zsweep.svg?style=flat
[issues-url]: https://github.com/oug-t/zsweep/issues
[license-shield]: https://img.shields.io/github/license/oug-t/zsweep.svg?style=flat
[license-url]: https://github.com/oug-t/zsweep/blob/main/LICENSE

<!-- Badges -->

[svelte-badge]: https://img.shields.io/badge/Svelte-FF3E00?style=flat&logo=svelte&logoColor=white
[tailwind-badge]: https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white
[supabase-badge]: https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white
[ts-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white

<!-- Links -->

[svelte-url]: https://svelte.dev
[tailwind-url]: https://tailwindcss.com
[supabase-url]: https://supabase.com
[ts-url]: https://www.typescriptlang.org
