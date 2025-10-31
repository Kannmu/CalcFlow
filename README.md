# CalcFlow

Dynamic node-based calculator for composable math expressions, built with Vue.js. Create multiple calculation nodes, write expressions, reference other nodes by name, and see results update instantly with dependency tracking.

## Highlights

- Node-based UI for building complex calculations from simple parts
- Dependency graph with automatic recalculation of downstream nodes
- Circular dependency and self-reference detection with clear messages
- Syntax highlighting and LaTeX rendering of "expression = result" via KaTeX
- Smart autocomplete for functions, constants, and node names
- Workspace persistence to `localStorage`, plus JSON export/import
- Robust evaluation combining `mathjs` with a custom expression engine
- Clean keyboard workflow including parameter navigation inside functions

## Tech Stack

- Vue.js 3
- Vite
- KaTeX for LaTeX rendering
- mathjs plus a custom parser/evaluator for reliability and readability

## Installation

### Requirements

- Node.js 18 or later
- npm

### Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/Kannmu/CalcFlow.git
   ```
2. Navigate to the project directory:
   ```sh
   cd CalcFlow
   ```
3. Install dependencies:
   ```sh
   npm install
   ```

## Development & Build

- Start the dev server:
  ```sh
  npm run dev
  ```
  Default address: `http://localhost:5173`

- Build for production:
  ```sh
  npm run build
  ```

- Preview the production build:
  ```sh
  npm run preview
  ```

## Usage

- Add a node: click the `Add Node` button
- Rename a node: click the result header and edit (e.g., rename `Node1` to `R`)
- Write an expression: type math like `2 + 3 * 4`
- Reference other nodes: use their header name (e.g., `R / 5`)
- View results: right-side result updates in real time; top shows LaTeX for `expression = result`
- Delete a node: click the `X` button on the node
- Clean the workspace: use the `Clean` button in the top navigation
- Export the workspace: click `Export` to download `calcflow_workspace.json`
- Import a workspace: click `Import` and select a JSON file
- See supported operators/functions: click the `Instructions` button in the top navigation

## Autocomplete & Keyboard

- Suggestions appear for functions, constants, and existing node names when typing letters
- Use Arrow Up/Down to navigate; press `Enter` or `Tab` to apply the selection
- Inside function parentheses, press `Tab` to jump between the argument comma and the closing parenthesis
- Press `Escape` to close the suggestions

## Supported Math

- Operators: `+`, `-`, `*`, `/`, `%`, `^` (exponentiation is right-associative)
- Constant: `pi`
- Functions:
  - Single-argument: `sin(x)`, `cos(x)`, `tan(x)`, `asin(x)`, `acos(x)`, `atan(x)`, `ln(x)`, `sqrt(x)`
  - Two-argument: `pow(x, y)`, `log(x, y)` (logarithm base `y`)

## Numbers & Errors

- Results are rounded to 6 decimal places
- Long integers or many decimal digits are shown in scientific notation with 4 significant digits
- Invalid operations show `Error` (e.g., division by 0; negative input to `sqrt`; invalid params to `log`; nonpositive input to `ln`)
- Circular dependencies show `Circular Dependency`; self-references show `Self Reference`

## Examples

- `2 + 3 * 4`
- `pow(2, 10)`
- `log(8, 2)`
- `sqrt(3^2 + 4^2)`
- `R / 5` (assuming a node named `R` exists)

## Directory Overview

- `src/components/`: nodes, UI elements, canvas, LaTeX renderer, instruction panel
- `src/composables/`: autocomplete, highlighter, node calculation logic
- `src/math/`: expression parsing/evaluation and the math registry (operators, functions, constants)
- `src/utils.js`: node manager and common utilities
- `public/`: static assets

## License

No license specified yet. Add one to the repo if needed and update this section.