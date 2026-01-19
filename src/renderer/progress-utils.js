// Global utility functions for progress bars with percent labels
// This file is loaded once in index.html and provides utilities to all renderer files

window.ProgressUtils = {
    enhanceProgressBarWithPercent: function (progressBar) {
        if (!progressBar) return null;

        // Always work with the progress container (parent) for the overlay label
        const progressContainer = progressBar.parentElement;
        if (!progressContainer) return null;

        // Ensure container is positioned for absolute overlay
        if (!progressContainer.style.position) {
            progressContainer.style.position = 'relative';
        }

        // Find existing labels in the container, reuse first, remove extras
        const existing = progressContainer.querySelectorAll('.progress-percent');
        let percentLabel = existing[0] || null;
        if (existing.length > 1) {
            for (let i = 1; i < existing.length; i++) {
                existing[i].remove();
            }
        }

        if (!percentLabel) {
            // Create percent label element
            percentLabel = document.createElement('span');
            percentLabel.className = 'progress-percent';
            percentLabel.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #fff;
                font-weight: bold;
                font-size: 14px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                z-index: 1;
            `;
            percentLabel.textContent = '0%';
            progressContainer.appendChild(percentLabel);
        }

        return percentLabel;
    },

    updateProgressWithPercent: function (progressBar, percent) {
        if (!progressBar) return;

        // Update the width as usual
        progressBar.style.width = `${percent}%`;

        // Update or create the percent label
        const percentLabel = window.ProgressUtils.enhanceProgressBarWithPercent(progressBar);
        if (percentLabel) {
            percentLabel.textContent = `${Math.round(percent)}%`;
        }
    },

    // Attach a progress handler to a specific progress container
    // opts: { container: Element|String, barSelector?: String, infoSelector?: String }
    attachGlobalProgressListener: function (opts = {}) {
        const container = typeof opts.container === 'string'
            ? document.querySelector(opts.container)
            : (opts.container || document);

        if (!container) return () => { };

        // avoid double-binding on same container
        if (container.dataset && container.dataset.progressAttached === '1') {
            return () => { };
        }

        const barSel = opts.barSelector || '.progress-bar';
        const infoSel = opts.infoSelector || '.progress-info, #progress-info';

        const getNodes = () => {
            const bar = container.querySelector(barSel);
            // try multiple common info selectors
            let info = container.querySelector(infoSel);
            if (!info) info = container.querySelector('#daig-progress-info');
            if (!info) info = container.querySelector('.progress-info');
            const wrap = container.closest('#progress-div') || container;
            return { bar, info, wrap };
        };

        const handler = (_e, msg) => {
            const { bar, info, wrap } = getNodes();
            if (!bar || !wrap) return;
            if (wrap.hidden !== undefined) wrap.hidden = false;

            // Back-compat: if msg is a number, treat as percent
            if (typeof msg === 'number') {
                bar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                window.ProgressUtils.updateProgressWithPercent(bar, msg);
                if (info) info.textContent = `${Math.round(msg)}%`;
                return;
            }

            const mode = msg?.mode || 'determinate';
            if (mode === 'indeterminate') {
                bar.classList.add('progress-bar-striped', 'progress-bar-animated');
                bar.style.width = '100%';
                if (info) {
                    const count = (msg && typeof msg.processed === 'number') ? ` (${msg.processed})` : '';
                    info.textContent = msg?.label ? `${msg.label}${count}` : `Processing${count}`;
                }
            } else if (mode === 'determinate') {
                bar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                const value = Math.max(0, Math.min(1, Number(msg?.value || 0)));
                window.ProgressUtils.updateProgressWithPercent(bar, value * 100);
                if (info) {
                    const pct = Math.round(value * 100);
                    if (typeof msg?.processed === 'number' && typeof msg?.total === 'number') {
                        info.textContent = `Processed ${msg.processed}/${msg.total} (${pct}%)`;
                    } else {
                        info.textContent = `${pct}%`;
                    }
                }
            } else if (mode === 'done') {
                bar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                bar.style.width = '100%';
                if (info) info.textContent = 'Done';
                setTimeout(() => { if (wrap.hidden !== undefined) wrap.hidden = true; }, 800);
            }
        };

        // Subscribe via preload-exposed API if present, else noop
        const unsubscribe = (window.progressAPI && window.progressAPI.onUpdateProgress)
            ? window.progressAPI.onUpdateProgress((payload) => handler(null, payload))
            : null;

        if (container.dataset) container.dataset.progressAttached = '1';

        // Return a detach function
        return () => {
            if (typeof unsubscribe === 'function') {
                try { unsubscribe(); } catch { }
            }
            if (container.dataset) delete container.dataset.progressAttached;
        };
    },

    // Auto-wire any existing and future progress containers (#progress-div)
    autoWireGlobalProgress: function () {
        const wireAll = () => {
            const nodes = document.querySelectorAll('#progress-div');
            nodes.forEach((n) => {
                window.ProgressUtils.attachGlobalProgressListener({ container: n });
            });
        };

        // initial pass
        wireAll();

        // observe future additions
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                m.addedNodes && m.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) return;
                    if (node.id === 'progress-div') {
                        window.ProgressUtils.attachGlobalProgressListener({ container: node });
                    } else {
                        const nested = node.querySelectorAll ? node.querySelectorAll('#progress-div') : [];
                        nested.forEach((n) => window.ProgressUtils.attachGlobalProgressListener({ container: n }));
                    }
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    },

    /**
     * Creates a universal card header with consistent styling
     * @param {Object} options - Configuration object
     * @param {string} options.title - The main title text (required)
     * @param {string} options.subtitle - Descriptive subtitle text (optional)
     * @param {string} options.icon - Bootstrap icon class (optional, e.g., 'bi-megaphone')
     * @param {string} options.variant - Color variant ('primary'|'secondary'|'success'|'danger'|'warning'|'info'|'light'|'dark')
     * @returns {string} HTML string for the card header
     */
    createUniversalHeader: function (options = {}) {
        const {
            title = 'Canvas API Request',
            subtitle = '',
            icon = 'bi-gear',
            variant = 'primary'
        } = options;

        // Ensure icon starts with 'bi-'
        const iconClass = icon.startsWith('bi-') ? icon : `bi-${icon}`;

        // Generate header HTML
        return `
            <div class="card-header bg-${variant} text-white">
                <h3 class="card-title mb-0">
                    <i class="${iconClass} me-2"></i>${title}
                </h3>
                ${subtitle ? `<small class="text-light">${subtitle}</small>` : ''}
            </div>
        `;
    },

    /**
     * Creates a complete card structure with header, body, progress, and results sections
     * @param {Object} options - Configuration object  
     * @param {string} options.title - The main title text (required)
     * @param {string} options.subtitle - Descriptive subtitle text (optional)
     * @param {string} options.icon - Bootstrap icon class (optional)
     * @param {string} options.variant - Color variant (optional, defaults to 'primary')
     * @param {string} options.bodyContent - Content for the card body (optional)
     * @param {string} options.progressId - ID prefix for progress elements (optional)
     * @param {boolean} options.includeProgress - Whether to include progress card (default: true)
     * @param {boolean} options.includeResults - Whether to include results card (default: true)
     * @returns {string} Complete HTML structure for the card
     */
    createUniversalCard: function (options = {}) {
        const {
            title = 'Canvas API Request',
            subtitle = '',
            icon = 'bi-gear',
            variant = 'primary',
            bodyContent = '',
            progressId = 'request',
            includeProgress = true,
            includeResults = true
        } = options;

        const header = this.createUniversalHeader({ title, subtitle, icon, variant });

        let html = `
            <div class="card">
                ${header}
                <div class="card-body">
                    ${bodyContent}
                </div>
            </div>
        `;

        if (includeProgress) {
            html += `
            <!-- Progress Card -->
            <div class="card mt-3" id="${progressId}-progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Processing Request
                    </h5>
                </div>
                <div class="card-body">
                    <p id="${progressId}-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 15px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             id="${progressId}-progress-bar" style="width: 0%" 
                             role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted" id="${progressId}-progress-detail"></small>
                </div>
            </div>
            `;
        }

        if (includeResults) {
            html += `
            <!-- Results Card -->
            <div class="card mt-3" id="${progressId}-results-card" hidden>
                <div class="card-body" id="${progressId}-response-container"></div>
            </div>
            `;
        }

        return html;
    }
};

// For convenience, create global aliases
window.enhanceProgressBarWithPercent = window.ProgressUtils.enhanceProgressBarWithPercent;
window.updateProgressWithPercent = window.ProgressUtils.updateProgressWithPercent;
window.createUniversalHeader = window.ProgressUtils.createUniversalHeader;
window.createUniversalCard = window.ProgressUtils.createUniversalCard;
