# CalcFlow

A dynamic and interactive node-based calculator built with Vue.js. CalcFlow allows you to create complex calculations by linking nodes together, with automatic updates for dependent calculations.

## Features

-   **Node-Based Interface**: Create and manage individual calculation nodes.
-   **Dynamic Expressions**: Each node has an expression that can include numbers, mathematical operators, and references to other nodes.
-   **Dependency Graph**: Nodes can reference the results of other nodes, creating a dependency graph.
-   **Automatic Recalculation**: Changes in a node's expression or value automatically trigger updates in all dependent nodes.
-   **Circular Dependency Detection**: Prevents infinite loops by detecting circular references between nodes.
-   **Simple and Intuitive UI**: A clean and easy-to-use interface for managing your calculations.

## Tech Stack

-   **Vue.js 3**: The core framework used for building the user interface.
-   **Vite**: The build tool for a fast development experience.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   Node.js (v18.x or higher)
-   npm

### Installation

1.  Clone the repository:
    ```sh
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```sh
    cd CalcFlow
    ```
3.  Install the dependencies:
    ```sh
    npm install
    ```

### Running the Application

To start the development server, run the following command:

```sh
npm run dev
```

This will start the application on a local server, usually at `http://localhost:5173`.

## How to Use

1.  **Add a Node**: Click the "Add Node" button to create a new calculation node.
2.  **Name a Node**: Each node has a header (e.g., "Node1"). You can edit this header to give it a unique name.
3.  **Write Expressions**: In the input field of a node, you can write mathematical expressions (e.g., `10 * 2`).
4.  **Reference Other Nodes**: To use the result of another node, simply type its header name into an expression (e.g., `Node1 / 5`).
5.  **View Results**: The result of the expression is calculated and displayed in real-time.
6.  **Delete a Node**: Click the 'X' button on a node to delete it.
