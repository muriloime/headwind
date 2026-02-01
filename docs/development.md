# Development Guide

This document describes how to set up your environment to develop and test the Headwind extension locally.

## Prerequisites

- [Node.js](https://nodejs.org/) (check [package.json](../package.json) for engine requirements)
- [Visual Studio Code](https://code.visualstudio.com/)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/muriloime/headwind.git
   cd headwind
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Open in VS Code:**
   ```bash
   code .
   ```

## Running the Extension Locally

To test the extension while developing:

1. Press `F5` in VS Code or go to the **Run and Debug** view and click **Run Extension**.
2. This will open a new **Extension Development Host** window.
3. In the new window, open a project that uses Tailwind CSS (e.g., has a `tailwind.config.js` and some `.html`, `.haml`, or `.js` files).
4. Verify the extension's behavior by saving a file or running the `Headwind: Sort Tailwind CSS Classes` command from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

## Running Tests

We use [Jest](https://jestjs.io/) for testing.

- **Run all tests:**
  ```bash
  npm test
  ```
- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```
- **Run tests with coverage:**
  ```bash
  npm run test:coverage
  ```

## Linting

To ensure code quality, run the linter:
```bash
npm run lint
```

## Compiling

The extension is written in TypeScript. VS Code usually handles compilation automatically when debugging, but you can also run:
```bash
npm run compile
```
Or use the watch mode:
```bash
npm run watch
```
