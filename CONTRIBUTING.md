# Contributing to zsweep

First off, thanks for taking the time to contribute! 🎉

zsweep is a community-driven project, and we love receiving contributions from our users. Whether it's a bug fix, new theme, or a 3BV algorithm optimization, your help is welcome.

## How to Contribute

### 1. Fork & Clone

- Fork the repository on GitHub.
- Clone your fork locally:

```bash
git clone [https://github.com/YOUR_USERNAME/zsweep.git](https://github.com/YOUR_USERNAME/zsweep.git)
```

### 2. Install Dependencies

zsweep uses SvelteKit and Supabase.

```bash
npm install
```

Note: You will need a local .env file with your own Supabase credentials to run the full app. See README.md for details.

### 3. Create a Branch

- Always work on a new branch, not main.

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/squash-bug
```

### 4. Coding Standards

- Formatting: We use Prettier. Please run npm run format before committing.

- Linting: Ensure there are no errors by running npm run lint.

- Commits: Write clear, concise commit messages (e.g., feat: add nord theme or fix: calculation error in stats).

### 5. Submit a Pull Request

- Push your branch to your fork.

- Open a Pull Request against the main branch of zsweep.

- Describe your changes clearly. If it fixes a bug, link the issue number.

- Legal
- By contributing to zsweep, you agree that your contributions will be licensed under its GNU AGPLv3 License.
