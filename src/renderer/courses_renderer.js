// ****************************************
//
// Course endpoints
//
// ****************************************

function courseTemplate(e) {
    switch (e.target.id) {
        case 'restore-content':
            restoreContent(e);
            break;
        case 'reset-courses':
            resetCourses(e);
            break;
        case 'create-support-course':
            createSupportCourse(e);
            break;
        case 'create-associated-courses':
            createAssociatedCourses(e);
            break;
        default:
            break;
    }
}

async function restoreContent(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let restoreContentForm = eContent.querySelector('#restore-content-form');

    if (!restoreContentForm) {
        restoreContentForm = document.createElement('form');
        restoreContentForm.id = 'restore-content-form';
        restoreContentForm.innerHTML = `
            <div>
                <h3>Restore Content</h3>
            </div>
                <div class="row">
                    <div class="col-auto">
                        <label class="form-label">Course</label>
                    </div>
                    <div class="w-100"></div>
                    <div class="col-2">
                        <input id="course-id" type="text" class="form-control" aria-describedby="input-checker" />
                    </div>
                    <div class="col-auto" >
                        <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                    </div>
                    <div class="mt-3">
                        <label class="form-label" for="restore-content">Content</label>
                        <select id="restore-context" class="form-select col-auto custom-select-width">
                            <option value="assignment_" selected>Assignment</option>
                            <option value="assignment_group_">Assignment Group</option>
                            <option value="discussion_topic_">Announcement</option>
                            <option value="discussion_topic_">Discussion</option>
                            <option value="quiz_">Quiz</option>
                            <option value="wiki_page_">Page</option>
                            <option value="context_module_">Module</option>
                            <option value="rubric_">Rubric</option>
                            <option value="group_">Individual Group</option>
                            <option value="group_category_">Entire Group Set</option>
                        </select>
                    </div>
                    <div id="restore-ids-div" class="mt-3">
                        <span>Enter comma separated IDs of the content you want to restore</span>
                        <textarea class="form-control" id="restore-content-area" rows="3"></textarea>
                    </div>
                </div>
            <button type="button" class="btn btn-primary mt-3" id="restore-btn" disabled>Restore</button>
            <div id="rcf-progress-div" hidden>
                <p id="rcf-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id='rcf-response-container'></div>`

        eContent.append(restoreContentForm);
    }
    restoreContentForm.hidden = false;

    const courseID = restoreContentForm.querySelector('#course-id');
    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, eContent);
    });

    const restoreBtn = restoreContentForm.querySelector('#restore-btn');
    restoreBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        restoreBtn.disabled = true;

        const rcfResponseContainer = restoreContentForm.querySelector('#rcf-response-container');
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const courseID = restoreContentForm.querySelector('#course-id').value.trim();
        const restoreContext = restoreContentForm.querySelector('#restore-context').value;
        const contextIDs = restoreContentForm.querySelector('#restore-content-area').value;
        const rcfProgressDiv = restoreContentForm.querySelector('#rcf-progress-div');
        const rcfProgressBar = rcfProgressDiv.querySelector('.progress-bar');
        const rcfProgressInfo = restoreContentForm.querySelector('#rcf-progress-info');

        const valueArray = contextIDs.split(',').map(value => value.trim()).filter(value => value !== '');

        // clean environment
        rcfProgressDiv.hidden = false;
        rcfProgressBar.parentElement.hidden = true;
        updateProgressWithPercent(rcfProgressBar, 0);
        rcfProgressInfo.innerHTML = "Checking...";

        const data = {
            domain,
            token,
            context: restoreContext,
            courseID,
            values: valueArray
        }

        console.log(data);
        try {
            const request = await window.axios.restoreContent(data);
            rcfResponseContainer.innerHTML = 'Successfully restored content.';
        } catch (error) {
            errorHandler(error, rcfProgressInfo);
        } finally {
            restoreBtn.disabled = false;
        }
    });
}

async function resetCourses(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let resetCourseForm = eContent.querySelector('#reset-course-form');

    if (!resetCourseForm) {
        resetCourseForm = document.createElement('form');
        resetCourseForm.id = 'reset-course-form';

        // eContent.innerHTML = `
        //     <div>
        //         <h3>Reset Courses</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');


        resetCourseForm.innerHTML = `
            <div>
                <h3>Reset Courses</h3>
            </div>
                <div class="row">
                    <div class="mb-3" id="reset-switches">
                        <div class="form-check form-switch">
                            <label class="form-check-label" for="course-reset-file">Upload file of courses to reset</label>
                            <input class="form-check-input" type="checkbox" role="switch" id="upload-courses-switch" aria-describedby="course-reset-description">
                            <div id="course-reset-description" class="form-text" hidden>Must be a simple text file only containing a list of courses. Courses may be comma separated or on individual lines</div>
                        </div>
                        <div class="form-check form-switch">
                            <label class="form-check-label" for="course-reset-textarea">Manually enter list of courses</label>
                            <input class="form-check-input" type="checkbox" role="switch" id="manual-courses-reset-switch">
                        </div>
                    </div>
                    <div id="course-text-div" hidden>
                        <textarea class="form-control" id="reset-courses-area" rows="3" placeholder="course1,course2,course3, etc."></textarea>
                    </div>
                </div>
            <button type="button" class="btn btn-primary mt-3" id="resetBtn" disabled hidden>Reset</button>
            <button type="button" class="btn btn-primary mt-3" id="uploadBtn" disabled hidden>Upload</button>
            <div id="progress-div" hidden>
                <p id="progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id='response-contailer'></div>`

        eContent.append(resetCourseForm);
    }
    resetCourseForm.hidden = false;

    const progressDiv = resetCourseForm.querySelector('#progress-div');
    const progressBar = progressDiv.querySelector('.progress-bar');
    const progressInfo = resetCourseForm.querySelector('#progress-info');
    const resetBtn = resetCourseForm.querySelector('#resetBtn');
    const uploadBtn = resetCourseForm.querySelector('#uploadBtn');
    const courseTextDiv = resetCourseForm.querySelector('#course-text-div');
    const courseTextArea = resetCourseForm.querySelector('#reset-courses-area');
    courseTextArea.addEventListener('input', (e) => {
        const inputSwitch = resetCourseForm.querySelector('#manual-courses-reset-switch');
        if (courseTextArea.value.length < 1 || !inputSwitch.checked) {
            resetBtn.disabled = true;
        } else {
            resetBtn.disabled = false;
        }
    });
    const switches = resetCourseForm.querySelector('#reset-switches');
    switches.addEventListener('change', (e) => {
        const inputs = switches.querySelectorAll('input');

        // disable all inputs other than the one that's checked
        for (let input of inputs) {
            if (input.id !== e.target.id) {
                input.checked = false;
            }
        }

        // if nothing is checked disable and hide all buttons
        if (!e.target.checked) {
            for (let input of inputs) {
                input.checked = false;
            }
            resetBtn.disabled = true;
            uploadBtn.disabled = true;
        } else if (e.target.id === 'upload-courses-switch') {
            resetBtn.disabled = true;
            resetBtn.hidden = true;
            courseTextDiv.hidden = true;
            uploadBtn.disabled = false;
            uploadBtn.hidden = false;
        } else {
            resetBtn.hidden = false;
            courseTextDiv.hidden = false;
            uploadBtn.disabled = true;
            uploadBtn.hidden = true;
        }
    })

    uploadBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        uploadBtn.disabled = true;
        progressInfo.innerHTML = '';
        progressDiv.hidden = false;

        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();

        let courses = [];
        try {
            courses = await window.fileUpload.resetCourse();
        } catch (error) {
            errorHandler(error, progressInfo);
        }

        if (courses.length > 0) {
            const data = {
                domain: domain,
                token: apiToken,
                courses: courses
            }

            let response;
            try {
                window.progressAPI.onUpdateProgress((progress) => {
                    progressBar.style.width = `${progress}%`;
                });

                response = await window.axios.resetCourses(data);
                if (response.successful.length > 0) {
                    progressInfo.innerHTML = `Successfully reset ${response.successful.length} course(s).`;
                }
                if (response.failed.length > 0) {
                    progressInfo.innerHTML += `Failed to reset ${response.failed.length} course(s).`;
                    progressBar.parentElement.hidden = true;
                    errorHandler({ message: `${response.failed[0].reason}` }, progressInfo); // only display the error code for the first failed request
                    // for (let failure of response.failed) {
                    // }
                }

                // for (let response of responses) {
                //     eContent.querySelector('#response-container').innerHTML += '<p>Course ID: ' + response.course_id + ' ' + response.status + '</p>';
                // }
            } catch (error) {
                errorHandler(error, progressInfo);
            } finally {
                uploadBtn.disabled = false;
            }
        }
    })

    resetBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();


        resetBtn.disabled = true;
        progressDiv.hidden = false;
        progressInfo.innerHTML = 'Resetting courses....';

        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();
        const courses = resetCourseForm.querySelector('#reset-courses-area').value.split(/[\n,]/).map(course => course.trim());

        const data = {
            domain: domain,
            token: apiToken,
            courses: courses
        }

        let response;
        try {
            window.progressAPI.onUpdateProgress((progress) => {
                progressBar.style.width = `${progress}%`;
            });

            response = await window.axios.resetCourses(data);
            if (response.successful.length > 0) {
                progressInfo.innerHTML = `Successfully reset ${response.successful.length} course(s).`;
            }
            if (response.failed.length > 0) {
                progressInfo.innerHTML += `Failed to reset ${response.failed.length} course(s).`;
                progressBar.parentElement.hidden = true;
                for (let failure of response.failed) {
                    errorHandler({ message: `${failure.reason}` }, progressInfo);
                }
            }

            // for (let response of responses) {
            //     eContent.querySelector('#response-container').innerHTML += '<p>Course ID: ' + response.course_id + ' ' + response.status + '</p>';
            // }
        } catch (error) {
            errorHandler(error, progressInfo);
        } finally {
            resetBtn.disabled = false;
        }
    })

    // adding response container
    // const eResponse = document.createElement('div');
    // eResponse.id = "response-container";
    // eResponse.classList.add('mt-5');
    // eContent.append(eResponse);
}

