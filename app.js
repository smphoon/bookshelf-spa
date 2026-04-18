// ========================================================================================
// Configuration
// ========================================================================================

// In production this would be an environment variable injected by Azure Static Web Apps.
// For demo purposes the base URL is defined here.
const API_BASE = 'http://localhost:5190/api';

// ========================================================================================
// State
// Central state object — all UI reflects this.
// When state changes, call loadBooks() to re-fetch and re-render. No stale local copies.
// ========================================================================================
const state = {
    search: '',
    searchMode: 'contains',     // 'contains' || 'equals'
    sortBy: 'CreatedDateTime',
    sortDirection: 'desc',
    page: 1,
    pageSize: 5,
    totalPages: 1,
    totalCount: 0
};

// ========================================================================================
// API
// ========================================================================================

async function loadBooks() {
    const tbody = document.getElementById('books-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-4">
                Loading...
            </td>
        </tr>`;

    // Build query string from current state.
    // Only include search if it meets the 3-char minimum     
    const params = new URLSearchParams({
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
        page: state.page,
        pageSize: state.pageSize,
        searchMode: state.searchMode
    });

    if (state.search.length >= 3) {
        params.append('search', state.search);
    }

    try {
        const response = await fetch(`${API_BASE}/books?${params}`);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        // Update state with server response
        state.totalPages = data.totalPages;
        state.totalCount = data.totalCount;

        renderTable(data.items);
        renderPagination();
        renderResultCount();
        renderSortIndicators();

    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
                    Failed to load books. Please try again.
                </td>
            </tr>`;
        console.error('loadBooks error:', err);
    }
}

