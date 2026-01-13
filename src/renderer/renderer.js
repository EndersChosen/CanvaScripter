// renderer.js - Main renderer process script
console.log('Renderer process loaded');

// Global functions that all renderer scripts depend on
function hideEndpoints(e) {
    // Hide all endpoint forms when switching between different requests
    const endpointContent = document.querySelector('#endpoint-content');
    if (endpointContent) {
        // Check if the AI Assistant button was clicked
        const isAIAssistantClick = e && e.target && e.target.id === 'ai-assistant-open';

        // Hide all existing forms and divs
        // Only exclude ai-assistant-container if AI Assistant button was clicked
        Array.from(endpointContent.children).forEach(child => {
            if (isAIAssistantClick && child.id === 'ai-assistant-container') {
                // Keep AI Assistant visible when AI Assistant button is clicked
                return;
            }
            child.hidden = true;
        });

        // Remove active state from all sidebar buttons
        const activeButtons = document.querySelectorAll('.list-group-item.active');
        activeButtons.forEach(button => button.classList.remove('active'));

        // Add active state to the clicked button
        if (e && e.target) {
            e.target.classList.add('active');
        }
    }
}

function errorHandler(error, progressInfo, container = null) {
    console.error(error);

    // Extract status code from error message
    const statusCode = error.message.match(/(?<=status code )[0-9]+/);
    const statusNum = statusCode ? parseInt(statusCode[0]) : null;

    // Detect network errors
    const isNetworkError = !statusNum && (
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('network error') ||
        error.message.includes('getaddrinfo')
    );

    let errorTitle = 'Request Failed';
    let errorInfo = '';

    if (isNetworkError) {
        errorTitle = 'Network Connection Error';
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            errorInfo = 'Cannot reach the server. Check your Canvas domain - make sure it\'s spelled correctly and doesn\'t include "https://" (e.g., use "myschool.instructure.com" not "https://myschool.instructure.com").';
        } else if (error.message.includes('ECONNREFUSED')) {
            errorInfo = 'Connection refused by server. The Canvas domain may be incorrect or the server may be down.';
        } else if (error.message.includes('ETIMEDOUT')) {
            errorInfo = 'Connection timed out. Check your internet connection or try again later.';
        } else {
            errorInfo = 'Network error occurred. Check your internet connection and Canvas domain.';
        }
    } else if (statusNum) {
        errorTitle = `HTTP Error ${statusNum}`;
        switch (statusNum) {
            case 400:
                errorInfo = 'Bad request. Check that all required fields are filled out correctly.';
                break;
            case 401:
                errorInfo = 'Authentication failed. Check your API token - it may be invalid or expired.';
                if (document.querySelector('#user-id')) {
                    errorInfo += ' Also verify the User ID is correct.';
                }
                break;
            case 403:
                errorInfo = 'Access forbidden. You may not have permission for this action, or you may be hitting rate limits. Wait a moment and try again.';
                break;
            case 404:
                errorInfo = 'Resource not found. Check your inputs to make sure they exist and you have access to it.';
                break;
            case 422:
                errorInfo = 'Validation error. One or more fields contain invalid data. Check your input values.';
                break;
            case 429:
                errorInfo = 'Too many requests. You\'re being rate limited. Wait a few minutes before trying again.';
                break;
            case 500:
                errorInfo = 'Internal server error. This is a Canvas server issue - try again in a few minutes.';
                break;
            case 502:
                errorInfo = 'Bad gateway. Canvas servers may be experiencing issues. Try again later.';
                break;
            case 503:
                errorInfo = 'Service unavailable. Canvas may be down for maintenance. Check Canvas status and try again later.';
                break;
            case 504:
                errorInfo = 'Gateway timeout. The request took too long. Try again or reduce the number of items being processed.';
                break;
            default:
                errorInfo = `Unexpected HTTP error (${statusNum}). If this persists, contact your Canvas administrator or technical support.`;
                break;
        }
    } else {
        errorTitle = 'Unknown Error';
        errorInfo = 'An unexpected error occurred. Check the console for more details, or contact technical support if this persists.';
    }

    // Extract the most relevant part of the error message
    const lastIndex = error.message.lastIndexOf(':');
    const errorMessage = lastIndex > 0 ? error.message.slice(lastIndex + 1).trim() : error.message;

    // If a container is provided, create a professional error card
    if (container) {
        const errorCardId = `error-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const errorCard = document.createElement('div');
        errorCard.className = 'card mt-3';
        errorCard.innerHTML = `
            <div class="card-header">
                <h6 class="mb-0 text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${errorTitle}
                </h6>
            </div>
            <div class="card-body">
                <div class="alert alert-danger mb-0" role="alert">
                    <p class="mb-2"><strong>Error:</strong> <code>${errorMessage}</code></p>
                    <p class="mb-0">${errorInfo}</p>
                </div>
            </div>
        `;

        // Clear progress info and append to container
        if (progressInfo) progressInfo.innerHTML = '';
        container.appendChild(errorCard);
    } else {
        // Fallback to the original method for backward compatibility
        progressInfo.innerHTML += `
            <div class="alert alert-danger" role="alert">
                <h6 class="alert-heading mb-2">${errorTitle}</h6>
                <p class="mb-2"><strong>Error:</strong> <code>${errorMessage}</code></p>
                <p class="mb-0">${errorInfo}</p>
            </div>
        `;
    }
}

// Helper function to show loading state
function showLoadingState(container, message = 'Loading...') {
    if (container) {
        container.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 200px;">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="mt-2">${message}</div>
                </div>
            </div>
        `;
    }
}

