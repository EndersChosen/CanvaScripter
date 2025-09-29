function sisImportsTemplate(e) {
    switch (e.target.id) {
        case 'create-single-sis-file':
            createSingleSISFile(e);
            break;
        case 'create-bulk-sis-files':
            createBulkSISFiles(e);
            break;
        default:
            break;
    }
}

// Helper function to create consistent error display for user search operations
function createErrorCard(failedItems, operationType = 'user search') {
    if (!failedItems || failedItems.length === 0) return '';

    const errorCount = failedItems.length;
    const errorText = errorCount === 1 ? 'error' : 'errors';
    const errorCardId = `error-details-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let errorHTML = `
        <div class="card mt-3">
            <div class="card-header" style="cursor: pointer;" data-bs-toggle="collapse" data-bs-target="#${errorCardId}" aria-expanded="false">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 text-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error Details (${errorCount} ${errorText})
                    </h6>
                    <i class="bi bi-chevron-down"></i>
                </div>
            </div>
            <div class="collapse" id="${errorCardId}">
                <div class="card-body">
    `;

    failedItems.forEach((failedItem, index) => {
        const errorTitle = failedItem.isNetworkError ? 'Network Error' :
            failedItem.status ? `HTTP Error ${failedItem.status}` : 'Unknown Error';

        let errorDetail = '';
        if (failedItem.isNetworkError) {
            if (failedItem.reason.includes('ENOTFOUND') || failedItem.reason.includes('getaddrinfo')) {
                errorDetail = 'Cannot reach the server. Check your Canvas domain - make sure it\'s spelled correctly and doesn\'t include "https://".';
            } else {
                errorDetail = 'Network connection problem. Check your internet connection and Canvas domain.';
            }
        } else if (failedItem.status) {
            switch (failedItem.status) {
                case 401:
                    errorDetail = 'Authentication failed. Check your API token.';
                    break;
                case 403:
                    errorDetail = 'Access forbidden. Check permissions or wait if rate limited.';
                    break;
                case 404:
                    errorDetail = 'User not found or Canvas domain incorrect.';
                    break;
                case 422:
                    errorDetail = 'Invalid search parameters. Check your search term.';
                    break;
                default:
                    errorDetail = `Server returned error ${failedItem.status}.`;
                    break;
            }
        } else {
            errorDetail = 'Unknown error occurred during user search.';
        }

        const itemLabel = errorCount === 1 ? '' : ` - Search ${index + 1}`;
        errorHTML += `
            <div class="border-start border-danger border-3 ps-3 mb-3">
                <h6 class="text-danger mb-2">${errorTitle}${itemLabel}</h6>
                <p class="mb-2"><strong>Error:</strong> <code>${failedItem.reason || 'Unknown error'}</code></p>
                <p class="mb-0 text-muted">${errorDetail}</p>
            </div>
        `;
    });

    errorHTML += `
                </div>
            </div>
        </div>
    `;

    return errorHTML;
}

async function createSingleSISFile(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createSISForm = eContent.querySelector('#create-single-sis-form');

    if (!createSISForm) {
        createSISForm = document.createElement('form');
        createSISForm.id = 'create-single-sis-form';
        createSISForm.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
