# Bookshelf SPA

A responsive single-page application for browsing and submitting reading list entries. Built with HTML, Bootstrap 5 and vanilla JavaScript as part of a technical exercise demonstrating Azure Static Web Apps deployment.

## Live Demo

- **SPA:** https://icy-smoke-023496c03.7.azurestaticapps.net
- **API (Swagger):** https://bookshelf-api-smphoon-b2d2bdf8abfecse8.ukwest-01.azurewebsites.net/swagger

## Tech Stack

- **UI Framework:** Bootstrap 5 (CDN)
- **Language:** Vanilla JavaScript (ES6+)
- **Icons:** Bootstrap Icons (CDN)
- **Hosting:** Azure Static Web Apps (free tier)

## Features

- **Add books** via a clean form (Title, Author, Genre, Status, Notes)
- **Search** by title, author or genre with a minimum 3-character threshold
- **Contains / Equals** search mode dropdown
- **Sortable grid** — click any column header to sort, click again to toggle direction
- **Server-side pagination** — configurable page size (5, 10, 20)
- **Responsive layout** — works on desktop and mobile via Bootstrap grid

## Design Decisions

**Bootstrap + Vanilla JS over a full framework**
The exercise is intended to take a couple hours of time and not meant to be complex. Bootstrap handles responsive layout with zero custom CSS. Vanilla JS keeps the bundle minimal with no build toolchain. The entire app is three files deployable as static assets.

**Server-side filtering and pagination**
Search, sort and pagination are all delegated to the API. This means the approach scales to any dataset size. The SPA never loads more records than the current page. Client-side filtering would break down at scale.

**Debounced search**
A 400ms debounce on the search input prevents an API call on every keystroke. The 3-character minimum and the debounce are complementary. The minimum reduces noise, the debounce reduces request volume.

**Central state object**
All UI state (search term, mode, sort column, direction, page, page size) lives in a single `state` object. Every user interaction updates state and calls `loadBooks()` — there is no risk of UI elements getting out of sync.

**XSS protection**
All user-generated content is passed through `escapeHtml()` before being injected into `innerHTML`, preventing script injection via book titles or notes.

**Contains vs Equals**
A dropdown next to the search box lets the user switch between `LIKE '%keyword%'` (contains) and exact match `=` (equals). The mode is passed to the API as a query parameter, the SQL WHERE clause is built server-side based on the mode value.

## Local Development

### Prerequisites
- VS Code with Live Server extension
- Bookshelf API running locally

### Setup

1. Clone the repository
2. Open `app.js` and update `API_BASE` to your local API URL:

```javascript
const API_BASE = 'https://localhost:{port}/api';
```

3. Right-click `index.html` → Open with Live Server

## Deployment

Hosted on Azure Static Web Apps (free tier), connected to the Bookshelf API on Azure App Service.