// Helper function to show error state
function showErrorState(container, error, operation = 'operation') {
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h6 class="alert-heading">Error during ${operation}</h6>
                <p class="mb-0">${error}</p>
            </div>
        `;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded');

    // Initialize sidebar functionality
    initializeSidebar();

    // Initialize search functionality with enhanced filtering
    initializeSearch();

    // Initialize domain validation
    initializeDomainValidation();

    // Initialize context menu functionality
    initializeContextMenu();

    // Sort categories alphabetically on load
    setTimeout(sortCategoriesAlphabetically, 100);

    // Enable tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

function initializeSidebar() {
    // Handle sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainRow = document.getElementById('main-row');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            const isHidden = sidebar.style.display === 'none';
            const icon = sidebarToggle.querySelector('i');
            if (isHidden) {
                sidebar.style.display = 'block';
                icon.className = 'bi bi-chevron-double-left';
                sidebarToggle.title = 'Hide menu';
            } else {
                sidebar.style.display = 'none';
                icon.className = 'bi bi-chevron-double-right';
                sidebarToggle.title = 'Show menu';
            }
        });
    }

    // Add event listeners to endpoint buttons
    const endpointButtons = document.querySelectorAll('.list-group-item');
    endpointButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            console.log('Button clicked:', e.target.id);

            // Route to appropriate handler based on the button's parent accordion
            const accordionParent = e.target.closest('.accordion-collapse');
            if (accordionParent) {
                const accordionId = accordionParent.id;
                console.log('Accordion ID:', accordionId);
                routeEndpointRequest(e, accordionId);
            } else {
                console.warn('No accordion parent found for button:', e.target.id);
            }
        });
    });
}

function routeEndpointRequest(e, category) {
    // Normalize category name to handle underscore/hyphen differences and special cases
    let normalizedCategory = category.replace(/_/g, '-');

    // Handle special case mappings
    if (normalizedCategory === 'commchannel') {
        normalizedCategory = 'comm-channels';
    }

    // Route requests to appropriate template functions
    switch (normalizedCategory) {
        case 'assignments':
            if (typeof assignmentTemplate === 'function') {
                assignmentTemplate(e);
            }
            break;
        case 'assignment-groups':
            if (typeof assignmentGroupTemplate === 'function') {
                assignmentGroupTemplate(e);
            }
            break;
        case 'users':
            if (typeof userTemplate === 'function') {
                userTemplate(e);
            }
            break;
        case 'conversations':
            if (typeof conversationTemplate === 'function') {
                conversationTemplate(e);
            }
            break;
        case 'comm-channels':
            if (typeof commChannelTemplate === 'function') {
                commChannelTemplate(e);
            }
            break;
        case 'courses':
            if (typeof courseTemplate === 'function') {
                courseTemplate(e);
            }
            break;
        case 'quizzes':
            if (typeof quizTemplate === 'function') {
                quizTemplate(e);
            }
            break;
        case 'modules':
            if (typeof moduleTemplate === 'function') {
                moduleTemplate(e);
            }
            break;
        case 'discussions':
            if (typeof discussionTemplate === 'function') {
                discussionTemplate(e);
            }
            break;
        case 'announcements':
            if (typeof announcementTemplate === 'function') {
                announcementTemplate(e);
            }
            break;
        case 'pages':
            if (typeof pagesTemplate === 'function') {
                pagesTemplate(e);
            }
            break;
        case 'sections':
            if (typeof sectionsTemplate === 'function') {
                sectionsTemplate(e);
            }
            break;
        case 'sis-imports':
            if (typeof sisImportsTemplate === 'function') {
                sisImportsTemplate(e);
            }
            break;
        case 'imports':
            if (typeof importsTemplate === 'function') {
                importsTemplate(e);
            }
            break;
        case 'analyzers':
            // Check which analyzer button was clicked
            const buttonId = e.target.id;
            if (buttonId === 'upload-har' && typeof harAnalyzerTemplate === 'function') {
                harAnalyzerTemplate(e);
            } else if (buttonId === 'analyze-qti' && typeof qtiAnalyzerTemplate === 'function') {
                qtiAnalyzerTemplate(e);
            }
            break;
        case 'ai-assistant':
            if (typeof aiAssistantTemplate === 'function') {
                aiAssistantTemplate(e);
            }
            break;
        default:
            console.warn('No template function found for category:', normalizedCategory);
            break;
    }
}

function initializeSearch() {
    const searchInput = document.getElementById('endpoint-search');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            filterAndSearchContent(searchTerm);
        });
    }
}

function filterAndSearchContent(searchTerm) {
    // Get all accordion sections
    const accordions = document.querySelectorAll('.accordion-item');

    accordions.forEach(accordion => {
        const buttons = accordion.querySelectorAll('.list-group-item');
        let hasVisibleButtons = false;

        // Filter buttons within this accordion
        buttons.forEach(button => {
            const buttonText = button.textContent.toLowerCase();
            const shouldShow = buttonText.includes(searchTerm);
            button.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) {
                hasVisibleButtons = true;
            }
        });

        // Hide the entire accordion if no buttons match the search
        const accordionHeader = accordion.querySelector('.accordion-header');
        const accordionCollapse = accordion.querySelector('.accordion-collapse');

        if (hasVisibleButtons || searchTerm === '') {
            accordion.style.display = 'block';
            // If there's a search term and matches, expand the accordion
            if (searchTerm !== '' && hasVisibleButtons) {
                if (accordionCollapse && !accordionCollapse.classList.contains('show')) {
                    accordionCollapse.classList.add('show');
                }
            }
        } else {
            accordion.style.display = 'none';
        }
    });
}

function sortCategoriesAlphabetically() {
    const accordionContainer = document.querySelector('.accordion');
    if (!accordionContainer) return;

    const accordionItems = Array.from(accordionContainer.children);

    // Sort accordion items by their header text
    accordionItems.sort((a, b) => {
        const titleA = a.querySelector('.accordion-button')?.textContent.trim().toLowerCase() || '';
        const titleB = b.querySelector('.accordion-button')?.textContent.trim().toLowerCase() || '';
        return titleA.localeCompare(titleB);
    });

    // Reorder the elements in the DOM
    accordionItems.forEach(item => {
        accordionContainer.appendChild(item);
    });
}

function initializeDomainValidation() {
    const domainInput = document.getElementById('domain');
    const tokenInput = document.getElementById('token');

    if (domainInput) {
        // Only validate on input (no cleaning while typing)
        domainInput.addEventListener('input', validateDomainOnly);

        // Clean and validate ONLY when user leaves the field
        domainInput.addEventListener('blur', validateAndCleanDomain);

        // Remove the paste event handler - let paste show as-is until blur
    }

    if (tokenInput) {
        tokenInput.addEventListener('input', validateDomainAndToken);
        tokenInput.addEventListener('blur', validateDomainAndToken);
    }
}

function validateDomainOnly() {
    // Just validate without cleaning - allows typing anything
    const domainInput = document.getElementById('domain');
    const tokenInput = document.getElementById('token');

    if (!domainInput || !tokenInput) return;

    const domain = domainInput.value.trim();
    const token = tokenInput.value.trim();

    // For live validation while typing, be more lenient
    // Allow slashes and other URL characters while typing
    const domainValid = domain.length > 0;
    const tokenValid = token.length > 0;

    // Only show invalid styling if it's clearly not a valid format
    const definitelyInvalid = domain.length > 0 && (
        domain.includes(' ') ||
        domain.includes('\n') ||
        domain.includes('\t')
    );

    domainInput.classList.toggle('is-invalid', definitelyInvalid);
    domainInput.classList.remove('is-valid'); // Don't show valid while typing

    tokenInput.classList.toggle('is-invalid', token.length > 0 && !tokenValid);
    tokenInput.classList.toggle('is-valid', tokenValid);

    // Store the validation state
    window.formValidation = { domainValid, tokenValid, allValid: domainValid && tokenValid };

    return domainValid && tokenValid;
}

function validateAndCleanDomain() {
    // Clean the domain and then validate
    const domainInput = document.getElementById('domain');

    if (!domainInput) return;

    let domain = domainInput.value.trim();

    // Clean and extract domain from various URL formats
    const cleanedDomain = cleanDomainInput(domain);

    // Update the input field if the domain was cleaned
    if (cleanedDomain !== domain) {
        domainInput.value = cleanedDomain;
    }

    // Now do full validation
    validateDomainAndToken();
}

function validateDomainAndToken() {
    const domainInput = document.getElementById('domain');
    const tokenInput = document.getElementById('token');

    if (!domainInput || !tokenInput) return;

    let domain = domainInput.value.trim();
    const token = tokenInput.value.trim();

    // Clean and extract domain from various URL formats
    const cleanedDomain = cleanDomainInput(domain);

    // Update the input field if the domain was cleaned
    if (cleanedDomain !== domain) {
        domainInput.value = cleanedDomain;
        domain = cleanedDomain;
    }

    // Validate domain format
    const domainValid = /^[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9]$/.test(domain) && domain.length > 0;
    const tokenValid = token.length > 0;

    // Update input styling
    domainInput.classList.toggle('is-invalid', domain.length > 0 && !domainValid);
    domainInput.classList.toggle('is-valid', domainValid);

    tokenInput.classList.toggle('is-invalid', token.length > 0 && !tokenValid);
    tokenInput.classList.toggle('is-valid', tokenValid);

    // Enable/disable form elements based on validation
    const allValid = domainValid && tokenValid;

    // Store the validation state for use by other functions
    window.formValidation = { domainValid, tokenValid, allValid };

    return allValid;
}

function cleanDomainInput(input) {
    if (!input || typeof input !== 'string') return '';

    let cleaned = input.trim();

    // Remove common protocols
    cleaned = cleaned.replace(/^https?:\/\//, '');

    // Remove common Canvas URL patterns and paths (more flexible matching)
    cleaned = cleaned.replace(/\/accounts[\/\.].*$/, ''); // handles /accounts/ or /accounts.
    cleaned = cleaned.replace(/\/courses\/.*$/, '');
    cleaned = cleaned.replace(/\/api\/.*$/, '');
    cleaned = cleaned.replace(/\/login\/.*$/, '');
    cleaned = cleaned.replace(/\/users\/.*$/, '');
    cleaned = cleaned.replace(/\/me.*$/, ''); // handles /me or /me/
    cleaned = cleaned.replace(/\/profile.*$/, '');
    cleaned = cleaned.replace(/\/dashboard.*$/, '');
    cleaned = cleaned.replace(/\/calendar.*$/, '');
    cleaned = cleaned.replace(/\/grades.*$/, '');
    cleaned = cleaned.replace(/\/discussion_topics.*$/, '');
    cleaned = cleaned.replace(/\/assignments.*$/, '');
    cleaned = cleaned.replace(/\/quizzes.*$/, '');
    cleaned = cleaned.replace(/\/modules.*$/, '');
    cleaned = cleaned.replace(/\/files.*$/, '');
    cleaned = cleaned.replace(/\/pages.*$/, '');
    cleaned = cleaned.replace(/\/announcements.*$/, '');
    cleaned = cleaned.replace(/\/conferences.*$/, '');
    cleaned = cleaned.replace(/\/collaborations.*$/, '');
    cleaned = cleaned.replace(/\/settings.*$/, '');
    cleaned = cleaned.replace(/\/statistics.*$/, '');
    cleaned = cleaned.replace(/\/external_tools.*$/, '');

    // Remove any path that starts with / (catch-all for remaining paths)
    cleaned = cleaned.replace(/\/.*$/, '');

    // Remove www. prefix if present
    cleaned = cleaned.replace(/^www\./, '');

    // Handle port numbers (remove them for Canvas domains)
    if (cleaned.includes('.instructure.com')) {
        cleaned = cleaned.replace(/:\d+/, '');
    }

    // Remove any remaining query parameters or fragments
    cleaned = cleaned.split('?')[0];
    cleaned = cleaned.split('#')[0];

    return cleaned;
}

function initializeContextMenu() {
    console.log('Initializing Electron context menu...');

    // Add right-click context menu functionality using Electron's native menu
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault(); // Prevent the default browser context menu

        // Send message to main process to show context menu
        if (window.menus && window.menus.rightclick) {
            window.menus.rightclick();
        }
    });

    // Listen for context menu commands from main process
    if (window.menus && window.menus.onMenuCommand) {
        window.menus.onMenuCommand((data) => {
            console.log('Context menu command received:', data);

            const { command } = data;

            switch (command) {
                case 'cut':
                    document.execCommand('cut');
                    break;
                case 'copy':
                    document.execCommand('copy');
                    break;
                case 'paste':
                    document.execCommand('paste');
                    break;
                default:
                    console.log('Unknown context menu command:', command);
            }
        });
    }
}

// Handle any uncaught errors in the renderer
window.addEventListener('error', function (e) {
    console.error('Renderer error:', e.error);
});

window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
});