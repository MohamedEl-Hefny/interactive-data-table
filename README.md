# Interactive Data Table

A responsive front-end application that fetches and displays data from a public API in an interactive table.
The project demonstrates data fetching, search, sorting, pagination, and CRUD operations with a clean and user-friendly interface.

## Authentication

This app requires the user to be logged in to access the data table. If `currentUser` is not found in `localStorage`, the user will be redirected to the login page.

## Live Demo

[View Demo](https://interactive-data-table-virid.vercel.app)

## Features

- Fetch data from public API (https://api.publicapis.org/entries)
- Display data in a responsive, styled table
- Search functionality (filter results by keyword)
- Sorting (click column headers to sort ascending/descending)
- Pagination (choose records per page: 5, 10, 20, etc.)
- Add new rows (form-based entry)
- Edit existing rows (inline or modal editing)
- Delete rows (remove entries from the table)
- Responsive design (mobile, tablet, desktop support)
- Error handling (graceful handling of API errors & invalid input)
- Fallback to local resources.json if the public API is unavailable, ensuring the table still renders offline.
- User authentication (must be logged in to access the table)
- Automatic logout detection across browser tabs

## Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript (no frameworks)
- **Deployment:** Vercel (or any static hosting)

## Project Structure

```
interactive-data-table/
├─ CSS/
│  ├─ auth.css          # Styles for login/auth pages
│  └─ style.css         # General styles for the app
├─ JS/
│  ├─ app.js            # Main app logic (table, CRUD, chart, etc.)
│  └─ auth.js           # Login/logout/auth logic
├─ app.html             # Main table page (requires login)
├─ login.html           # Login page
├─ README.md            # Project documentation
└─ resources.json       # Mock JSON for offline testing
```

## Getting Started

### Usage

1. Open the login page (`login.html`) and enter credentials.
2. After successful login, you will be redirected to the data table (`index.html`).
3. If you delete the current user from localStorage or log out, the page will automatically redirect to the login page.

### Logout

To log out, remove the `currentUser` item from `localStorage` or use a logout button if implemented. The table page will detect this change and redirect you to the login page.

### Prerequisites

- Node.js not required (pure HTML/JS project)
- A modern browser (Chrome, Edge, Firefox, Safari)

### Installation & Running Locally

```bash
# Clone the repository
git clone https://github.com/MohamedEl-Hefny/interactive-data-table.git

# Open the project folder
cd interactive-data-table

# Open index.html in your browser
```

### Serve with a local dev server

```bash
# Install a simple server
npm install -g serve

# Run locally
serve .

```

## Design Decisions

### Why Vanilla JS ?

The assignment explicitly required HTML, CSS, and native JavaScript to showcase fundamental skills without relying on frameworks.

### Architecture Highlights

- Separation of concerns (HTML for structure, CSS for styling, JS for logic)
- Reusable functions for search, sort, pagination, and CRUD
- Graceful fallback if API is unavailable (optional local mock JSON)
- Responsive table design with media queries

## Future Improvements

- Replace static CRUD with real backend persistence
- Add column filters (dropdown filtering by category/auth type)
- Data visualization (charts for categories)
