// UI Examples showing how to use the universal heading and card functions
// This file demonstrates the new universal UI utilities

/**
 * Example 1: Simple header usage
 * Creates just a card header with customizable styling
 */
function createSimpleHeaderExample() {
    const headerHtml = createUniversalHeader({
        title: 'Create Course Announcements',
        subtitle: 'Add multiple announcements to a course at once',
        icon: 'bi-megaphone',
        variant: 'primary'
    });

    // Use this header in your form HTML
    const formHtml = `
        <div class="card">
            ${headerHtml}
            <div class="card-body">
                <!-- Your form content goes here -->
            </div>
        </div>
    `;

    return formHtml;
}

/**
 * Example 2: Complete card with progress and results
 * Creates a full card structure with progress tracking
 */
function createCompleteCardExample() {
    const bodyContent = `
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label fw-bold" for="course-id">
                    <i class="bi bi-book me-1"></i>Course ID
                </label>
                <input type="text" class="form-control" id="course-id" 
                       placeholder="Enter course ID" />
            </div>
            <div class="col-md-6 d-flex align-items-end">
                <div class="d-grid w-100">
                    <button class="btn btn-success" type="button">
                        <i class="bi bi-plus-circle me-2"></i>Create Items
                    </button>
                </div>
            </div>
        </div>
    `;

    const completeCardHtml = createUniversalCard({
        title: 'Create Canvas Items',
        subtitle: 'Create multiple items with advanced options',
        icon: 'bi-plus-circle',
        variant: 'success',
        bodyContent: bodyContent,
        progressId: 'create-items',
        includeProgress: true,
        includeResults: true
    });

    return completeCardHtml;
}

/**
 * Example 3: Different color variants
 */
function showColorVariants() {
    const variants = [
        { variant: 'primary', title: 'Primary Action', icon: 'bi-gear' },
        { variant: 'success', title: 'Create Operation', icon: 'bi-plus-circle' },
        { variant: 'danger', title: 'Delete Operation', icon: 'bi-trash' },
        { variant: 'warning', title: 'Warning Action', icon: 'bi-exclamation-triangle' },
        { variant: 'info', title: 'Information', icon: 'bi-info-circle' },
        { variant: 'secondary', title: 'Secondary Action', icon: 'bi-arrow-right' }
    ];

    return variants.map(({ variant, title, icon }) =>
        createUniversalHeader({
            title: title,
            subtitle: `Example of ${variant} variant styling`,
            icon: icon,
            variant: variant
        })
    ).join('\n');
}

/**
 * Example 4: Usage in existing renderer pattern
 * Shows how to integrate with current form creation patterns
 */
function modernAnnouncementForm() {
    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#modern-announcements-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'modern-announcements-form';

        // Using the universal card function
        form.innerHTML = createUniversalCard({
            title: 'Create Course Announcements',
            subtitle: 'Add multiple announcements to a course at once',
            icon: 'bi-megaphone',
            variant: 'primary',
            bodyContent: `
                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <label class="form-label fw-bold" for="course-id">
                            <i class="bi bi-book me-1"></i>Course ID
                        </label>
                        <input type="text" class="form-control" id="course-id" 
                               placeholder="Enter course ID (e.g., 12345)" />
                        <div class="form-text text-danger d-none" id="course-validation">
                            <i class="bi bi-exclamation-triangle me-1"></i>Course ID must be a positive number
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold" for="num-items">
                            <i class="bi bi-hash me-1"></i>Number of Announcements
                        </label>
                        <input type="number" class="form-control" id="num-items" 
                               placeholder="How many announcements?" min="1" max="100" />
                    </div>
                </div>
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="d-grid">
                            <button type="button" class="btn btn-success" id="create-btn">
                                <i class="bi bi-plus-circle me-2"></i>Create Announcements
                            </button>
                        </div>
                    </div>
                </div>
            `,
            progressId: 'announcements',
            includeProgress: true,
            includeResults: true
        });

        eContent.append(form);
    }

    form.hidden = false;
    return form;
}

// Export examples for use
window.UIExamples = {
    createSimpleHeaderExample,
    createCompleteCardExample,
    showColorVariants,
    modernAnnouncementForm
};