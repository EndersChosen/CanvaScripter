function quizTemplate(e) {
    switch (e.target.id) {
        case 'create-classic-quiz':
            createQuiz(e);
            break;
        case 'delete-classic-quizzes':
            deleteAllClassicQuizzes(e);
            break;
        case 'get-respondus-quizzes':
            getRespondusQuizzes(e);
            break;
        case 'add-nq-questions':
            addQuestionsNQ(e);
            break;
        case 'create-new-quiz':
            createNewQuiz(e);
            break;
        default:
            break;
    }
}

async function createQuiz(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createQuizForm = eContent.querySelector('#create-quiz-form');

    if (!createQuizForm) {
        createQuizForm = document.createElement('form');
        createQuizForm.id = 'create-quiz-form';
        createQuizForm.innerHTML = `
            <style>
                #create-quiz-form .card-title { font-size: 1.1rem; }
                #create-quiz-form .card-header small { font-size: 0.7rem; }
                #create-quiz-form .form-label, #create-quiz-form .form-check-label { font-size: 0.85rem; }
                #create-quiz-form .form-text { font-size: 0.7rem; }
                #create-quiz-form .card-body { padding: 0.75rem; }
                #create-quiz-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #create-quiz-form .form-control, #create-quiz-form .form-select { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-quiz-form .bi { font-size: 0.9rem; }
                #create-quiz-form .mt-3, #create-quiz-form .mt-2 { margin-top: 0.5rem !important; }
                #create-quiz-form .g-3 { gap: 0.5rem !important; }
                #create-quiz-form .progress { height: 12px; }
                #create-quiz-form h5 { font-size: 1rem; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-ui-checks me-1"></i>Create Course Quizzes (Classic)
                    </h3>
                    <small class="text-muted">Quizzes are created with a default of unlimited attempts. If you feel you need more control over quiz settings let Caleb know.</small>
                </div>
                <div class="card-body">
            <div class="row">
                <div class="row align-items-center">
                        <div class="col-2">
                            <label class="form-label">Course</label>
                            <input id="course-id" type="number" class="form-control form-control-sm" aria-describedby="input-checker" />
                        </div>
                    <div class="col-2">
                        <label class="form-label">How many</label>
                        <input id="quiz-number" type="number" class="form-control form-control-sm" value="1">
                    </div>
                    <div class="col-4">
                        <label class="form-label" for="quiz-name">Quiz Name (optional)</label>
                        <input id="quiz-name" type="text" class="form-control form-control-sm" placeholder="e.g., Unit 1 Check">
                    </div>
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <hr class="mt-2">
                <div class="row">
                    <div>
                        <h5>Type</h5>
                        <select id="quiz-type" class="form-select form-select-sm col-auto custom-select-width">
                            <option value="practice_quiz" selected>Practice</option>
                            <option value="assignment" selected>Graded</option>
                            <option value="survey">Survey</option>
                            <option value="graded_survey">Graded Survey</option>
                        </select>
                    </div>
                    
                    <div id="quiz-settings" class="mt-2">
                        <h5>Settings</h5>
                        <div class="col-auto form-check form-switch" >
                            <input id="quiz-publish" class="form-check-input" type="checkbox" role="switch" checked>
                            <label for="quiz-publish" class="form-check-label">Publish</label>
                        </div>
                    </div>           
                    <div id="question-types" class="mt-2">
                        <h5>Questions</h5>
                        <div class="row g-3 align-items-end">
                            <div class="col-6">
                                <label for="cq-question-type" class="form-label">Question type</label>
                                <select id="cq-question-type" class="form-select form-select-sm">
                                    <option value="text_only_question">Text (no points)</option>
                                    <option value="true_false_question">True/False</option>
                                    <option value="short_answer_question">Fill in the Blank</option>
                                    <option value="essay_question">Essay</option>
                                    <option value="file_upload_question">File Upload</option>
                                    <option value="fill_in_multiple_blanks_question">Fill in multiple blanks</option>
                                    <option value="matching_question">Matching</option>
                                    <option value="multiple_answers_question">Multiple Answers</option>
                                    <option value="multiple_choice_question">Multiple Choice</option>
                                    <option value="multiple_dropdowns_question">Multiple Dropdowns</option>
                                    <option value="numerical_question">Numerical</option>
                                    <option value="calculated_question">Formula</option>
                                </select>
                            </div>
                            <div class="col-3">
                                <label for="cq-question-qty" class="form-label">Quantity</label>
                                <input id="cq-question-qty" type="number" min="1" class="form-control form-control-sm" placeholder="e.g., 3">
                            </div>
                            <div class="col-auto">
                                <button type="button" class="btn btn-sm btn-secondary" id="cq-question-add">Add/Update</button>
                                <button type="button" class="btn btn-sm btn-link" id="cq-question-clear">Clear all</button>
                            </div>
                        </div>
                        <div id="cq-question-summary" class="form-text mt-1"></div>
                    </div>           
                </div>
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="action-btn" class="btn btn-sm btn-primary mt-2" disabled>Create</button>
                </div>
            </div>
            <div hidden id="create-cq-progress-div">
                <p id="create-cq-progress-info"></p>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="create-cq-response-container" class="mt-2">
            </div>
        `;

        eContent.append(createQuizForm);
    }
    createQuizForm.hidden = false;

    // Attach listeners only once to avoid duplicate submissions when reopening this view
    if (createQuizForm.dataset.bound !== 'true') {
        const courseID = createQuizForm.querySelector('#course-id');
        const numOfQuizzes = createQuizForm.querySelector('#quiz-number');

        const qTypeSel = createQuizForm.querySelector('#cq-question-type');
        const qQtyInput = createQuizForm.querySelector('#cq-question-qty');
        const qAddBtn = createQuizForm.querySelector('#cq-question-add');
        const qClearBtn = createQuizForm.querySelector('#cq-question-clear');
        const qSummary = createQuizForm.querySelector('#cq-question-summary');

        const createBtn = createQuizForm.querySelector('#action-btn');

        const selectedQuestions = new Map(); // type -> qty

        const isPositiveInt = (v) => {
            const n = Number(v);
            return Number.isInteger(n) && n > 0;
        };

        function refreshCreateEnabled() {
            const okCourse = isPositiveInt(courseID.value.trim());
            const okQuizNum = isPositiveInt(numOfQuizzes.value.trim());
            const hasQuestions = selectedQuestions.size > 0;
            createBtn.disabled = !(okCourse && okQuizNum && hasQuestions);
        }

        function renderSummary() {
            if (selectedQuestions.size === 0) {
                qSummary.textContent = 'No question types selected';
            } else {
                const parts = [];
                for (const [type, qty] of selectedQuestions.entries()) {
                    const label = qTypeSel.querySelector(`option[value="${type}"]`)?.textContent || type;
                    parts.push(`${label} x ${qty}`);
                }
                qSummary.textContent = `Selected: ${parts.join(', ')}`;
            }
            refreshCreateEnabled();
        }

        qAddBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = qTypeSel.value;
            const qty = qQtyInput.value.trim();
            if (!isPositiveInt(qty)) return;
            selectedQuestions.set(type, Number(qty));
            renderSummary();
        });

        qClearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            selectedQuestions.clear();
            renderSummary();
        });

        courseID.addEventListener('input', refreshCreateEnabled);
        numOfQuizzes.addEventListener('input', refreshCreateEnabled);
        qQtyInput.addEventListener('input', (e) => {
            // no-op except possibly enabling add button in future
        });
        renderSummary();
        createBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // guard against double-clicks
            createBtn.disabled = true;

            const responseContainer = createQuizForm.querySelector('#create-cq-response-container');

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const course_id = courseID.value.trim();
            const quiz_type = createQuizForm.querySelector('#quiz-type').value;
            const quiz_name = createQuizForm.querySelector('#quiz-name')?.value.trim();
            const publish = createQuizForm.querySelector('#quiz-publish').checked;
            const num_quizzes = numOfQuizzes.value.trim();

            // Build question types from selections
            const questionTypes = Array.from(selectedQuestions.entries()).map(([name, qty]) => ({
                name,
                enabled: true,
                number: String(qty)
            }));

            const progressDiv = createQuizForm.querySelector('#create-cq-progress-div');
            const progressBar = progressDiv.querySelector('.progress-bar');
            const progressInfo = createQuizForm.querySelector('#create-cq-progress-info');

            // clean environment
            progressDiv.hidden = false;
            // Remove duplicate percent labels, keep only one in the progress container
            const progressContainer = progressBar.parentElement;
            if (progressContainer) {
                progressContainer.style.position = 'relative';
                const labels = progressContainer.querySelectorAll('.progress-percent');
                for (let i = 1; i < labels.length; i++) labels[i].remove();
            }
            window.ProgressUtils.updateProgressWithPercent(progressBar, 0);
            progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
            progressInfo.innerHTML = '';

            // Step helpers
            const setBar = (percent) => window.ProgressUtils.updateProgressWithPercent(progressBar, percent);
            const appendLine = (text) => {
                const span = document.createElement('span');
                span.textContent = text;
                progressInfo.appendChild(span);
                progressInfo.appendChild(document.createElement('br'));
                return span;
            };
            const replaceLine = (el, text) => { if (el) el.textContent = text; };

            // Build selected question types list for sub-step messaging
            const selectedTypes = Array.from(selectedQuestions.entries())
                .filter(([, qty]) => Number(qty) > 0)
                .map(([type, qty]) => ({ type, qty }));
            const typeLabel = (t) => {
                const opt = qTypeSel.querySelector(`option[value="${t}"]`);
                return opt ? opt.textContent : t;
            };

            const data = {
                domain,
                token,
                course_id,
                quiz_type,
                publish,
                num_quizzes,
                quiz_name,
                questionTypes
            };

            try {
                // Step 1: Creating quizzes
                let step1Line = appendLine('Step 1: Creating quizzes...');
                let step2Line; // will be set before creating questions
                let activeRun = true;
                setBar(0);
                // Map backend progress to 0-25%
                if (window.progressAPI && window.progressAPI.onUpdateProgress) {
                    window.progressAPI.onUpdateProgress((msg) => {
                        if (!activeRun || !msg || typeof msg !== 'object') return;
                        if (msg.label === 'Creating quizzes' && typeof msg.processed === 'number' && typeof msg.total === 'number' && msg.total > 0) {
                            const pct = (msg.processed / msg.total) * 25;
                            replaceLine(step1Line, `Step 1: Creating quizzes... ${msg.processed}/${msg.total}`);
                            setBar(pct);
                        } else if (msg.label === 'Creating questions' && typeof msg.processed === 'number' && typeof msg.total === 'number' && msg.total > 0) {
                            // Step 2 progress mapped to 25-75%
                            const pct = 25 + (msg.processed / msg.total) * 50;
                            if (step2Line) replaceLine(step2Line, `Step 2: Creating Questions... ${msg.processed}/${msg.total}`);
                            setBar(pct);
                        }
                    });
                }

                // returns the IDs of the quizzes created
                const createQuizzesResponse = await window.axios.createClassicQuizzes(data);
                if (createQuizzesResponse.successful.length > 0) {
                    replaceLine(step1Line, `Step 1: Created ${createQuizzesResponse.successful.length} quizzes.`);
                    setBar(25);

                    // get the quiz ids from the createQuizzesResponse.successful
                    const quizIDs = createQuizzesResponse.successful.map(quiz => quiz.value.id);

                    const quizQuestionData = {
                        domain,
                        token,
                        course_id,
                        questionTypes,
                        quizzes: quizIDs
                    }

                    // Step 2: Creating Questions (+2a per-type lines)
                    step2Line = appendLine('Step 2: Creating Questions...');
                    if (selectedTypes.length > 0) {
                        selectedTypes.forEach(({ type, qty }) => appendLine(`Step 2a: Creating ${typeLabel(type)} questions... (${qty} per quiz)`));
                    } else {
                        appendLine('Step 2a: No question types selected.');
                    }

                    const createQuestionsResponse = await window.axios.createClassicQuestions(quizQuestionData);
                    if (createQuestionsResponse.successful.length > 0) {
                        // update the quizzes after question are created
                        appendLine(`Step 2: Questions created for ${createQuestionsResponse.successful.length} quizzes.`);
                        for (let quiz of quizIDs) {
                            try {
                                await window.axios.updateClassicQuiz({ domain, token, course_id, quiz_id: quiz });
                            } catch (error) {
                                console.error(`Failed to update quiz ${quiz}: ${error}`);
                            }
                        }
                        // Move bar to 75% after Step 2
                        setBar(75);
                        // If user selected publish, publish after questions are created
                        if (publish) {
                            appendLine('Step 3: Publishing quizzes...');
                            for (let quiz of quizIDs) {
                                try {
                                    await window.axios.updateClassicQuiz({ domain, token, course_id, quiz_id: quiz, payload: { quiz: { published: true } } });
                                } catch (error) {
                                    console.error(`Failed to publish quiz ${quiz}: ${error}`);
                                }
                            }
                            // Nudge bar during publish
                            setBar(90);
                        }
                        // Final step
                        appendLine('Step 4: Done.');
                        setBar(100);
                        activeRun = false;
                    } else {
                        progressInfo.innerHTML += ` Failed to create questions for ${quizIDs.length} quizzes.`;
                        progressBar.parentElement.hidden = true;
                        errorHandler({ message: `${createQuestionsResponse.failed[0].reason}` }, progressInfo);
                        activeRun = false;
                    }
                }
                if (createQuizzesResponse.failed.length > 0) {
                    progressInfo.innerHTML += `Failed to create ${createQuizzesResponse.failed.length} quizzes.`;
                    progressBar.parentElement.hidden = true;
                    errorHandler({ message: `${createQuizzesResponse.failed[0].reason}` }, progressInfo);
                    activeRun = false;
                }


            } catch (error) {
                progressBar.parentElement.hidden = true;
                errorHandler(error, progressInfo);
            } finally {
                createBtn.disabled = false;
            }
        });

        // mark listeners as attached
        createQuizForm.dataset.bound = 'true';
    }

    // (no-op else; listeners already bound previously)
}

