# Restaurant Server

## Overview
This project is a Node.js and TypeScript-based server for managing restaurant operations. It provides APIs for analytics, categories, employees, floor layout, food, materials, orders, printers, restaurant details, and tables.

## Features
- Analytics and reporting
- Category management
- Employee management
- Floor layout management
- Food item management
- Materials inventory
- Order processing
- Printer integration
- Restaurant information
- Table management

## Technologies
- Node.js
- TypeScript
- Express (if used)
- MongoDB (via Mongoose)

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/riadfadila1988-stack/restaurant-server.git
   ```
2. Navigate to the project directory:
   ```
   cd restaurant-server
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage
- To start the server:
  ```
  npm start
  ```
- For development with auto-reload (if configured):
  ```
  npm run dev
  ```

## Folder Structure
- `src/` - Source code
  - `modules/` - Feature modules (analytics, categories, employees, etc.)
  - `core/` - Core controllers and middlewares
  - `config/` - Configuration files (e.g., mongoose)
  - `types/` - Type definitions
  - `utils/` - Utility functions
- `scripts/` - Utility scripts for maintenance and migration
- `dist/` - Compiled output (after build)

## Scripts
- `scripts/fix-duplicate-order-item-ids.js` - Fixes duplicate order item IDs.
- `scripts/run-migration.js` - Runs database migrations.

## License
Specify your license here (e.g., MIT).