async function createSupportCourse(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createSupportCourseForm = eContent.querySelector('#create-support-courses-form');

    // Declare saveTimer and related functions at the top of the function scope
    const STORAGE_KEY = 'createSupportCourse_defaults';
    let saveTimer;

    function saveDefaults() {
        try {
            const cfg = collectConfigFromForm();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        } catch { /* no-op */ }
    }

    function saveDefaultsDebounced() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveDefaults, 200);
    }

    if (!createSupportCourseForm) {
        createSupportCourseForm = document.createElement('form');
        createSupportCourseForm.id = 'create-support-courses-form';


        // eContent.innerHTML = `
        //     <div>
        //         <h3>Create Support Course</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');

        createSupportCourseForm.innerHTML = `
            <div>
                <h3>Create Support Course</h3>
            </div>
            <div id="course-options">
                <div class="row mb-3">
                    <div class="col-6">
                        <label for="course-name" class="form-label">Course name</label>
                        <input type="text" class="form-control" id="course-name" placeholder="e.g., Support Course">
                    </div>
                </div>
                <div class="row g-3 align-items-center mb-3">
                    <div class="col-auto form-check form-switch">
                        <label for="course-publish" class="form-label">Publish</label>
                        <input type="checkbox" class="form-check-input" role="switch" id="course-publish">
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-blueprint" class="form-label">Blueprint</label>
                        <input type="checkbox" class="form-check-input" role="switch" id="course-blueprint">
                    </div>
                </div>
                <div id="add-ac-courses-div" class="row hidden">
                    <div class="col-auto">
                        <label class="form-label">Number of courses to associate</label>
                        <input id="csc-ac-input" class="form-control" type="text" />
                        <div class="col-auto">
                            <span id="ac-course-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                </div>
                <!-- Users section now visible -->
                <div class="col-auto form-check form-switch mb-2 mt-3">
                    <label for="course-add-users" class="form-label">Add Users</label>
                    <input type="checkbox" class="form-check-input" role="switch" id="course-add-users">
                </div>
                <div id="add-users-div" class="row hidden">
                    <div class="col-4">
                        <label for="user-email" class="form-label">Email</label>
                        <input type="text" class="form-control" role="switch" id="user-email">
                        <div id="course-reset-description" class="form-text">NOTE: Your instructure email. Used to create emails for the new users so they can receive notifications.</div>
                    </div>
                    <div class="col-2">
                        <label for="course-add-students" class="form-label">Students</label>
                        <input type="text" class="form-control" role="switch" id="course-add-students">
                        <div class="col-auto">
                            <span id="add-students-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                    <div class="col-2">
                        <label for="course-add-teachers" class="form-label">Teachers</label>
                        <input type="text" class="form-control" role="switch" id="course-add-teachers">
                        <div class="col-auto">
                            <span id="add-teachers-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                </div>

                <!-- Content selection: pick a type and quantity -->
                <div class="row mt-3">
                    <div class="col-2">
                        <label for="csc-content-type" class="form-label">Content type</label>
                        <select id="csc-content-type" class="form-select">
                            <option value="assignments">Assignments</option>
                            <option value="classicQuizzes">Classic Quizzes</option>
                            <option value="newQuizzes">New Quizzes</option>
                            <option value="discussions">Discussions</option>
                            <option value="pages">Pages</option>
                            <option value="modules">Modules</option>
                            <option value="sections">Sections</option>
                        </select>
                    </div>
                    <div class="col-1">
                        <label for="csc-content-qty" class="form-label">Quantity</label>
                        <input id="csc-content-qty" type="text" class="form-control" placeholder="e.g., 5">
                    </div>
                    <div class="col-1">
                        <label class="form-label mb-1" for="csc-content-status">Publish</label>
                        <div class="form-check form-switch">
                            <input id="csc-content-status" type="checkbox" class="form-check-input" role="switch">
                            <label class="form-check-label visually-hidden" for="csc-content-status">Publish</label>
                        </div>
                    </div>
                    <div class="col-1" id="csc-quiz-questions-toggle" hidden>
                        <label class="form-label mb-1" for="csc-add-questions">Add Questions</label>
                        <div class="form-check form-switch">
                            <input id="csc-add-questions" type="checkbox" class="form-check-input" role="switch">
                            <label class="form-check-label visually-hidden" for="csc-add-questions">Add Questions</label>
                        </div>
                    </div>
                    <div class="col-1" id="csc-newq-questions-toggle" hidden>
                        <label class="form-label mb-1" for="csc-add-newq-questions">Add Questions</label>
                        <div class="form-check form-switch">
                            <input id="csc-add-newq-questions" type="checkbox" class="form-check-input" role="switch">
                            <label class="form-check-label visually-hidden" for="csc-add-newq-questions">Add Questions</label>
                        </div>
                    </div>
                    
                    <div class="col-auto d-flex align-items-end">
                        <button type="button" class="btn btn-secondary me-2" id="csc-content-add">Add/Update</button>
                        <button type="button" class="btn btn-link" id="csc-content-clear">Clear all</button>
                    </div>
                </div>
                
                <!-- Quiz Questions Selection Panel -->
                <div id="csc-quiz-questions-panel" class="mt-3" hidden>
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Question Types for Classic Quizzes</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-auto">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="select-all-questions">
                                        <label class="form-check-label fw-bold" for="select-all-questions">
                                            Select All
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="multiple_choice_question" id="q-multiple-choice">
                                        <label class="form-check-label" for="q-multiple-choice">
                                            Multiple Choice
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="true_false_question" id="q-true-false">
                                        <label class="form-check-label" for="q-true-false">
                                            True/False
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="fill_in_multiple_blanks_question" id="q-fill-blanks">
                                        <label class="form-check-label" for="q-fill-blanks">
                                            Fill in Multiple Blanks
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="short_answer_question" id="q-fill-blank">
                                        <label class="form-check-label" for="q-fill-blank">
                                            Fill in the Blank
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="multiple_answers_question" id="q-multiple-answers">
                                        <label class="form-check-label" for="q-multiple-answers">
                                            Multiple Answers
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="multiple_dropdowns_question" id="q-multiple-dropdowns">
                                        <label class="form-check-label" for="q-multiple-dropdowns">
                                            Multiple Dropdowns
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="matching_question" id="q-matching">
                                        <label class="form-check-label" for="q-matching">
                                            Matching
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="numerical_question" id="q-numerical">
                                        <label class="form-check-label" for="q-numerical">
                                            Numerical Answer
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="calculated_question" id="q-calculated">
                                        <label class="form-check-label" for="q-calculated">
                                            Formula Question
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input question-type-checkbox" type="checkbox" value="essay_question" id="q-essay">
                                        <label class="form-check-label" for="q-essay">
                                            Essay Question
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- New Quizzes Questions Selection Panel -->
                <div id="csc-newq-questions-panel" class="mt-3" hidden>
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Question Types for New Quizzes</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-auto">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="select-all-newq-questions">
                                        <label class="form-check-label fw-bold" for="select-all-newq-questions">Select All</label>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="multiple_choice" id="nq-multiple-choice">
                                        <label class="form-check-label" for="nq-multiple-choice">Multiple Choice</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="multi_answer" id="nq-multi-answer">
                                        <label class="form-check-label" for="nq-multi-answer">Multiple Answer</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="true_false" id="nq-true-false">
                                        <label class="form-check-label" for="nq-true-false">True/False</label>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="essay" id="nq-essay">
                                        <label class="form-check-label" for="nq-essay">Essay</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="numeric" id="nq-numeric">
                                        <label class="form-check-label" for="nq-numeric">Numeric</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="fill_in_blank" id="nq-fill-blank">
                                        <label class="form-check-label" for="nq-fill-blank">Fill in the Blank</label>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="matching" id="nq-matching">
                                        <label class="form-check-label" for="nq-matching">Matching</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="categorization" id="nq-categorization">
                                        <label class="form-check-label" for="nq-categorization">Categorization</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="ordering" id="nq-ordering">
                                        <label class="form-check-label" for="nq-ordering">Ordering</label>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="file_upload" id="nq-file-upload">
                                        <label class="form-check-label" for="nq-file-upload">File Upload</label>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="formula" id="nq-formula">
                                        <label class="form-check-label" for="nq-formula">Formula</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="csc-content-summary" class="form-text mt-1"></div>

                <!-- Hidden fields to drive create logic (presets will populate) -->
                <div id="csc-hidden-fields" class="hidden">
                    <div class="mb-2 fw-semibold">Optional content</div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-assignments" class="form-label">Add Assignments</label>
                        <input type="checkbox" class="form-check-input" role="switch" id="course-assignments" >
                    </div>
                    <div id="add-assignments-div" class="row hidden">
                        <div class="col-2">
                            <label for="course-add-assignments" class="form-label">How many</label>
                            <input type="text" class="form-control" role="switch" id="course-add-assignments">
                        </div>
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-add-cq" class="form-label">Add Classic Quizzes</label>
                        <input type="checkbox" class="form-check-input" role="switch" id="course-add-cq">
                    </div>
                    <div id="add-cq-div" class="row hidden">
                        <div class="col-2">
                            <label for="course-add-cq-num" class="form-label">How many</label>
                            <input type="text" class="form-control" id="course-add-cq-num" aria-describedby="cq-num-help">
                            <div id="cq-num-help" class="form-text">Enter a positive number</div>
                        </div>
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-add-nq" class="form-label">Add New Quizzes</label>
                        <input type="checkbox" class="form-check-input"  role="switch" id="course-add-nq">
                    </div>
                    <div id="add-nq-div" class="row hidden">
                        <div class="col-2">
                            <label for="course-add-nq-num" class="form-label">How many</label>
                            <input type="text" class="form-control" id="course-add-nq-num" aria-describedby="nq-num-help">
                            <div id="nq-num-help" class="form-text">Enter a positive number</div>
                        </div>
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-add-discussions" class="form-label">Add Discussions</label>
                        <input type="checkbox" class="form-check-input"  role="switch" id="course-add-discussions">
                    </div>
                    <div id="add-discussions-div" class="row hidden">
                        <div class="col-2">
                            <label for="course-add-discussions-num" class="form-label">How many</label>
                            <input type="text" class="form-control" id="course-add-discussions-num" aria-describedby="discussions-num-help">
                            <div id="discussions-num-help" class="form-text">Enter a positive number</div>
                        </div>
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-add-pages" class="form-label">Add Pages</label>
                        <input type="checkbox" class="form-check-input"  role="switch" id="course-add-pages">
                    </div>
                    <div id="add-pages-div" class="row hidden">
                        <div class="col-2">
                            <label for="course-add-pages-num" class="form-label">How many</label>
                            <input type="text" class="form-control" id="course-add-pages-num" aria-describedby="pages-num-help">
                            <div id="pages-num-help" class="form-text">Enter a positive number</div>
                        </div>
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-add-modules" class="form-label">Add Modules</label>
                        <input type="checkbox" class="form-check-input"  role="switch" id="course-add-modules">
                    </div>
                    <div id="add-modules-div" class="row hidden">
                        <div class="col-2">
                            <label for="course-add-modules-num" class="form-label">How many</label>
                            <input type="text" class="form-control" id="course-add-modules-num" aria-describedby="modules-num-help">
                            <div id="modules-num-help" class="form-text">Enter a positive number</div>
                        </div>
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-add-sections" class="form-label">Add Sections</label>
                        <input type="checkbox" class="form-check-input"  role="switch" id="course-add-sections">
                    </div>
                    <div id="add-sections-div" class="row hidden">
                        <div class="col-2">
                            <label for="course-add-sections-num" class="form-label">How many</label>
                            <input type="text" class="form-control" id="course-add-sections-num" aria-describedby="sections-num-help">
                            <div id="sections-num-help" class="form-text">Enter a positive number</div>
                        </div>
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-submissions" class="form-label" disabled><em style="color: gray;">Create Submissions - Disabled</em></label>
                        <input type="checkbox" class="form-check-input" role="switch" id="course-submissions" disabled>
                    </div>
                </div>
            </div>
            <button type="button" class="btn btn-primary mt-3" id="create-course-btn">Create</button>
            <div id="csc-progress-div" hidden>
                <p id="csc-progress-info"></p>
                <div id="csc-status-list" class="mb-3" style="max-height: 300px; overflow-y: auto; border: 1px solid #e9ecef; border-radius: 0.375rem; padding: 0.75rem; background-color: #f8f9fa;"></div>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id='csc-response-container'></div>`

        eContent.append(createSupportCourseForm);
    }
    createSupportCourseForm.hidden = false;

    // Helpers
    function isPositiveInt(val) {
        if (val === undefined || val === null) return false;
        const v = String(val).trim();
        if (v.length === 0) return false;
        const n = Number(v);
        return Number.isInteger(n) && n > 0;
    }
    // Content selection handlers
    const contentTypeSel = createSupportCourseForm.querySelector('#csc-content-type');
    const contentQtyInput = createSupportCourseForm.querySelector('#csc-content-qty');
    const contentAddBtn = createSupportCourseForm.querySelector('#csc-content-add');
    const contentClearBtn = createSupportCourseForm.querySelector('#csc-content-clear');
    const contentSummary = createSupportCourseForm.querySelector('#csc-content-summary');
    const contentPublishSwitch = createSupportCourseForm.querySelector('#csc-content-status');

    const map = [
        ['assignments', '#course-assignments', '#add-assignments-div', '#course-add-assignments', 'Assignments'],
        ['classicQuizzes', '#course-add-cq', '#add-cq-div', '#course-add-cq-num', 'Classic Quizzes'],
        ['newQuizzes', '#course-add-nq', '#add-nq-div', '#course-add-nq-num', 'New Quizzes'],
        ['discussions', '#course-add-discussions', '#add-discussions-div', '#course-add-discussions-num', 'Discussions'],
        ['pages', '#course-add-pages', '#add-pages-div', '#course-add-pages-num', 'Pages'],
        ['modules', '#course-add-modules', '#add-modules-div', '#course-add-modules-num', 'Modules'],
        ['sections', '#course-add-sections', '#add-sections-div', '#course-add-sections-num', 'Sections'],
    ];

    // Track publish state per content type (persisted via config)
    let publishByType = {
        assignments: true,
        classicQuizzes: true,
        newQuizzes: true,
        discussions: true,
        pages: true,
        modules: true,   // modules/sections don't truly publish, kept for consistency
        sections: true
    };

    function renderSummary() {
        const items = [];
        for (const [key, toggleSel, , inputSel, label] of map) {
            const togg = createSupportCourseForm.querySelector(toggleSel);
            const input = createSupportCourseForm.querySelector(inputSel);
            const num = input?.value?.trim();
            if (togg?.checked && isPositiveInt(num)) {
                const pub = publishByType?.[key];
                const pubLabel = (key === 'modules' || key === 'sections') ? '' : (pub ? ' (published)' : ' (unpublished)');
                items.push(`${label}: ${num}${pubLabel}`);
            }
        }
        contentSummary.textContent = items.length ? `Will create → ${items.join(', ')}` : 'No additional content selected.';
    }

    function setContent(key, qty) {
        const entry = map.find(m => m[0] === key);
        if (!entry) return;
        const [, toggleSel, divSel, inputSel] = entry;
        const toggle = createSupportCourseForm.querySelector(toggleSel);
        const div = createSupportCourseForm.querySelector(divSel);
        const input = createSupportCourseForm.querySelector(inputSel);
        if (isPositiveInt(qty)) {
            if (toggle) toggle.checked = true;
            if (div) { div.classList.remove('hidden'); div.classList.add('visible', 'mb-3'); }
            if (input) input.value = String(qty);
        } else {
            // zero/empty qty removes selection
            if (toggle) toggle.checked = false;
            if (div) { div.classList.add('hidden'); div.classList.remove('visible', 'mb-3'); }
            if (input) input.value = '';
        }
        renderSummary();
    }

    // When type changes, reflect saved publish choice for that type
    function publishApplicable(key) {
        return !(key === 'modules' || key === 'sections');
    }

    // Quiz Questions functionality - Define before use
    const quizQuestionsToggle = createSupportCourseForm.querySelector('#csc-quiz-questions-toggle');
    const addQuestionsSwitch = createSupportCourseForm.querySelector('#csc-add-questions');
    const quizQuestionsPanel = createSupportCourseForm.querySelector('#csc-quiz-questions-panel');
    const selectAllCheckbox = createSupportCourseForm.querySelector('#select-all-questions');
    const questionTypeCheckboxes = createSupportCourseForm.querySelectorAll('.question-type-checkbox');
    // New Quizzes counterparts
    const newQQuestionsToggle = createSupportCourseForm.querySelector('#csc-newq-questions-toggle');
    const addNewQQuestionsSwitch = createSupportCourseForm.querySelector('#csc-add-newq-questions');
    const newQQuestionsPanel = createSupportCourseForm.querySelector('#csc-newq-questions-panel');
    const selectAllNewQCheckbox = createSupportCourseForm.querySelector('#select-all-newq-questions');
    const newQQuestionTypeCheckboxes = createSupportCourseForm.querySelectorAll('.newq-question-type-checkbox');

    // Track selected question types
    let selectedQuestionTypes = [];
    let selectedNewQQuestionTypes = [];

    function toggleQuizQuestionsVisibility(contentType) {
        if (contentType === 'classicQuizzes') {
            quizQuestionsToggle.hidden = false;
            newQQuestionsToggle.hidden = true;
            newQQuestionsPanel.hidden = true;
            if (addNewQQuestionsSwitch) addNewQQuestionsSwitch.checked = false;
        } else if (contentType === 'newQuizzes') {
            newQQuestionsToggle.hidden = false;
            quizQuestionsToggle.hidden = true;
            quizQuestionsPanel.hidden = true;
            if (addQuestionsSwitch) addQuestionsSwitch.checked = false;
        } else {
            // For any other content type, hide both quiz question panels
            quizQuestionsToggle.hidden = true;
            quizQuestionsPanel.hidden = true;
            if (addQuestionsSwitch) addQuestionsSwitch.checked = false;
            newQQuestionsToggle.hidden = true;
            newQQuestionsPanel.hidden = true;
            if (addNewQQuestionsSwitch) addNewQQuestionsSwitch.checked = false;
        }
    }

    function updateSelectedQuestionTypes() {
        selectedQuestionTypes = Array.from(questionTypeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    }

    function updateSelectedNewQQuestionTypes() {
        selectedNewQQuestionTypes = Array.from(newQQuestionTypeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    }

    if (addQuestionsSwitch) {
        addQuestionsSwitch.addEventListener('change', () => {
            if (addQuestionsSwitch.checked) {
                quizQuestionsPanel.hidden = false;
            } else {
                quizQuestionsPanel.hidden = true;
                // Clear all question type selections
                questionTypeCheckboxes.forEach(cb => cb.checked = false);
                selectAllCheckbox.checked = false;
                selectedQuestionTypes = [];
            }
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    if (addNewQQuestionsSwitch) {
        addNewQQuestionsSwitch.addEventListener('change', () => {
            if (addNewQQuestionsSwitch.checked) {
                newQQuestionsPanel.hidden = false;
            } else {
                newQQuestionsPanel.hidden = true;
                newQQuestionTypeCheckboxes.forEach(cb => cb.checked = false);
                selectAllNewQCheckbox.checked = false;
                selectedNewQQuestionTypes = [];
            }
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const isChecked = selectAllCheckbox.checked;
            questionTypeCheckboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            updateSelectedQuestionTypes();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    if (selectAllNewQCheckbox) {
        selectAllNewQCheckbox.addEventListener('change', () => {
            const isChecked = selectAllNewQCheckbox.checked;
            newQQuestionTypeCheckboxes.forEach(cb => cb.checked = isChecked);
            updateSelectedNewQQuestionTypes();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    questionTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedQuestionTypes();
            // Update "Select All" checkbox state
            const allChecked = Array.from(questionTypeCheckboxes).every(cb => cb.checked);
            const noneChecked = Array.from(questionTypeCheckboxes).every(cb => !cb.checked);
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    });

    newQQuestionTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedNewQQuestionTypes();
            const allChecked = Array.from(newQQuestionTypeCheckboxes).every(cb => cb.checked);
            const noneChecked = Array.from(newQQuestionTypeCheckboxes).every(cb => !cb.checked);
            selectAllNewQCheckbox.checked = allChecked;
            selectAllNewQCheckbox.indeterminate = !allChecked && !noneChecked;
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    });

    if (contentTypeSel && contentPublishSwitch) {
        const syncPublishSwitchState = (key) => {
            const applicable = publishApplicable(key);
            const saved = publishByType?.[key];
            contentPublishSwitch.disabled = !applicable;
            contentPublishSwitch.checked = applicable && typeof saved === 'boolean' ? saved : false;
            contentPublishSwitch.title = applicable ? '' : 'Publish is not applicable for Modules and Sections';
        };

        contentTypeSel.addEventListener('change', () => {
            const key = contentTypeSel.value;
            syncPublishSwitchState(key);
            toggleQuizQuestionsVisibility(key);
        });
        // Initialize on load
        const initKey = contentTypeSel.value;
        syncPublishSwitchState(initKey);
        toggleQuizQuestionsVisibility(initKey);

        // Ensure New Quizzes panel is hidden initially unless "newQuizzes" is selected
        if (initKey !== 'newQuizzes') {
            newQQuestionsPanel.hidden = true;
            if (addNewQQuestionsSwitch) addNewQQuestionsSwitch.checked = false;
        }
        // Keep the map updated if user toggles publish for the current type
        contentPublishSwitch.addEventListener('change', () => {
            const key = contentTypeSel.value;
            if (publishApplicable(key)) {
                publishByType[key] = !!contentPublishSwitch.checked;
                renderSummary();
                if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
            }
        });
    }

    if (contentAddBtn) {
        contentAddBtn.addEventListener('click', (ev) => {
            ev.preventDefault(); ev.stopPropagation();
            const key = contentTypeSel?.value;
            const qty = contentQtyInput?.value;
            setContent(key, qty);
            if (contentPublishSwitch && key) publishByType[key] = !!contentPublishSwitch.checked;
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    if (contentClearBtn) {
        contentClearBtn.addEventListener('click', (ev) => {
            ev.preventDefault(); ev.stopPropagation();
            for (const [key] of map) {
                setContent(key, '');
                // don't clear publishByType; user choice can persist
            }
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    renderSummary();

    // const eResponse = document.createElement('div');
    // eResponse.id = "response-container";
    // eResponse.classList.add('mt-5');
    // eContent.append(eResponse);

    const courseEventHandlers = {
        'course-blueprint': courseBPToggle,
        'course-add-users': courseAddUserToggle,
        'course-assignments': courseAssignmentsToggle,
        'course-add-cq': courseAddClassicToggle, // TODO
        'course-add-nq': courseAddNewQToggle,   // TODO
        'course-add-discussions': courseAddDiscussionsToggle, // TODO
        'course-add-pages': courseAddPagesToggle, // TODO
        'course-add-modules': courseAddModulesToggle, // TODO
        'course-add-sections': courseAddSectionsToggle, // TODO
        'course-submissions': courseCreateSubmissionsToggle // TODO
    };

    const courseOptions = createSupportCourseForm.querySelector('#course-options');
    courseOptions.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const handler = courseEventHandlers[e.target.id];
        if (handler) {
            handler(e);
        }
        // switch (e.target.id) {
        //     case 'course-blueprint':
        //         courseBPToggle(e);
        //         break;
        //     case 'course-add-users':
        //         courseAddUserToggle(e);
        //         break;
        //     case 'course-assignments':
        //         courseAssignmentsToggle(e);
        //         break;
        //     case 'course-add-cq':
        //         courseAddClassicToggle(e); // TODO
        //         break;
        //     case 'course-add-nq':
        //         courseAddNewQToggle(e); // TODO
        //         break;
        //     case 'course-add-discussions':
        //         courseAddDiscussionsToggle(e); // TODO
        //         break;
        //     case 'course-add-pages':
        //         courseAddPagesToggle(e); // TODO
        //         break;
        //     case 'course-add-modules':
        //         courseAddModulesToggle(e); // TODO
        //         break;
        //     case 'course-add-sections':
        //         courseAddSectionsToggle(e); // TODO
        //         break;
        //     case 'course-submissions':
        //         courseCreateSubmissionsToggle(e); // TODO
        //         break;
        //     default:
        //         break;
        // }
    })

    function courseBPToggle(e) {
        const bpCourseDiv = createSupportCourseForm.querySelector('#add-ac-courses-div');
        if (e.target.checked) {
            bpCourseDiv.classList.remove('hidden');
            bpCourseDiv.classList.add('visible', 'mb-3');
        } else {
            bpCourseDiv.classList.add('hidden');
            bpCourseDiv.classList.remove('visible', 'mb-3');
        }
    }

    function courseAddUserToggle(e) {
        const addUsersDiv = createSupportCourseForm.querySelector('#add-users-div');
        if (e.target.checked) {
            addUsersDiv.classList.remove('hidden');
            addUsersDiv.classList.add('visible', 'mb-3');
        } else {
            addUsersDiv.classList.remove('visible', 'mb-3');
            addUsersDiv.classList.add('hidden');
        }
    }

    function courseAssignmentsToggle(e) {
        const addAssignmentDiv = createSupportCourseForm.querySelector('#add-assignments-div');
        if (e.target.checked) {
            addAssignmentDiv.classList.add('visible', 'mb-3');
            addAssignmentDiv.classList.remove('hidden');
        } else {
            addAssignmentDiv.classList.add('hidden');
            addAssignmentDiv.classList.remove('visible', 'mb-3');
        }
    }

    function courseAddClassicToggle(e) {
        const addCQDiv = createSupportCourseForm.querySelector('#add-cq-div');
        if (e.target.checked) {
            addCQDiv.classList.add('visible', 'mb-3');
            addCQDiv.classList.remove('hidden');
        } else {
            addCQDiv.classList.add('hidden');
            addCQDiv.classList.remove('visible', 'mb-3');
        }
    }
    function courseAddNewQToggle(e) {
        const addNQDiv = createSupportCourseForm.querySelector('#add-nq-div');
        if (e.target.checked) {
            addNQDiv.classList.add('visible', 'mb-3');
            addNQDiv.classList.remove('hidden');
        } else {
            addNQDiv.classList.add('hidden');
            addNQDiv.classList.remove('visible', 'mb-3');
        }
    }
    function courseAddDiscussionsToggle(e) {
        const addDiv = createSupportCourseForm.querySelector('#add-discussions-div');
        if (e.target.checked) {
            addDiv.classList.add('visible', 'mb-3');
            addDiv.classList.remove('hidden');
        } else {
            addDiv.classList.add('hidden');
            addDiv.classList.remove('visible', 'mb-3');
        }
    }
    function courseAddPagesToggle(e) {
        const addDiv = createSupportCourseForm.querySelector('#add-pages-div');
        if (e.target.checked) {
            addDiv.classList.add('visible', 'mb-3');
            addDiv.classList.remove('hidden');
        } else {
            addDiv.classList.add('hidden');
            addDiv.classList.remove('visible', 'mb-3');
        }
    }
    function courseAddModulesToggle(e) {
        const addDiv = createSupportCourseForm.querySelector('#add-modules-div');
        if (e.target.checked) {
            addDiv.classList.add('visible', 'mb-3');
            addDiv.classList.remove('hidden');
        } else {
            addDiv.classList.add('hidden');
            addDiv.classList.remove('visible', 'mb-3');
        }
    }
    function courseAddSectionsToggle(e) {
        const addDiv = createSupportCourseForm.querySelector('#add-sections-div');
        if (e.target.checked) {
            addDiv.classList.add('visible', 'mb-3');
            addDiv.classList.remove('hidden');
        } else {
            addDiv.classList.add('hidden');
            addDiv.classList.remove('visible', 'mb-3');
        }
    }
    function courseCreateSubmissionsToggle(e) {

    }
    // const addUsersToggle = eContent.querySelector('#course-add-users');
    // addUsersToggle.addEventListener('change', (e) => {
    //     e.preventDefault();
    // persist on any option change
    if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();

    function collectConfigFromForm() {
        const cfg = {
            publish: !!createSupportCourseForm.querySelector('#course-publish')?.checked,
            blueprint: !!createSupportCourseForm.querySelector('#course-blueprint')?.checked,
            associated: createSupportCourseForm.querySelector('#csc-ac-input')?.value?.trim() || '',
            users: {
                enabled: !!createSupportCourseForm.querySelector('#course-add-users')?.checked,
                email: createSupportCourseForm.querySelector('#user-email')?.value?.trim() || '',
                students: createSupportCourseForm.querySelector('#course-add-students')?.value?.trim() || '',
                teachers: createSupportCourseForm.querySelector('#course-add-teachers')?.value?.trim() || '',
            },
            content: {},
            publishByType: { ...publishByType },
            quizQuestions: {
                enabled: !!createSupportCourseForm.querySelector('#csc-add-questions')?.checked,
                selectedTypes: [...selectedQuestionTypes]
            },
            newQuizQuestions: {
                enabled: !!createSupportCourseForm.querySelector('#csc-add-newq-questions')?.checked,
                selectedTypes: [...selectedNewQQuestionTypes]
            }
        };
        for (const [key, toggleSel, , inputSel] of map) {
            const togg = createSupportCourseForm.querySelector(toggleSel);
            const val = createSupportCourseForm.querySelector(inputSel)?.value?.trim();
            if (togg?.checked && isPositiveInt(val)) cfg.content[key] = Number(val);
        }
        return cfg;
    }

    function applyConfig(cfg) {
        try {
            // publish / blueprint
            const publish = createSupportCourseForm.querySelector('#course-publish');
            const blueprint = createSupportCourseForm.querySelector('#course-blueprint');
            const acInput = createSupportCourseForm.querySelector('#csc-ac-input');
            if (publish) publish.checked = !!cfg.publish;
            if (blueprint) {
                blueprint.checked = !!cfg.blueprint;
                courseBPToggle({ target: blueprint });
            }
            if (acInput) acInput.value = cfg.associated || '';

            // users
            const usersToggle = createSupportCourseForm.querySelector('#course-add-users');
            const email = createSupportCourseForm.querySelector('#user-email');
            const students = createSupportCourseForm.querySelector('#course-add-students');
            const teachers = createSupportCourseForm.querySelector('#course-add-teachers');
            if (usersToggle) {
                usersToggle.checked = !!cfg.users?.enabled;
                courseAddUserToggle({ target: usersToggle });
            }
            if (email) email.value = cfg.users?.email || '';
            if (students) students.value = cfg.users?.students || '';
            if (teachers) teachers.value = cfg.users?.teachers || '';

            // restore publish per type
            if (cfg.publishByType && typeof cfg.publishByType === 'object') {
                publishByType = { ...publishByType, ...cfg.publishByType };
                // reflect current type switch
                if (contentTypeSel && contentPublishSwitch) {
                    const key = contentTypeSel.value;
                    if (typeof publishByType[key] === 'boolean') contentPublishSwitch.checked = publishByType[key];
                }
            }

            // content
            for (const [key] of map) {
                const qty = cfg.content?.[key];
                if (qty !== undefined) setContent(key, qty);
            }

            // quiz questions
            if (cfg.quizQuestions) {
                const addQuestionsSwitch = createSupportCourseForm.querySelector('#csc-add-questions');
                const quizQuestionsPanel = createSupportCourseForm.querySelector('#csc-quiz-questions-panel');

                if (addQuestionsSwitch && cfg.quizQuestions.enabled) {
                    addQuestionsSwitch.checked = true;
                    quizQuestionsPanel.hidden = false;

                    // Restore selected question types
                    if (Array.isArray(cfg.quizQuestions.selectedTypes)) {
                        selectedQuestionTypes = [...cfg.quizQuestions.selectedTypes];
                        questionTypeCheckboxes.forEach(cb => {
                            cb.checked = selectedQuestionTypes.includes(cb.value);
                        });

                        // Update "Select All" checkbox state
                        const allChecked = Array.from(questionTypeCheckboxes).every(cb => cb.checked);
                        const noneChecked = Array.from(questionTypeCheckboxes).every(cb => !cb.checked);
                        selectAllCheckbox.checked = allChecked;
                        selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
                    }
                }
            }

            // new quiz questions
            if (cfg.newQuizQuestions) {
                const addNQSwitch = createSupportCourseForm.querySelector('#csc-add-newq-questions');
                const newQPanel = createSupportCourseForm.querySelector('#csc-newq-questions-panel');
                if (addNQSwitch && cfg.newQuizQuestions.enabled) {
                    addNQSwitch.checked = true;
                    newQPanel.hidden = false;
                    if (Array.isArray(cfg.newQuizQuestions.selectedTypes)) {
                        selectedNewQQuestionTypes = [...cfg.newQuizQuestions.selectedTypes];
                        const newQBoxes = createSupportCourseForm.querySelectorAll('.newq-question-type-checkbox');
                        newQBoxes.forEach(cb => cb.checked = selectedNewQQuestionTypes.includes(cb.value));
                        const allChecked = Array.from(newQBoxes).every(cb => cb.checked);
                        const noneChecked = Array.from(newQBoxes).every(cb => !cb.checked);
                        const selectAllNewQ = createSupportCourseForm.querySelector('#select-all-newq-questions');
                        if (selectAllNewQ) {
                            selectAllNewQ.checked = allChecked;
                            selectAllNewQ.indeterminate = !allChecked && !noneChecked;
                        }
                    }
                }
            }

            renderSummary();
        } catch { /* no-op */ }
    }

    // Load defaults on init
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const cfg = JSON.parse(raw);
            if (cfg && typeof cfg === 'object') applyConfig(cfg);
        }
    } catch { /* no-op */ }
    //     e.stopPropagation();

    //     const addUsersDiv = eContent.querySelector('#add-users-div');
    //     if (e.target.checked) {
    //         addUsersDiv.classList.remove('hidden');
    //         addUsersDiv.classList.add('visible');
    //     } else {
    //         addUsersDiv.classList.remove('visible');
    //         addUsersDiv.classList.add('hidden');
    //     }
    // });

    // function checkIfEnabled() {
    //     const addUsersDiv = eContent.querySelector('#add-users-div');
    //     if (addUsersToggle.checked) {
    //         addUsersDiv.classList.remove('hidden');
    //         addUsersDiv.classList.add('visible');
    //     } else {
    //         addUsersDiv.classList.remove('visible');
    //         addUsersDiv.classList.add('hidden');
    //     }
    // }

    const createCourseBtn = createSupportCourseForm.querySelector('#create-course-btn');
    createCourseBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        createCourseBtn.disabled = true;
        const originalBtnHTML = createCourseBtn.innerHTML;
        createCourseBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creating...';

        // Setup progress UI
        const cscProgressDiv = createSupportCourseForm.querySelector('#csc-progress-div');
        const cscProgressBar = cscProgressDiv.querySelector('.progress-bar');
        const cscProgressInfo = createSupportCourseForm.querySelector('#csc-progress-info');
        const cscStatusList = createSupportCourseForm.querySelector('#csc-status-list');
        cscProgressDiv.hidden = false;
        cscProgressBar.style.width = '0%';
        cscProgressInfo.textContent = 'Creating course...';
        cscStatusList.innerHTML = ''; // Clear any previous status items

        // Attach a progress listener once (overall progress only)
        if (!window.__cscProgressListenerAttached && window.progressAPI?.onUpdateProgress) {
            window.__cscProgressListenerAttached = true;
            window.progressAPI.onUpdateProgress((payload) => {
                try {
                    // Only show overall progress bar; labels display current section subcounts
                    if (typeof payload === 'number') {
                        cscProgressBar.style.width = `${payload}%`;
                        return;
                    }
                    if (payload && typeof payload === 'object') {
                        if (payload.label) {
                            // Suppress duplicate generic 'Adding questions to quizzes...' style logs
                            const isAddingQuestionsMsg = /Adding questions to .*quiz/i.test(payload.label) || /Adding quiz questions/i.test(payload.label);
                            if (isAddingQuestionsMsg) {
                                window.__cscLastAddingQuestionsLogged = window.__cscLastAddingQuestionsLogged || false;
                                if (window.__cscLastAddingQuestionsLogged) {
                                    // Already logged once; only update main info text and skip adding another entry
                                    cscProgressInfo.textContent = payload.label;
                                } else {
                                    window.__cscLastAddingQuestionsLogged = true;
                                }
                            }
                            // Check if this is a completion message (ends with "....done")
                            if (payload.label.endsWith('....done')) {
                                // Add this as a completed status item to the list
                                const statusItem = document.createElement('div');
                                statusItem.className = 'text-success mb-1';
                                statusItem.style.fontFamily = 'monospace';
                                statusItem.innerHTML = `✅ ${payload.label}`;
                                cscStatusList.appendChild(statusItem);

                                // Scroll to bottom to show latest status
                                cscStatusList.scrollTop = cscStatusList.scrollHeight;

                                // Keep the current progress info for ongoing operations
                                if (payload.label.includes('Course creation completed successfully')) {
                                    cscProgressInfo.textContent = 'All operations completed!';
                                } else {
                                    cscProgressInfo.textContent = 'Processing next operation...';
                                }
                            } else if (payload.label.endsWith('...') && !payload.label.includes('done') && !payload.label.includes('(') && !isAddingQuestionsMsg) {
                                // This is a starting operation - add it to the list as in-progress
                                // Exclude progress counter messages like "Creating assignments (1/5)..."
                                const statusItem = document.createElement('div');
                                statusItem.className = 'text-primary mb-1';
                                statusItem.style.fontFamily = 'monospace';
                                statusItem.innerHTML = `🔄 ${payload.label}`;
                                statusItem.id = `status-${Date.now()}`; // Unique ID for potential updates
                                cscStatusList.appendChild(statusItem);

                                // Scroll to bottom to show latest status
                                cscStatusList.scrollTop = cscStatusList.scrollHeight;

                                // Also update the main progress info
                                cscProgressInfo.textContent = payload.label;
                            } else {
                                // General progress update (like progress counters)
                                cscProgressInfo.textContent = payload.label;
                            }
                        }
                        // Only treat explicit overall percent as authoritative for the bar width
                        if (typeof payload.percent === 'number') {
                            cscProgressBar.style.width = `${payload.percent}%`;
                        } else if (payload.mode === 'done') {
                            cscProgressBar.style.width = '100%';
                        }
                    }
                } catch { /* no-op */ }
            });
        }

        const domain = document.querySelector('#domain').value;
        const apiToken = document.querySelector('#token').value;

        const createCourseResponseContainer = createSupportCourseForm.querySelector('#csc-response-container');
        createCourseResponseContainer.innerHTML = '';

        // basic course stuff
        const courseName = createSupportCourseForm.querySelector('#course-name').value;
        const coursePublishChbx = createSupportCourseForm.querySelector('#course-publish').checked;

        // blueprint stuff
        const courseBlueprintChbx = createSupportCourseForm.querySelector('#course-blueprint').checked;
        // Courses to associate
        const numACCoursesValue = createSupportCourseForm.querySelector('#csc-ac-input').value;
        const acErrorText = createSupportCourseForm.querySelector('#ac-course-text');

        // Add users stuff
        const courseAddUsersChbx = createSupportCourseForm.querySelector('#course-add-users').checked;
        // Users to add
        const emailInput = createSupportCourseForm.querySelector('#user-email').value;
        const emailMatch = emailInput.match(/^[^@]+/);
        const emailPrefix = emailMatch ? emailMatch[0] : null;
        const addStudents = createSupportCourseForm.querySelector('#course-add-students').value;
        const addStudentsText = createSupportCourseForm.querySelector('#add-students-text');
        const addTeachers = createSupportCourseForm.querySelector('#course-add-teachers').value;
        const addTeachersText = createSupportCourseForm.querySelector('#add-teachers-text');

        // add assignment stuff
        const courseAddAssignmentsChbx = createSupportCourseForm.querySelector('#course-assignments').checked;
        const numOfAssignments = createSupportCourseForm.querySelector('#course-add-assignments').value;

        // add Classic quizzes stuff
        const courseAddCQChbx = createSupportCourseForm.querySelector('#course-add-cq').checked;
        const numOfClassicQuizzes = parseInt(createSupportCourseForm.querySelector('#course-add-cq-num')?.value || '0', 10) || 0;

        // quiz questions data
        const addQuestionsEnabled = createSupportCourseForm.querySelector('#csc-add-questions')?.checked || false;
        const selectedQuestionTypesForAPI = addQuestionsEnabled ? [...selectedQuestionTypes] : [];
        const addNewQQuestionsEnabled = createSupportCourseForm.querySelector('#csc-add-newq-questions')?.checked || false;
        const selectedNewQQuestionTypesForAPI = addNewQQuestionsEnabled ? [...selectedNewQQuestionTypes] : [];

        // add New Quizzes stuff
        const courseAddNQChbx = createSupportCourseForm.querySelector('#course-add-nq').checked;
        const numOfNewQuizzes = parseInt(createSupportCourseForm.querySelector('#course-add-nq-num')?.value || '0', 10) || 0;

        // add discussion stuff
        const courseAddDiscussionsChbx = createSupportCourseForm.querySelector('#course-add-discussions').checked;
        const numOfDiscussions = parseInt(createSupportCourseForm.querySelector('#course-add-discussions-num')?.value || '0', 10) || 0;

        // add pages stuff
        const courseAddPagesChbx = createSupportCourseForm.querySelector('#course-add-pages').checked;
        const numOfPages = parseInt(createSupportCourseForm.querySelector('#course-add-pages-num')?.value || '0', 10) || 0;

        // add module stuff
        const courseAddModulesChbx = createSupportCourseForm.querySelector('#course-add-modules').checked;
        const numOfModules = parseInt(createSupportCourseForm.querySelector('#course-add-modules-num')?.value || '0', 10) || 0;

        // add section stuff
        const courseAddSectionsChbx = createSupportCourseForm.querySelector('#course-add-sections').checked;
        const numOfSections = parseInt(createSupportCourseForm.querySelector('#course-add-sections-num')?.value || '0', 10) || 0;

        // create submisison stuff
        const courseSubmissionsChbx = createSupportCourseForm.querySelector('#course-submissions').checked;


        const data = {
            domain: domain,
            token: apiToken,
            course_id: null,
            email: emailPrefix,
            course: {
                name: courseName,
                publish: coursePublishChbx,
                blueprint: {
                    state: courseBlueprintChbx,
                    associated_courses: numACCoursesValue > 0 ? numACCoursesValue : null
                },
                addUsers: {
                    state: courseAddUsersChbx,
                    students: addStudents > 0 ? addStudents : null,
                    teachers: addTeachers > 0 ? addTeachers : null
                },
                addAssignments: {
                    state: courseAddAssignmentsChbx,
                    number: numOfAssignments > 0 ? numOfAssignments : null
                },
                addCQ: {
                    state: courseAddCQChbx,
                    number: numOfClassicQuizzes > 0 ? numOfClassicQuizzes : null,
                    addQuestions: addQuestionsEnabled,
                    questionTypes: selectedQuestionTypesForAPI
                },
                addNQ: {
                    state: courseAddNQChbx,
                    number: numOfNewQuizzes > 0 ? numOfNewQuizzes : null
                },
                newQuizQuestions: {
                    addQuestions: addNewQQuestionsEnabled,
                    questionTypes: selectedNewQQuestionTypesForAPI
                },
                addDiscussions: {
                    state: courseAddDiscussionsChbx,
                    number: numOfDiscussions > 0 ? numOfDiscussions : null
                },
                addPages: {
                    state: courseAddPagesChbx,
                    number: numOfPages > 0 ? numOfPages : null
                },
                addModules: {
                    state: courseAddModulesChbx,
                    number: numOfModules > 0 ? numOfModules : null
                },
                addSections: {
                    state: courseAddSectionsChbx,
                    number: numOfSections > 0 ? numOfSections : null
                },
                // per-content publish flags
                contentPublish: { ...publishByType }
            }
        }

        console.log('The data is: ', data);

        try {
            // persist current defaults at creation time
            if (typeof saveDefaults === 'function') saveDefaults();
            const response = await window.axios.createSupportCourse(data);
            createCourseResponseContainer.innerHTML += `Done.<p>Course ID: <a id="course-link" href="https://${domain}/courses/${response.course_id}" target="_blank">${response.course_id}`;
            const courseLink = createCourseResponseContainer.querySelector('#course-link');
            courseLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('Inside courseLink click listener');
                console.log('The target is ', e.target.href);
                window.shell.openExternal(e.target.href);
            })
        } catch (error) {
            console.log('Error: ', error);
            errorHandler(error, createCourseResponseContainer);
        } finally {
            createCourseBtn.disabled = false;
            createCourseBtn.innerHTML = originalBtnHTML;
        }

    });
}

async function createAssociatedCourses(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createAssociatedCoursesForm = eContent.querySelector('#create-associated-courses-form');

    if (!createAssociatedCoursesForm) {
        createAssociatedCoursesForm = document.createElement('form');
        createAssociatedCoursesForm.id = 'create-associated-courses-form';


        // eContent.innerHTML = `
        //     <div>
        //         <h3>Create Associated Courses</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');


        createAssociatedCoursesForm.innerHTML = `
            <div id="ac-container">
                <div class="row flex-column">
                    <div class="mb-3 col-auto">
                        <label class="form-label" for="bp-course-id">Blueprint Course ID to associated courses to</label>
                    </div>
                    <div class="row">
                        <div class="mb-3 col-2">
                            <input type="text" class="form-control" id="bp-course-id" aria-describedby="bp-course-text">
                        </div>
                        <div class="col-auto">
                            <span id="bp-course-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                </div>
                <div class="row flex-column">
                    <div class="mb-3 col-auto">
                        <label class="form-label" for="num-ac-courses">How many courses do you want to associate</label>
                    </div>
                    <div class="row">
                        <div class="mb-3 col-2">
                            <input type="text" class="form-control" id="num-ac-courses" aria-describedby="ac-course-text">
                        </div>
                        <div class="col-auto">
                            <span id="ac-course-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                </div>
            </div>
            <button type="button" class="btn btn-primary mt-3" id="associateBtn">Associate</button>
            <div id="assc-progress-div" hidden>
                <p id="assc-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>`

        eContent.append(createAssociatedCoursesForm);
    }
    createAssociatedCoursesForm.hidden = false;


    const associateBtn = createAssociatedCoursesForm.querySelector('#associateBtn');
    const bpCourseText = createAssociatedCoursesForm.querySelector('#bp-course-text');
    const acCourseText = createAssociatedCoursesForm.querySelector('#ac-course-text');

    const acContainer = createAssociatedCoursesForm.querySelector('#ac-container');

    const bpInput = createAssociatedCoursesForm.querySelector('#bp-course-id');
    const acInput = createAssociatedCoursesForm.querySelector('#num-ac-courses');

    associateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        associateBtn.disabled = true;

        const bpValue = bpInput.value;
        const acValue = acInput.value;
        let inputError = true;
        let bpValid;
        let acValid;

        bpValid = validateInput(bpValue, bpCourseText);
        acValid = validateInput(acValue, acCourseText);

        if (bpValid && acValid) {
            const domain = document.querySelector('#domain').value;
            const token = document.querySelector('#token').value;
            const asscProgressDiv = createAssociatedCoursesForm.querySelector('#assc-progress-div');
            const asscProgressInfo = createAssociatedCoursesForm.querySelector('#assc-progress-info');
            const asscProgressBar = asscProgressDiv.querySelector('.progress-bar');

            const data = {
                domain: domain,
                token: token,
                bpCourseID: parseInt(bpValue),
                acCourseNum: parseInt(acValue)
            }

            // check to make sure the BP course is a BP course
            let isBluePrint = false;
            try {
                const request = await window.axios.getCourseInfo(data);
                isBluePrint = request.blueprint;
            } catch (error) {
                errorHandler(error, asscProgressInfo);
            }

            if (isBluePrint) {
                // create the courses to be added as associated courses
                try {
                    asscProgressDiv.hidden = false;
                    asscProgressBar.style.width = '0%';
                    asscProgressInfo.textContent = `Creating ${acValue} associated course(s)...`;

                    if (window.progressAPI) {
                        window.progressAPI.onUpdateProgress((progress) => {
                            asscProgressBar.style.width = `${progress}%`;
                        });
                    }

                    const courseResponse = await window.axios.createBasicCourse(data);

                    if (courseResponse.failed && courseResponse.failed.length > 0) {
                        asscProgressInfo.textContent = `Failed to create ${courseResponse.failed.length} course(s). Aborting association.`;
                        return;
                    }
                    const associatedCourses = courseResponse.successful.map(course => course.value.id);

                    // adding the ids of the courses to be associated to the data set
                    data.associated_course_ids = associatedCourses;

                    asscProgressInfo.textContent = `Associating ${associatedCourses.length} course(s) to blueprint and starting sync...`;
                    const associate = await window.axios.associateCourses(data);
                    if (associate?.workflow_state) {
                        asscProgressInfo.textContent = `Association complete. Sync status: ${associate.workflow_state}.`;
                    } else {
                        asscProgressInfo.textContent = `Association complete.`;
                    }
                    console.log('Finished associating courses.');

                    // const acResponse = await window.axios.addAssociateCourse(data);
                } catch (error) {
                    errorHandler(error, asscProgressInfo);
                } finally {
                    associateBtn.disabled = false;
                }
            } else {
                asscProgressInfo.innerHTML = 'BluePrint course isn\'t setup as blueprint. Unable to associate courses.';
                associateBtn.disabled = false;
            }
        } else {
            associateBtn.disabled = false;
        }
    });
}