async function deleteAllClassicQuizzes(e) {
    hideEndpoints(e);
    const eContent = document.querySelector('#endpoint-content');
    let deleteQuizForm = eContent.querySelector('#delete-quiz-form');
    if (!deleteQuizForm) {
        deleteQuizForm = document.createElement('form');
        deleteQuizForm.id = 'delete-quiz-form';
        deleteQuizForm.innerHTML = `
            <style>
                #delete-quiz-form .card-title { font-size: 1.1rem; }
                #delete-quiz-form .card-header small { font-size: 0.7rem; }
                #delete-quiz-form .form-label { font-size: 0.85rem; }
                #delete-quiz-form .card-body { padding: 0.75rem; }
                #delete-quiz-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #delete-quiz-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #delete-quiz-form .bi { font-size: 0.9rem; }
                #delete-quiz-form .mt-3, #delete-quiz-form .mt-2 { margin-top: 0.5rem !important; }
                #delete-quiz-form .mb-3, #delete-quiz-form .mb-2 { margin-bottom: 0.5rem !important; }
                #delete-quiz-form .progress { height: 12px; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-1"></i>Delete All Classic Quizzes
                    </h3>
                    <small class="text-muted">Remove all classic quizzes from a course</small>
                </div>
                <div class="card-body">
            <div class="row">
                <div class="col-2 mb-2">
                    <label for="course-id" class="form-label">Course ID</label>
                    <input type="number" class="form-control form-control-sm" id="course-id" required>
                </div>
            </div>
            <button id="check-quiz-btn" type="button" class="btn btn-sm btn-danger" disabled>Check</button>
            <div hidden id="delete-quiz-progress-div">
                <p id="delete-quiz-progress-info"></p>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">

                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="delete-quiz-response-container" class="mt-2">
            </div>
        `;

        eContent.append(deleteQuizForm);
    }
    deleteQuizForm.hidden = false;

    const checkQuizBtn = deleteQuizForm.querySelector('#check-quiz-btn');
    // check the see if the course ID is valid
    const courseIDInput = deleteQuizForm.querySelector('#course-id');
    const toggleCheckQuizzesBtn = () => {
        checkQuizBtn.disabled = !(courseIDInput.value && courseIDInput.value.trim() !== '');

    };

    courseIDInput.addEventListener('input', toggleCheckQuizzesBtn);

    checkQuizBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkQuizBtn.disabled = true;

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const courseID = deleteQuizForm.querySelector('#course-id').value;
        const responseContainer = deleteQuizForm.querySelector('#delete-quiz-response-container');

        const progressDiv = deleteQuizForm.querySelector('#delete-quiz-progress-div');
        const progressInfo = deleteQuizForm.querySelector('#delete-quiz-progress-info');
        const progressBar = deleteQuizForm.querySelector('.progress-bar');

        progressBar.style.width = '0%';
        progressDiv.hidden = false;
        progressInfo.innerHTML = '';

        window.progressAPI.onUpdateProgress((progress) => {
            progressBar.style.width = `${progress}%`;
        });

        let quizzes = '';
        let hasError = false;
        try {
            quizzes = await window.axios.getClassicQuizzes({ domain, token, courseID });
            if (quizzes.length === 0) {
                progressInfo.innerHTML = 'No quizzes found to delete.';
                return;
            }
            progressInfo.innerHTML = `Found ${quizzes.length} quizzes to delete.`;

        } catch (error) {
            // Handle error (e.g., show an error message)
            hasError = true;
            errorHandler(error, progressInfo);
        } finally {
            checkQuizBtn.disabled = false;
        }

        if (!hasError) {
            responseContainer.innerHTML = `<div>
                    <div class="col-auto">
                        <div id="dcq-response-details" class="row align-items-center">
                            <div class="col-2">
                                <button id="delete-btn" type="button" class="btn btn-sm btn-danger">Delete</button>
                            </div>
                            <div class="col-2">
                                <button id="cancel-btn" type="button" class="btn btn-sm btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>`;


            const dcqResponseDetails = responseContainer.querySelector('#dcq-response-details');
            const deleteBtn = dcqResponseDetails.querySelector('#delete-btn');
            const cancelBtn = dcqResponseDetails.querySelector('#cancel-btn');

            deleteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                deleteBtn.disabled = true;
                cancelBtn.disabled = true;

                progressInfo.innerHTML = 'Deleting quizzes...';
                progressBar.style.width = '0%';

                try {
                    const deleteResponse = await window.axios.deleteClassicQuizzes({ domain, token, courseID, quizzes });
                    if (deleteResponse.successful.length > 0) {
                        progressInfo.innerHTML = `Successfully deleted ${deleteResponse.successful.length} quizzes.`;
                        progressBar.style.width = '100%';
                    } else {
                        progressInfo.innerHTML = `Failed to delete quizzes`;
                        errorHandler({ message: deleteResponse.failed[0].reason }, progressInfo);
                    }
                } catch (error) {
                    errorHandler(error, progressInfo);
                } finally {
                    deleteBtn.hidden = true;
                    deleteBtn.disabled = true
                    cancelBtn.hidden = true;
                    cancelBtn.disabled = true;
                }
            });

            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                deleteQuizForm.querySelector('#course-id').value = '';
                checkQuizBtn.disabled = true;
                responseContainer.innerHTML = '';
                progressDiv.hidden = true;
            });
        }
    });
}

