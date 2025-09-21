function quizTemplate(e) {
    switch (e.target.id) {
        case 'create-classic-quiz':
            createQuiz(e);
            break;
        case 'delete-classic-quizzes':
            deleteAllClassicQuizzes(e);
            break;
        case 'add-nq-questions':
            addQuestionsNQ(e);
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
            <div>
                <h3>Create Classic Quiz</h3>
                <p>Quizzes are created with a default of unlimited attempts. If you feel you need more control over quiz settings let Caleb know.</p>
            </div>
            <div class="row">
                <div class="row align-items-center">
                        <div class="col-2">
                            <label class="form-label">Course</label>
                            <input id="course-id" type="number" class="form-control" aria-describedby="input-checker" />
                        </div>
                    <div class="col-2">
                        <label class="form-label">How many</label>
                        <input id="quiz-number" type="number" class="form-control" value="1">
                    </div>
                    <div class="col-4">
                        <label class="form-label" for="quiz-name">Quiz Name (optional)</label>
                        <input id="quiz-name" type="text" class="form-control" placeholder="e.g., Unit 1 Check">
                    </div>
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <hr class="mt-2">
                <div class="row">
                    <div>
                        <h5>Type</h5>
                        <select id="quiz-type" class="form-select col-auto custom-select-width">
                            <option value="practice_quiz" selected>Practice</option>
                            <option value="assignment" selected>Graded</option>
                            <option value="survey">Survey</option>
                            <option value="graded_survey">Graded Survey</option>
                        </select>
                    </div>
                    
                    <div id="quiz-settings" class="mt-3">
                        <h5>Settings</h5>
                        <div class="col-auto form-check form-switch" >
                            <input id="quiz-publish" class="form-check-input" type="checkbox" role="switch" checked>
                            <label for="quiz-publish" class="form-check-label">Publish</label>
                        </div>
                    </div>           
                    <div id="question-types" class="mt-3">
                        <h5>Questions</h5>
                        <div class="row g-3 align-items-end">
                            <div class="col-6">
                                <label for="cq-question-type" class="form-label">Question type</label>
                                <select id="cq-question-type" class="form-select">
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
                                <input id="cq-question-qty" type="number" min="1" class="form-control" placeholder="e.g., 3">
                            </div>
                            <div class="col-auto">
                                <button type="button" class="btn btn-secondary" id="cq-question-add">Add/Update</button>
                                <button type="button" class="btn btn-link" id="cq-question-clear">Clear all</button>
                            </div>
                        </div>
                        <div id="cq-question-summary" class="form-text mt-1"></div>
                    </div>           
                </div>
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="action-btn" class="btn btn-primary mt-3" disabled>Create</button>
                </div>
            </div>
            <div hidden id="create-cq-progress-div">
                <p id="create-cq-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="create-cq-response-container" class="mt-3">
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
            <div class="row">
                <div class="col-2 mb-3">
                    <label for="course-id" class="form-label">Course ID</label>
                    <input type="number" class="form-control" id="course-id" required>
                </div>
            </div>
            <button id="check-quiz-btn" type="button" class="btn btn-danger" disabled>Check</button>
            <div hidden id="delete-quiz-progress-div">
                <p id="delete-quiz-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">

                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="delete-quiz-response-container" class="mt-3">
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
                                <button id="delete-btn" type="button" class="btn btn-danger">Delete</button>
                            </div>
                            <div class="col-2">
                                <button id="cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
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
            <div>
                <h3>Add questions to a New Quiz</h3>
                <p></p>
            </div>
            <div class="row">
                <div class="row align-items-center">
                        <div class="col-2">
                            <label class="form-label">Course</label>
                            <input id="add-nq-questions-course-id" type="text" class="form-control" aria-describedby="input-checker" />
                        </div>
                    <div class="col-2">
                        <label class="form-label">Quiz ID</label>
                        <input id="nq-id" type="text" class="form-control" value="1">
                    </div>
                    <div class="col-2">
                        <label class="form-label">How many</label>
                        <input id="nq-question-number" type="text" class="form-control" value="1">
                    </div>
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <hr class="mt-2">
                <div class="row">
                    <div>
                        <h5>Type</h5>
                        <select id="nq-question-type" class="form-select col-auto custom-select-width">
                            <option value="choice">Multiple Choice</option>
                            <option value="multi-answer">Multi Answer</option>
                            <option value="essay">Essay</option>
                            <option value="true-false">True/False</option>
                            <option value="matching">Matching</option>
                            <option value="categorization">Categorization</option>
                            <option value="file-upload">File Upload</option>
                            <option value="formula">Formula</option>
                            <option value="ordering">Ordering</option>
                            <option value="rich-fill-blank">Fill in the Blank</option>
                            <option value="hot-spot">Hot Spot</option>
                            <option value="numeric">Numeric</option>
                        </select>
                    </div>         
                </div>
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="add-nq-questions-btn" class="btn btn-primary mt-3" disabled>Create</button>
                </div>
            </div>
            <div hidden id="add-nq-questions-progress-div">
                <p id="add-nq-questions-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="add-nq-questions-response-container" class="mt-3">
            </div>
        `;

        eContent.append(addQuestionsNQForm);
    }
    addQuestionsNQForm.hidden = false;

    const courseID = addQuestionsNQForm.querySelector('#add-nq-questions-course-id');

    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, addQuestionsNQForm);
    });

    const createQuestionBtn = addQuestionsNQForm.querySelector('#add-nq-questions-btn');
    createQuestionBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        createQuestionBtn.disabled = true;

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();

        const nqResponseContainer = addQuestionsNQForm.querySelector('#add-nq-questions-response-container');

        const nQuestions = parseInt(addQuestionsNQForm.querySelector('#nq-question-number').value.trim());
        const quizID = parseInt(addQuestionsNQForm.querySelector('#nq-id').value.trim());

        const questionSelect = addQuestionsNQForm.querySelector('#nq-question-type');

        console.log('button pressed.');


        createQuestionBtn.disabled = false;

        const questionData = {
            domain,
            token,
            course_id: courseID.value.trim(),
            quiz_id: quizID,
            num_questions: nQuestions,
            question_type: questionSelect.value
        }

        console.log('The value: ', questionData);

        try {
            throw new Error('There was an error');
        } catch (error) {
            errorHandler(error, nqResponseContainer);
        }
    })
}