async function addBook() {
    const title  = document.getElementById('input-title').value.trim();
    const author = document.getElementById('input-author').value.trim();
    const genre  = document.getElementById('input-genre').value.trim();
    const status = document.getElementById('input-status').value;
    const notes  = document.getElementById('input-notes').value.trim();

    const errorEl = document.getElementById('form-error');

    // Client-side validation 
    // mirrors the [Required] annotations on BookRequest.cs
    if (!title || !author || !genre) {
        errorEl.textContent = 'Title, Author and Genre are required.';
        errorEl.classList.remove('d-none');
        return;
    }

    errorEl.classList.add('d-none');

    try {
        const response = await fetch(`${API_BASE}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, genre, status, notes: notes || null })
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        // Clear form on success
        ['input-title','input-author','input-genre','input-notes']
            .forEach(id => document.getElementById(id).value = '');
        document.getElementById('input-status').value = 'Want to Read';

        // Reset to page 1 and reload to show new record
        state.page = 1;
        await loadBooks();

    } catch (err) {
        errorEl.textContent = 'Failed to add book. Please try again.';
        errorEl.classList.remove('d-none');
        console.error('addBook error:', err);
    }
}

// ==========================================================================================
// Render Functions
// ==========================================================================================

function renderTable(books) {
    const tbody = document.getElementById('books-tbody');

    if (!books || books.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    No books found.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = books.map(book => `
        <tr>
            <td>${escapeHtml(book.title)}</td>
            <td>${escapeHtml(book.author)}</td>
            <td>${escapeHtml(book.genre)}</td>
            <td>${renderStatusBadge(book.status)}</td>
            <td class="text-muted small">${book.notes ? escapeHtml(book.notes) : '—'}</td>
            <td class="text-muted small">${formatDate(book.createdDateTime)}</td>
            <td class="text-muted small">${formatDate(book.modifiedDateTime)}</td>
        </tr>
    `).join('');
}

function renderStatusBadge(status) {
    // Visual encoding, make grid easier to scan in a glance
    const map = {
        'Completed':     'success',
        'Reading':       'primary',
        'Want to Read':  'secondary'
    };
    const colour = map[status] ?? 'secondary';
    return `<span class="badge bg-${colour}">${escapeHtml(status)}</span>`;
}

function renderPagination() {
    const container = document.getElementById('pagination-controls');
    const info      = document.getElementById('pagination-info');

    const start = ((state.page - 1) * state.pageSize) + 1;
    const end   = Math.min(state.page * state.pageSize, state.totalCount);
    info.textContent = state.totalCount > 0
        ? `Showing ${start}–${end} of ${state.totalCount} records`
        : '';

    // Build page number buttons.
    // Cap visible page buttons to 5 to avoid overflow on small screens.
    let pages = [];

    pages.push(makePaginationItem('&laquo;', state.page - 1, state.page === 1));

    const maxVisible = 5;
    let startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
    let endPage   = Math.min(state.totalPages, startPage + maxVisible - 1);

    // Adjust window if near the end
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(makePaginationItem(i, i, false, i === state.page));
    }

    pages.push(makePaginationItem('&raquo;', state.page + 1, state.page === state.totalPages));

    container.innerHTML = pages.join('');

    // Attach click handlers to page buttons
    container.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', () => {
            const target = parseInt(el.dataset.page);
            if (target >= 1 && target <= state.totalPages) {
                state.page = target;
                loadBooks();
            }
        });
    });
}

function makePaginationItem(label, page, disabled, active = false) {
    return `
        <li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${page}">${label}</a>
        </li>`;
}

function renderResultCount() {
    const el = document.getElementById('result-count');
    const modeLabel = state.searchMode === 'equals' ? 'equal to' : 'containing';
    el.textContent = state.search.length >= 3
        ? `${state.totalCount} result${state.totalCount !== 1 ? 's' : ''} ${modeLabel} "${state.search}"`
        : `${state.totalCount} total record${state.totalCount !== 1 ? 's' : ''}`;
}

function renderSortIndicators() {
    // Reset all sort icons first
    document.querySelectorAll('.sortable .sort-icon').forEach(icon => {
        icon.className = 'bi bi-arrow-down-up sort-icon';
    });

    // Highlight active sort column
    const activeHeader = document.querySelector(
        `.sortable[data-col="${state.sortBy}"] .sort-icon`
    );
    if (activeHeader) {
        activeHeader.className = state.sortDirection === 'asc'
            ? 'bi bi-arrow-up sort-icon text-warning'
            : 'bi bi-arrow-down sort-icon text-warning';
    }
}

// ==========================================================================================
// Utility Functions
// ==========================================================================================

// Prevent XSS — always escape user-generated
// content before injecting into innerHTML
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// Debounce — delays execution until user stops typing for 400 ms.
// Prevents API call on every single keystroke.
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// =================================================================================
// Event Listeners
// =================================================================================

// Search — debounced 400ms, minimum 3 characters
const handleSearch = debounce((value) => {
    // Only trigger if 3+ chars or if clearing the search
    if (value.length === 0 || value.length >= 3) {
        state.search = value;
        state.page = 1;     // Reset to first page on new search
        loadBooks();
    }
}, 400);

document.getElementById('search-input')
    .addEventListener('input', e => handleSearch(e.target.value));

// Sort — clicking a column header toggles
// direction if same column, resets to desc if new column
document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (state.sortBy === col) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortBy = col;
            state.sortDirection = 'desc';
        }
        state.page = 1;
        loadBooks();
    });
});

// Page size change resets to page 1
document.getElementById('page-size-select')
    .addEventListener('change', e => {
        state.pageSize = parseInt(e.target.value);
        state.page = 1;
        loadBooks();
    });

// Search mode change reset to page 1 and reload
document.getElementById('search-mode-select')
    .addEventListener('change', e => {
        state.searchMode = e.target.value;
        state.page = 1;
        // Only reload if search is already active
        if (state.search.length >= 3) {
            loadBooks();
        }
    });    

// Add book button
document.getElementById('btn-add')
    .addEventListener('click', addBook);

// =================================================================================
// Init — load books on page ready
// =================================================================================
loadBooks();