async function addQuestionsNQ(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let addQuestionsNQForm = eContent.querySelector('#add-nq-questions-form');

    if (!addQuestionsNQForm) {
        addQuestionsNQForm = document.createElement('form');
        addQuestionsNQForm.id = 'add-nq-questions-form';
        addQuestionsNQForm.innerHTML = `
            <style>
                #add-nq-questions-form .card-title { font-size: 1.1rem; }
                #add-nq-questions-form .card-header small { font-size: 0.7rem; }
                #add-nq-questions-form .form-label { font-size: 0.85rem; }
                #add-nq-questions-form .form-text { font-size: 0.7rem; }
                #add-nq-questions-form .card-body { padding: 0.75rem; }
                #add-nq-questions-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #add-nq-questions-form .form-control, #add-nq-questions-form .form-select { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #add-nq-questions-form .bi { font-size: 0.9rem; }
                #add-nq-questions-form .mt-3, #add-nq-questions-form .mt-2 { margin-top: 0.5rem !important; }
                #add-nq-questions-form .progress { height: 12px; }
                #add-nq-questions-form h5 { font-size: 1rem; }
                #add-nq-questions-form .alert { padding: 0.5rem 0.75rem; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-plus-circle me-1"></i>Add Questions to a New Quiz
                    </h3>
                    <small class="text-muted">Add questions to an existing New Quiz</small>
                </div>
                <div class="card-body">
            <div class="row">
                <div class="row align-items-center">
                        <div class="col-2">
                            <label class="form-label">Course</label>
                            <input id="add-nq-questions-course-id" type="text" class="form-control form-control-sm" aria-describedby="input-checker" />
                        </div>
                    <div class="col-2">
                        <label class="form-label">Quiz ID</label>
                        <input id="nq-id" type="text" class="form-control form-control-sm" value="1">
                    </div>
                    <div class="col-2">
                        <label class="form-label">How many</label>
                        <input id="nq-question-number" type="text" class="form-control form-control-sm" value="1">
                    </div>
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <hr class="mt-2">
                <div class="row">
                    <div>
                        <h5>Type</h5>
                        <select id="nq-question-type" class="form-select form-select-sm col-auto custom-select-width">
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="multi_answer">Multi Answer</option>
                            <option value="essay">Essay</option>
                            <option value="true_false">True/False</option>
                            <option value="matching">Matching</option>
                            <option value="categorization">Categorization</option>
                            <option value="file_upload">File Upload</option>
                            <option value="formula">Formula</option>
                            <option value="ordering">Ordering</option>
                            <option value="fill_in_blank">Fill in the Blank</option>
                            <option value="numeric">Numeric</option>
                            <!-- <option value="stimulus">Stimulus</option> -->
                        </select>
                    </div>         
                </div>
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="add-nq-questions-btn" class="btn btn-sm btn-primary mt-2" disabled>Create</button>
                </div>
            </div>
            <div hidden id="add-nq-questions-progress-div">
                <p id="add-nq-questions-progress-info"></p>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="add-nq-questions-response-container" class="mt-2">
            </div>
        `;

        eContent.append(addQuestionsNQForm);
    }
    addQuestionsNQForm.hidden = false;

    function checkCourseID(courseIDField, container) {
        const trimmedValue = courseIDField.value.trim();
        const isValid = !isNaN(Number(trimmedValue)) && Number(trimmedValue) > 0 && Number.isInteger(Number(trimmedValue));

        // Find or create validation feedback element
        let feedbackElement = container.querySelector('#course-id-feedback');
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'course-id-feedback';
            feedbackElement.className = 'invalid-feedback';
            feedbackElement.style.display = 'none';
            feedbackElement.style.color = '#dc3545';
            feedbackElement.style.fontSize = '0.875rem';
            feedbackElement.style.marginTop = '0.25rem';
            courseIDField.parentNode.appendChild(feedbackElement);
        }

        if (trimmedValue === '') {
            // Empty field - clear validation
            courseIDField.classList.remove('is-invalid', 'is-valid');
            feedbackElement.style.display = 'none';
        } else if (isValid) {
            // Valid course ID
            courseIDField.classList.remove('is-invalid');
            courseIDField.classList.add('is-valid');
            feedbackElement.style.display = 'none';
        } else {
            // Invalid course ID
            courseIDField.classList.remove('is-valid');
            courseIDField.classList.add('is-invalid');
            feedbackElement.textContent = 'Course ID must be a positive number';
            feedbackElement.style.display = 'block';
        }
    }

    const courseID = addQuestionsNQForm.querySelector('#add-nq-questions-course-id');
    const createQuestionBtn = addQuestionsNQForm.querySelector('#add-nq-questions-btn');

    function updateAddQuestionsButtonState() {
        const courseValue = courseID.value.trim();
        const hasValidCourse = /^\d+$/.test(courseValue);
        const quizIdInput = addQuestionsNQForm.querySelector('#nq-id');
        const quizIdValue = quizIdInput.value.trim();
        const hasValidQuizId = /^\d+$/.test(quizIdValue);
        const questionNumberInput = addQuestionsNQForm.querySelector('#nq-question-number');
        const questionNumberValue = questionNumberInput.value.trim();
        const hasValidQuestionNumber = /^\d+$/.test(questionNumberValue) && parseInt(questionNumberValue) > 0;
        const domain = document.querySelector('#domain')?.value?.trim() || '';
        const token = document.querySelector('#token')?.value?.trim() || '';
        
        createQuestionBtn.disabled = !hasValidCourse || !hasValidQuizId || !hasValidQuestionNumber || !domain || !token;
    }

    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, addQuestionsNQForm);
        updateAddQuestionsButtonState();
    });

    courseID.addEventListener('input', updateAddQuestionsButtonState);

    // Add validation for other required fields
    const quizIdInput = addQuestionsNQForm.querySelector('#nq-id');
    const questionNumberInput = addQuestionsNQForm.querySelector('#nq-question-number');
    
    quizIdInput.addEventListener('input', updateAddQuestionsButtonState);
    questionNumberInput.addEventListener('input', updateAddQuestionsButtonState);

    // Add listeners for domain and token changes (if they exist)
    const domainInput = document.querySelector('#domain');
    const tokenInput = document.querySelector('#token');
    
    if (domainInput) {
        domainInput.addEventListener('input', updateAddQuestionsButtonState);
        domainInput.addEventListener('change', updateAddQuestionsButtonState);
    }
    
    if (tokenInput) {
        tokenInput.addEventListener('input', updateAddQuestionsButtonState);
        tokenInput.addEventListener('change', updateAddQuestionsButtonState);
    }

    // Initial validation check
    updateAddQuestionsButtonState();

    createQuestionBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        createQuestionBtn.disabled = true;

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const courseId = courseID.value.trim();
        const quizId = addQuestionsNQForm.querySelector('#nq-id').value.trim();
        const nQuestions = parseInt(addQuestionsNQForm.querySelector('#nq-question-number').value.trim());
        const questionType = addQuestionsNQForm.querySelector('#nq-question-type').value;

        const nqResponseContainer = addQuestionsNQForm.querySelector('#add-nq-questions-response-container');
        const progressDiv = addQuestionsNQForm.querySelector('#add-nq-questions-progress-div');
        const progressInfo = addQuestionsNQForm.querySelector('#add-nq-questions-progress-info');
        const progressBar = addQuestionsNQForm.querySelector('.progress-bar');

        // Show progress
        progressDiv.hidden = false;
        nqResponseContainer.innerHTML = '';
        progressBar.style.width = '0%';
        progressInfo.textContent = `Creating ${nQuestions} ${questionType} question${nQuestions > 1 ? 's' : ''}...`;

        try {
            // Set up progress listener
            let activeRun = true;
            if (window.progressAPI && window.progressAPI.onUpdateProgress) {
                window.progressAPI.onUpdateProgress((msg) => {
                    if (!activeRun || !msg || typeof msg !== 'object') return;
                    
                    if (msg.label === 'Creating quiz items' && typeof msg.processed === 'number' && typeof msg.total === 'number' && msg.total > 0) {
                        const pct = (msg.processed / msg.total) * 100;
                        progressBar.style.width = `${pct}%`;
                        progressInfo.textContent = `Creating quiz items... ${msg.processed}/${msg.total}`;
                    }
                });
            }

            // Create array of question types for the backend
            const questionTypes = [];
            for (let i = 0; i < nQuestions; i++) {
                questionTypes.push(questionType);
            }

            // Call the backend to create quiz items
            const response = await window.axios.createNewQuizItems({
                domain,
                token,
                course_id: courseId,
                quizzes: [{ id: quizId }], // Single quiz in array format
                questionTypes: questionTypes
            });

            activeRun = false;
            progressBar.style.width = '100%';
            progressInfo.textContent = 'Questions created successfully!';

            // Show success message
            setTimeout(() => {
                progressDiv.hidden = true;
                nqResponseContainer.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle me-1"></i>
                        <strong>Success!</strong> Created ${nQuestions} ${questionType} question${nQuestions > 1 ? 's' : ''} in quiz ${quizId}.
                    </div>
                `;
                createQuestionBtn.disabled = false;
            }, 1000);

        } catch (error) {
            console.error('Error creating questions:', error);
            progressDiv.hidden = true;
            nqResponseContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    <strong>Error:</strong> ${error.message || 'Failed to create questions'}
                </div>
            `;
            createQuestionBtn.disabled = false;
        }
    })
}

// Create New Quiz function
async function createNewQuiz(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createNewQuizForm = eContent.querySelector('#create-new-quiz-form');

    if (!createNewQuizForm) {
        createNewQuizForm = document.createElement('form');
        createNewQuizForm.id = 'create-new-quiz-form';
        createNewQuizForm.innerHTML = `
            <style>
                #create-new-quiz-form .card-title { font-size: 1.1rem; }
                #create-new-quiz-form .card-header small { font-size: 0.7rem; }
                #create-new-quiz-form .form-label, #create-new-quiz-form .form-check-label { font-size: 0.85rem; }
                #create-new-quiz-form .form-text { font-size: 0.7rem; }
                #create-new-quiz-form .card-body { padding: 0.75rem; }
                #create-new-quiz-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #create-new-quiz-form .btn-sm { font-size: 0.75rem; }
                #create-new-quiz-form .form-control, #create-new-quiz-form .form-select, #create-new-quiz-form textarea { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-new-quiz-form .bi { font-size: 0.9rem; }
                #create-new-quiz-form .mt-3, #create-new-quiz-form .mt-2 { margin-top: 0.5rem !important; }
                #create-new-quiz-form .mb-4, #create-new-quiz-form .mb-3, #create-new-quiz-form .mb-2 { margin-bottom: 0.5rem !important; }
                #create-new-quiz-form .g-3, #create-new-quiz-form .gap-2 { gap: 0.5rem !important; }
                #create-new-quiz-form .progress { height: 12px; }
                #create-new-quiz-form h5, #create-new-quiz-form h6 { font-size: 1rem; }
                #create-new-quiz-form .alert { padding: 0.5rem 0.75rem; }
                #create-new-quiz-form .badge { font-size: 0.75rem; padding: 0.25em 0.4em; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-patch-question me-1"></i>Create New Quiz
                    </h3>
                    <small class="text-muted">Create a modern New Quiz with advanced features and settings</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-2">
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="new-quiz-course-id">
                                <i class="bi bi-book me-1"></i>Course ID
                            </label>
                            <input id="new-quiz-course-id" type="text" class="form-control form-control-sm" 
                                   placeholder="Enter course ID" aria-describedby="new-quiz-course-help" />
                            <div id="new-quiz-course-help" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="new-quiz-title">
                                <i class="bi bi-tag me-1"></i>Quiz Title
                            </label>
                            <input id="new-quiz-title" type="text" class="form-control form-control-sm" 
                                   placeholder="Quiz Title" value="New Quiz" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="new-quiz-count">
                                <i class="bi bi-hash me-1"></i>Number of Quizzes
                            </label>
                            <input id="new-quiz-count" type="number" class="form-control form-control-sm" 
                                   min="1" max="50" value="1" />
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-2">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="new-quiz-description">
                                <i class="bi bi-text-paragraph me-1"></i>Description (optional)
                            </label>
                            <textarea id="new-quiz-description" class="form-control form-control-sm" rows="3" 
                                      placeholder="Quiz description or instructions"></textarea>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">
                                <i class="bi bi-gear me-1"></i>Quiz Settings
                            </label>
                            <div class="d-flex flex-column gap-2">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="new-quiz-published" checked>
                                    <label class="form-check-label" for="new-quiz-published">
                                        Publish immediately
                                    </label>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="new-quiz-shuffle">
                                    <label class="form-check-label" for="new-quiz-shuffle">
                                        Shuffle answers
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Question Types Section -->
                    <div class="row mb-2">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="card-title mb-0">
                                        <i class="bi bi-question-circle me-1"></i>Question Types
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3 mb-2">
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold" for="new-quiz-question-type">
                                                Select Question Type
                                            </label>
                                            <select id="new-quiz-question-type" class="form-select form-select-sm">
                                                <option value="">Choose a question type...</option>
                                                <option value="multiple_choice">Multiple Choice</option>
                                                <option value="multi_answer">Multiple Answer</option>
                                                <option value="true_false">True/False</option>
                                                <option value="essay">Essay</option>
                                                <option value="fill_in_blank">Fill in the Blank</option>
                                                <option value="numeric">Numeric</option>
                                                <option value="matching">Matching</option>
                                                <option value="categorization">Categorization</option>
                                                <option value="ordering">Ordering</option>
                                                <option value="file_upload">File Upload</option>
                                                <option value="formula">Formula</option>
                                                <!-- <option value="stimulus">Stimulus</option> -->
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label fw-bold" for="new-quiz-question-qty">
                                                Quantity
                                            </label>
                                            <input id="new-quiz-question-qty" type="number" class="form-control form-control-sm" 
                                                   min="1" max="50" value="1" />
                                        </div>
                                        <div class="col-md-3 d-flex align-items-end">
                                            <button type="button" class="btn btn-sm btn-outline-primary w-100" id="add-question-type-btn">
                                                <i class="bi bi-plus me-1"></i>Add
                                            </button>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-12">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <span class="fw-bold">Selected Question Types:</span>
                                                <button type="button" class="btn btn-outline-secondary btn-sm" id="clear-question-types-btn">
                                                    <i class="bi bi-x-circle me-1"></i>Clear All
                                                </button>
                                            </div>
                                            <div id="selected-question-types" class="text-muted">
                                                No question types selected
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-2">
                        <div class="col-12">
                            <div class="d-grid">
                                <button type="button" class="btn btn-sm btn-success" id="create-new-quiz-btn" disabled>
                                    <i class="bi bi-plus-circle me-1"></i>Create New Quiz
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Card -->
            <div class="card mt-2" id="create-new-quiz-progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i>Creating New Quiz
                    </h5>
                </div>
                <div class="card-body">
                    <p id="create-new-quiz-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             id="create-new-quiz-progress-bar" style="width:0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-2" id="create-new-quiz-results-card" hidden>
                <div class="card-body" id="create-new-quiz-response-container"></div>
            </div>
        `;

        eContent.append(createNewQuizForm);
    }
    createNewQuizForm.hidden = false;

    // Attach listeners only once to avoid duplicate submissions when reopening this view
    if (createNewQuizForm.dataset.bound !== 'true') {
        // Add event listeners and validation
        const courseInput = createNewQuizForm.querySelector('#new-quiz-course-id');
        const createBtn = createNewQuizForm.querySelector('#create-new-quiz-btn');
        const courseHelp = createNewQuizForm.querySelector('#new-quiz-course-help');
        
        // Question type management
        const questionTypeSelect = createNewQuizForm.querySelector('#new-quiz-question-type');
        const questionQtyInput = createNewQuizForm.querySelector('#new-quiz-question-qty');
        const addQuestionBtn = createNewQuizForm.querySelector('#add-question-type-btn');
        const clearQuestionsBtn = createNewQuizForm.querySelector('#clear-question-types-btn');
        const selectedQuestionsDiv = createNewQuizForm.querySelector('#selected-question-types');
        
        const selectedQuestionTypes = new Map(); // type -> qty

    function updateSelectedQuestionTypesDisplay() {
        if (selectedQuestionTypes.size === 0) {
            selectedQuestionsDiv.innerHTML = '<span class="text-muted">No question types selected</span>';
        } else {
            const items = [];
            for (const [type, qty] of selectedQuestionTypes.entries()) {
                const label = questionTypeSelect.querySelector(`option[value="${type}"]`)?.textContent || type;
                items.push(`<span class="badge bg-primary me-2">${label} x ${qty}</span>`);
            }
            selectedQuestionsDiv.innerHTML = items.join('');
        }
        updateCreateButtonState();
    }

    function updateCreateButtonState() {
        const hasValidCourse = /^\d+$/.test(courseInput.value.trim());
        const hasQuestions = selectedQuestionTypes.size > 0;
        const domain = document.querySelector('#domain')?.value?.trim() || '';
        const token = document.querySelector('#token')?.value?.trim() || '';
        
        // For debugging - remove this later
        console.log('Button validation:', {
            hasValidCourse,
            hasQuestions,
            hasDomain: !!domain,
            hasToken: !!token,
            courseValue: courseInput.value.trim(),
            questionCount: selectedQuestionTypes.size
        });
        
        createBtn.disabled = !hasValidCourse || !hasQuestions || !domain || !token;
    }

    // Add question type handler
    addQuestionBtn.addEventListener('click', () => {
        const type = questionTypeSelect.value;
        const qty = parseInt(questionQtyInput.value) || 1;
        
        if (!type) return;
        
        selectedQuestionTypes.set(type, qty);
        updateSelectedQuestionTypesDisplay();
        
        // Reset selection
        questionTypeSelect.value = '';
        questionQtyInput.value = '1';
    });

    // Clear all question types
    clearQuestionsBtn.addEventListener('click', () => {
        selectedQuestionTypes.clear();
        updateSelectedQuestionTypesDisplay();
    });

    // Course ID validation
    courseInput.addEventListener('input', () => {
        const isValid = /^\d+$/.test(courseInput.value.trim());
        courseInput.classList.toggle('is-invalid', !isValid && courseInput.value.length > 0);
        courseHelp.classList.toggle('d-none', isValid || courseInput.value.length === 0);
        updateCreateButtonState();
    });

    // Add listeners for domain and token changes (if they exist)
    const domainInput = document.querySelector('#domain');
    const tokenInput = document.querySelector('#token');
    
    if (domainInput) {
        domainInput.addEventListener('input', updateCreateButtonState);
        domainInput.addEventListener('change', updateCreateButtonState);
    }
    
    if (tokenInput) {
        tokenInput.addEventListener('input', updateCreateButtonState);
        tokenInput.addEventListener('change', updateCreateButtonState);
    }

    // Initial state
    updateSelectedQuestionTypesDisplay();

    // Create button handler
    createBtn.addEventListener('click', async () => {
        const courseId = courseInput.value.trim();
        const title = createNewQuizForm.querySelector('#new-quiz-title').value.trim();
        const count = parseInt(createNewQuizForm.querySelector('#new-quiz-count').value);
        const description = createNewQuizForm.querySelector('#new-quiz-description').value.trim();
        const published = createNewQuizForm.querySelector('#new-quiz-published').checked;
        const shuffleAnswers = createNewQuizForm.querySelector('#new-quiz-shuffle').checked;

        const progressCard = createNewQuizForm.querySelector('#create-new-quiz-progress-card');
        const progressInfo = createNewQuizForm.querySelector('#create-new-quiz-progress-info');
        const progressBar = createNewQuizForm.querySelector('#create-new-quiz-progress-bar');
        const resultsCard = createNewQuizForm.querySelector('#create-new-quiz-results-card');
        const responseContainer = createNewQuizForm.querySelector('#create-new-quiz-response-container');

        progressCard.hidden = false;
        resultsCard.hidden = true;
        createBtn.disabled = true;

        try {
            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();

            // Convert selected question types to array format for backend
            const questionTypes = [];
            for (const [type, qty] of selectedQuestionTypes.entries()) {
                for (let i = 0; i < qty; i++) {
                    questionTypes.push(type);
                }
            }

            // Step 1: Create New Quizzes
            progressInfo.textContent = `Creating ${count} New Quiz${count > 1 ? 'es' : ''}...`;
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', '0');

            // Set up progress listener for quiz creation
            let activeRun = true;
            if (window.progressAPI && window.progressAPI.onUpdateProgress) {
                window.progressAPI.onUpdateProgress((msg) => {
                    if (!activeRun || !msg || typeof msg !== 'object') return;
                    
                    if (msg.label === 'Creating new quizzes' && typeof msg.processed === 'number' && typeof msg.total === 'number' && msg.total > 0) {
                        // Quiz creation progress: 0-50%
                        const pct = (msg.processed / msg.total) * 50;
                        progressBar.style.width = `${pct}%`;
                        progressBar.setAttribute('aria-valuenow', pct);
                        progressInfo.textContent = `Creating new quizzes... ${msg.processed}/${msg.total}`;
                    } else if (msg.label === 'Creating quiz items' && typeof msg.processed === 'number' && typeof msg.total === 'number' && msg.total > 0) {
                        // Question creation progress: 50-100%
                        const pct = 50 + (msg.processed / msg.total) * 50;
                        progressBar.style.width = `${pct}%`;
                        progressBar.setAttribute('aria-valuenow', pct);
                        progressInfo.textContent = `Creating quiz items... ${msg.processed}/${msg.total}`;
                    }
                });
            }

            const createQuizzesResponse = await window.axios.createNewQuizzes({
                domain,
                token,
                course_id: courseId,
                title: title || 'New Quiz',
                count: count,
                published: published
            });

            if (createQuizzesResponse.successful && createQuizzesResponse.successful.length > 0) {
                progressBar.style.width = '50%';
                progressBar.setAttribute('aria-valuenow', '50');
                progressInfo.textContent = `Created ${createQuizzesResponse.successful.length} new quizzes. Adding questions...`;

                // Step 2: Add question items to each quiz
                const quizzes = createQuizzesResponse.successful.map(result => result.value);
                
                if (questionTypes.length > 0) {
                    const createItemsResponse = await window.axios.createNewQuizItems({
                        domain,
                        token,
                        course_id: courseId,
                        quizzes: quizzes,
                        questionTypes: questionTypes
                    });

                    progressBar.style.width = '100%';
                    progressBar.setAttribute('aria-valuenow', '100');
                    progressInfo.textContent = 'Quiz creation completed!';
                    
                    activeRun = false;
                    setTimeout(() => {
                        progressCard.hidden = true;
                        resultsCard.hidden = false;
                        responseContainer.innerHTML = `
                            <div class="alert alert-success">
                                <i class="bi bi-check-circle me-1"></i>
                                <strong>Success!</strong> Created ${createQuizzesResponse.successful.length} new quiz${createQuizzesResponse.successful.length > 1 ? 'es' : ''} with ${questionTypes.length} question item${questionTypes.length > 1 ? 's' : ''} each.
                                <br><br>
                                <strong>Quiz IDs:</strong> ${quizzes.map(q => q.id).join(', ')}
                            </div>
                        `;
                        createBtn.disabled = false;
                    }, 1000);
                } else {
                    // No questions, just show quiz creation success
                    progressBar.style.width = '100%';
                    progressBar.setAttribute('aria-valuenow', '100');
                    progressInfo.textContent = 'Quiz creation completed!';
                    
                    activeRun = false;
                    setTimeout(() => {
                        progressCard.hidden = true;
                        resultsCard.hidden = false;
                        responseContainer.innerHTML = `
                            <div class="alert alert-success">
                                <i class="bi bi-check-circle me-1"></i>
                                <strong>Success!</strong> Created ${createQuizzesResponse.successful.length} new quiz${createQuizzesResponse.successful.length > 1 ? 'es' : ''}.
                                <br><br>
                                <strong>Quiz IDs:</strong> ${quizzes.map(q => q.id).join(', ')}
                            </div>
                        `;
                        createBtn.disabled = false;
                    }, 1000);
                }
            } else {
                throw new Error('Failed to create any quizzes');
            }

        } catch (error) {
            console.error('New Quiz creation error:', error);
            progressCard.hidden = true;
            resultsCard.hidden = false;
            responseContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
            createBtn.disabled = false;
        }
    });

        // mark listeners as attached
        createNewQuizForm.dataset.bound = 'true';
    }

    // (no-op else; listeners already bound previously)
}

// Get Respondus Quizzes function
async function getRespondusQuizzes(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let respondusQuizForm = eContent.querySelector('#respondus-quiz-form');

    if (!respondusQuizForm) {
        respondusQuizForm = document.createElement('form');
        respondusQuizForm.id = 'respondus-quiz-form';
        respondusQuizForm.innerHTML = `
            <style>
                #respondus-quiz-form .card-title { font-size: 1.1rem; }
                #respondus-quiz-form .card-header small { font-size: 0.7rem; }
                #respondus-quiz-form .form-label, #respondus-quiz-form .form-check-label { font-size: 0.85rem; }
                #respondus-quiz-form .form-text { font-size: 0.7rem; }
                #respondus-quiz-form .card-body { padding: 0.75rem; }
                #respondus-quiz-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #respondus-quiz-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #respondus-quiz-form .bi { font-size: 0.9rem; }
                #respondus-quiz-form .mt-3, #respondus-quiz-form .mt-2 { margin-top: 0.5rem !important; }
                #respondus-quiz-form .mb-3, #respondus-quiz-form .mb-2 { margin-bottom: 0.5rem !important; }
                #respondus-quiz-form .gap-2 { gap: 0.5rem !important; }
                #respondus-quiz-form .progress { height: 12px; }
                #respondus-quiz-form h5 { font-size: 1rem; }
                #respondus-quiz-form .alert { padding: 0.5rem 0.75rem; }
                #respondus-quiz-form .list-group-item { padding: 0.5rem 0.75rem; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-lock me-1"></i>Get Respondus Quizzes
                    </h3>
                    <small class="text-muted">Find and manage quizzes with Respondus LockDown Browser settings</small>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-6 mb-2">
                            <label for="respondus-course-id" class="form-label">Course ID(s)</label>
                            <input type="text" class="form-control form-control-sm" id="respondus-course-id" 
                                   placeholder="Enter course ID(s), comma-separated for multiple" required>
                            <small class="form-text text-muted">
                                Examples: 12345 or 12345, 67890, 11111
                            </small>
                        </div>
                    </div>
                    <button id="get-respondus-btn" type="button" class="btn btn-sm btn-primary" disabled>Get Quizzes</button>
                    
                    <div hidden id="respondus-quiz-list" class="mt-2">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <h5 class="mb-1">Quizzes with Respondus Settings</h5>
                                <small class="text-muted" id="respondus-quiz-count"></small>
                            </div>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="select-all-respondus">
                                <label class="form-check-label fw-bold" for="select-all-respondus">
                                    Select All
                                </label>
                            </div>
                        </div>
                        
                        <!-- Search/Filter Bar -->
                        <div class="input-group mb-2">
                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                            <input type="text" class="form-control form-control-sm" id="respondus-search" 
                                   placeholder="Search by quiz title or course ID...">
                            <button class="btn btn-sm btn-outline-secondary" type="button" id="respondus-clear-search">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>

                        <!-- Quiz List with better styling for many items -->
                        <div class="card mb-2">
                            <div class="card-body p-0">
                                <div id="respondus-quiz-items" class="list-group list-group-flush" 
                                     style="max-height: 500px; overflow-y: auto;">
                                    <!-- Quiz checkboxes will be added here -->
                                </div>
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button id="enable-respondus-btn" type="button" class="btn btn-sm btn-success">
                                <i class="bi bi-unlock me-1"></i>Enable Selected
                            </button>
                            <button id="disable-respondus-btn" type="button" class="btn btn-sm btn-warning">
                                <i class="bi bi-lock me-1"></i>Disable Selected
                            </button>
                        </div>
                    </div>

                    <div hidden id="respondus-progress-div">
                        <p id="respondus-progress-info"></p>
                        <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div id="respondus-response-container" class="mt-2"></div>
                </div>
            </div>
        `;

        eContent.append(respondusQuizForm);
    }
    respondusQuizForm.hidden = false;

    const courseIDInput = respondusQuizForm.querySelector('#respondus-course-id');
    const getQuizzesBtn = respondusQuizForm.querySelector('#get-respondus-btn');
    const quizListDiv = respondusQuizForm.querySelector('#respondus-quiz-list');
    const quizItemsDiv = respondusQuizForm.querySelector('#respondus-quiz-items');
    const quizCountDiv = respondusQuizForm.querySelector('#respondus-quiz-count');
    const selectAllCheckbox = respondusQuizForm.querySelector('#select-all-respondus');
    const searchInput = respondusQuizForm.querySelector('#respondus-search');
    const clearSearchBtn = respondusQuizForm.querySelector('#respondus-clear-search');
    const enableBtn = respondusQuizForm.querySelector('#enable-respondus-btn');
    const disableBtn = respondusQuizForm.querySelector('#disable-respondus-btn');
    const progressDiv = respondusQuizForm.querySelector('#respondus-progress-div');
    const progressInfo = respondusQuizForm.querySelector('#respondus-progress-info');
    const progressBar = respondusQuizForm.querySelector('.progress-bar');
    const responseContainer = respondusQuizForm.querySelector('#respondus-response-container');

    let respondusQuizzes = [];
    let allQuizzes = []; // Store all quizzes for filtering

    // Helper function to parse course IDs
    const parseCourseIDs = (input) => {
        return input.split(',')
            .map(id => id.trim())
            .filter(id => id && /^\d+$/.test(id));
    };

    // Enable/disable get button based on course ID
    const toggleGetQuizzesBtn = () => {
        const courseIDs = parseCourseIDs(courseIDInput.value);
        getQuizzesBtn.disabled = courseIDs.length === 0;
    };

    courseIDInput.addEventListener('input', toggleGetQuizzesBtn);

    // Search/Filter functionality
    const filterQuizzes = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const visibleQuizzes = allQuizzes.filter(quiz => {
            if (!searchTerm) return true;
            return quiz.title.toLowerCase().includes(searchTerm) || 
                   quiz.course_id.toString().includes(searchTerm) ||
                   quiz.id.toString().includes(searchTerm);
        });
        
        renderQuizList(visibleQuizzes);
        updateQuizCount(visibleQuizzes.length, allQuizzes.length);
    };

    searchInput.addEventListener('input', filterQuizzes);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterQuizzes();
    });

    // Function to render quiz list
    const renderQuizList = (quizzes) => {
        quizItemsDiv.innerHTML = '';
        
        if (quizzes.length === 0) {
            quizItemsDiv.innerHTML = `
                <div class="list-group-item text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No quizzes match your search criteria
                </div>
            `;
            return;
        }

        quizzes.forEach(quiz => {
            const quizItem = document.createElement('div');
            quizItem.className = 'list-group-item list-group-item-action py-2';
            quizItem.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input respondus-quiz-checkbox" type="checkbox" 
                           value="${quiz.id}" id="quiz-${quiz.id}" data-course="${quiz.course_id}">
                    <label class="form-check-label w-100" for="quiz-${quiz.id}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <strong>${quiz.title}</strong>
                                <br>
                                <small class="text-muted">
                                    Course: ${quiz.course_id} | Quiz ID: ${quiz.id} | 
                                    Lockdown: ${quiz.require_lockdown_browser ? 'Yes' : 'No'} | 
                                    Results: ${quiz.require_lockdown_browser_for_results ? 'Yes' : 'No'} | 
                                    Monitor: ${quiz.require_lockdown_browser_monitor ? 'Yes' : 'No'}
                                </small>
                            </div>
                        </div>
                    </label>
                </div>
            `;
            quizItemsDiv.appendChild(quizItem);
        });
    };

    // Function to update quiz count display
    const updateQuizCount = (visible, total) => {
        if (visible === total) {
            quizCountDiv.textContent = `Showing ${total} quiz${total !== 1 ? 'zes' : ''}`;
        } else {
            quizCountDiv.textContent = `Showing ${visible} of ${total} quiz${total !== 1 ? 'zes' : ''}`;
        }
    };

    // Get quizzes button handler
    getQuizzesBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        getQuizzesBtn.disabled = true;
        quizListDiv.hidden = true;
        progressDiv.hidden = false;
        responseContainer.innerHTML = '';
        progressBar.style.width = '0%';
        searchInput.value = '';

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const courseIDs = parseCourseIDs(courseIDInput.value);

        if (courseIDs.length === 0) {
            progressDiv.hidden = true;
            responseContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Please enter at least one valid course ID.
                </div>
            `;
            getQuizzesBtn.disabled = false;
            return;
        }

        progressInfo.textContent = `Fetching quizzes from ${courseIDs.length} course${courseIDs.length > 1 ? 's' : ''}...`;

        try {
            allQuizzes = [];
            let processedCourses = 0;

            // Fetch quizzes from each course
            for (const courseID of courseIDs) {
                processedCourses++;
                progressBar.style.width = `${(processedCourses / courseIDs.length) * 100}%`;
                progressInfo.textContent = `Fetching quizzes from course ${courseID}... (${processedCourses}/${courseIDs.length})`;

                try {
                    const quizzes = await window.axios.getRespondusQuizzes({ domain, token, courseID });
                    // Add course_id to each quiz for display
                    quizzes.forEach(quiz => quiz.course_id = courseID);
                    allQuizzes.push(...quizzes);
                } catch (error) {
                    console.error(`Error fetching quizzes from course ${courseID}:`, error);
                    // Continue with other courses even if one fails
                }
            }

            progressDiv.hidden = true;

            if (allQuizzes.length === 0) {
                responseContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-1"></i>
                        No quizzes found with Respondus LockDown Browser settings in the specified course${courseIDs.length > 1 ? 's' : ''}.
                    </div>
                `;
                getQuizzesBtn.disabled = false;
                return;
            }

            // Sort by course ID, then by title
            allQuizzes.sort((a, b) => {
                if (a.course_id !== b.course_id) {
                    return a.course_id - b.course_id;
                }
                return a.title.localeCompare(b.title);
            });

            // Display all quizzes
            renderQuizList(allQuizzes);
            updateQuizCount(allQuizzes.length, allQuizzes.length);
            quizListDiv.hidden = false;
            getQuizzesBtn.disabled = false;

            // Show success message with summary
            const courseSummary = courseIDs.map(id => {
                const count = allQuizzes.filter(q => q.course_id === id).length;
                return `Course ${id}: ${count} quiz${count !== 1 ? 'zes' : ''}`;
            }).join(', ');

            responseContainer.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-1"></i>
                    <strong>Success!</strong> Found ${allQuizzes.length} quiz${allQuizzes.length !== 1 ? 'zes' : ''} with Respondus settings.
                    <br><small>${courseSummary}</small>
                </div>
            `;

        } catch (error) {
            progressDiv.hidden = true;
            responseContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    <strong>Error:</strong> ${error.message || error}
                </div>
            `;
            getQuizzesBtn.disabled = false;
        }
    });

    // Select/Deselect all handler
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = respondusQuizForm.querySelectorAll('.respondus-quiz-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    });

    // Enable button handler
    enableBtn.addEventListener('click', async () => {
        await updateRespondusSettings(true);
    });

    // Disable button handler
    disableBtn.addEventListener('click', async () => {
        await updateRespondusSettings(false);
    });

    // Function to update Respondus settings
    async function updateRespondusSettings(enable) {
        const checkboxes = respondusQuizForm.querySelectorAll('.respondus-quiz-checkbox:checked');
        
        if (checkboxes.length === 0) {
            responseContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Please select at least one quiz to update.
                </div>
            `;
            return;
        }

        // Group quizzes by course ID
        const quizzesByCourse = new Map();
        checkboxes.forEach(cb => {
            const quizId = cb.value;
            const courseId = cb.dataset.course;
            if (!quizzesByCourse.has(courseId)) {
                quizzesByCourse.set(courseId, []);
            }
            quizzesByCourse.get(courseId).push(quizId);
        });
        
        enableBtn.disabled = true;
        disableBtn.disabled = true;
        getQuizzesBtn.disabled = true;
        progressDiv.hidden = false;
        responseContainer.innerHTML = '';
        progressBar.style.width = '0%';
        
        const totalQuizzes = checkboxes.length;
        progressInfo.textContent = `${enable ? 'Enabling' : 'Disabling'} Respondus settings for ${totalQuizzes} quiz${totalQuizzes !== 1 ? 'zes' : ''} across ${quizzesByCourse.size} course${quizzesByCourse.size !== 1 ? 's' : ''}...`;

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();

        try {
            let allResults = [];
            let processedQuizzes = 0;

            // Update quizzes for each course
            for (const [courseID, quizIds] of quizzesByCourse.entries()) {
                try {
                    // Set up progress tracking for this batch
                    const batchStartProgress = processedQuizzes;
                    window.progressAPI.onUpdateProgress((progress) => {
                        const adjustedProgress = ((batchStartProgress + (progress * quizIds.length / 100)) / totalQuizzes) * 100;
                        progressBar.style.width = `${adjustedProgress}%`;
                    });

                    const result = await window.axios.updateRespondusQuizzes({
                        domain,
                        token,
                        courseID,
                        quizIds: quizIds,
                        enable
                    });

                    allResults.push(...result);
                    processedQuizzes += quizIds.length;
                    
                } catch (error) {
                    console.error(`Error updating quizzes in course ${courseID}:`, error);
                    // Mark these quizzes as failed
                    quizIds.forEach(quizId => {
                        allResults.push({ success: false, quiz_id: quizId, error: error.message });
                    });
                    processedQuizzes += quizIds.length;
                }
            }

            progressDiv.hidden = true;

            const successCount = allResults.filter(r => r.success).length;
            const failCount = allResults.filter(r => !r.success).length;

            let alertClass = 'alert-success';
            let icon = 'bi-check-circle';
            let message = `Successfully ${enable ? 'enabled' : 'disabled'} Respondus settings for ${successCount} quiz${successCount !== 1 ? 'zes' : ''}.`;

            if (failCount > 0) {
                alertClass = 'alert-warning';
                icon = 'bi-exclamation-triangle';
                message += ` ${failCount} failed.`;
            }

            responseContainer.innerHTML = `
                <div class="alert ${alertClass}">
                    <i class="bi ${icon} me-1"></i>
                    ${message}
                </div>
            `;

            // Refresh the quiz list
            setTimeout(() => {
                getQuizzesBtn.click();
            }, 1500);

        } catch (error) {
            progressDiv.hidden = true;
            responseContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    <strong>Error:</strong> ${error.message || error}
                </div>
            `;
        } finally {
            enableBtn.disabled = false;
            disableBtn.disabled = false;
            getQuizzesBtn.disabled = false;
        }
    }
}