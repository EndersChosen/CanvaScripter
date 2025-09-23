// discussions_renderer.js - UI for creating Discussions
function discussionTemplate(e) {
  hideEndpoints(e);

  const eContent = document.querySelector('#endpoint-content');
  let form = eContent.querySelector('#create-discussions-form');
  if (!form) {
    form = document.createElement('form');
    form.id = 'create-discussions-form';
    form.innerHTML = `
      <div>
        <h3>Create Discussions</h3>
      </div>
      <div class="row g-3 align-items-center mb-2">
        <div class="col-2">
          <label class="form-label" for="course-id">Course ID</label>
      <input type="text" class="form-control" id="course-id" />
      <div id="course-id-help" class="form-text text-danger d-none">Course ID must be a positive number.</div>
        </div>
        <div class="col-2">
          <label class="form-label" for="num-items">How many</label>
      <input type="text" class="form-control" id="num-items" />
      <div id="num-items-help" class="form-text text-danger d-none">Enter a positive integer.</div>
        </div>
      </div>
      <div class="row g-3 align-items-center mb-2">
        <div class="col-4">
          <label class="form-label" for="title">Title prefix</label>
          <input type="text" class="form-control" id="title" placeholder="Discussion" />
        </div>
        <div class="col-6">
          <label class="form-label" for="message">Message</label>
          <input type="text" class="form-control" id="message" placeholder="Optional body" />
        </div>
        <div class="col-auto form-check form-switch">
          <label class="form-label" for="published">Publish</label>
          <input type="checkbox" class="form-check-input" role="switch" id="published" checked />
        </div>
      </div>
      <div class="row g-2 align-items-center mb-2">
        <div class="col-auto form-check form-switch">
          <label class="form-label" for="threaded">Threaded</label>
          <input type="checkbox" class="form-check-input" role="switch" id="threaded" />
        </div>
        <div class="col-auto form-check form-switch">
          <label class="form-label" for="delayed_post_at_enable">Delay posting</label>
          <input type="checkbox" class="form-check-input" role="switch" id="delayed_post_at_enable" />
        </div>
        <div class="col-auto">
      <input type="datetime-local" class="form-control" id="delayed_post_at" disabled />
      <div id="delayed-post-help" class="form-text text-danger d-none">Choose a valid date/time when delay is enabled.</div>
        </div>
      </div>
    <button type="button" class="btn btn-primary" id="create-btn" disabled>Create</button>
      <div id="progress" class="mt-3" hidden>
        <p id="progress-info"></p>
        <div class="progress" style="width:75%"><div class="progress-bar" style="width:0%"></div></div>
      </div>
      <div id="response"></div>
    `;
    eContent.append(form);
  }
  form.hidden = false;

  const createBtn = form.querySelector('#create-btn');
  const progressDiv = form.querySelector('#progress');
  const progressBar = progressDiv.querySelector('.progress-bar');
  const progressInfo = form.querySelector('#progress-info');
  const courseIdInput = form.querySelector('#course-id');
  const numItemsInput = form.querySelector('#num-items');
  const delaySwitch = form.querySelector('#delayed_post_at_enable');
  const delayInput = form.querySelector('#delayed_post_at');
  const courseHelp = form.querySelector('#course-id-help');
  const numHelp = form.querySelector('#num-items-help');
  const delayHelp = form.querySelector('#delayed-post-help');

  function isPositiveInt(val) {
    const n = Number(String(val).trim());
    return Number.isInteger(n) && n > 0;
  }
  function validate() {
    // Course ID
    const cidOk = isPositiveInt(courseIdInput.value);
    courseIdInput.classList.toggle('is-invalid', !cidOk);
    courseHelp.classList.toggle('d-none', cidOk);
    // Count
    const cntOk = isPositiveInt(numItemsInput.value);
    numItemsInput.classList.toggle('is-invalid', !cntOk);
    numHelp.classList.toggle('d-none', cntOk);
    // Delay
    const delayEnabled = delaySwitch.checked;
    delayInput.disabled = !delayEnabled;
    let delayOk = true;
    if (delayEnabled) {
      delayOk = !!delayInput.value;
    }
    delayInput.classList.toggle('is-invalid', !delayOk);
    delayHelp.classList.toggle('d-none', delayOk);

    createBtn.disabled = !(cidOk && cntOk && delayOk);
    return !createBtn.disabled;
  }

  courseIdInput.addEventListener('input', validate);
  numItemsInput.addEventListener('input', validate);
  delaySwitch.addEventListener('change', validate);
  delayInput.addEventListener('input', validate);
  // Initial state
  validate();

  createBtn.addEventListener('click', async (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (!validate()) return;
    const domain = document.querySelector('#domain').value.trim();
    const token = document.querySelector('#token').value.trim();
    const course_id = form.querySelector('#course-id').value.trim();
    const number = parseInt(form.querySelector('#num-items').value.trim(), 10) || 0;
    const title = form.querySelector('#title').value.trim() || 'Discussion';
    const message = form.querySelector('#message').value.trim();
    const published = form.querySelector('#published').checked;
    const threaded = form.querySelector('#threaded').checked;
    const delayEnabled = form.querySelector('#delayed_post_at_enable').checked;
    const delayed_post_at = delayEnabled ? form.querySelector('#delayed_post_at').value : null;

    if (!course_id || number <= 0) {
      alert('Enter a Course ID and a positive number.');
      return;
    }

    createBtn.disabled = true;
    progressDiv.hidden = false;
    progressInfo.textContent = 'Creating discussions...';
    progressBar.style.width = '0%';

    const responseDiv = form.querySelector('#response');
    responseDiv.innerHTML = '';

    try {
      const requests = [];
      for (let i = 1; i <= number; i++) {
        requests.push({
          domain, token, course_id,
          title: `${title} ${i}`,
          message,
          published,
          threaded,
          delayed_post_at
        });
      }
      // Use a renderer-to-main IPC call we will add
      const res = await window.axios.createDiscussions({ requests });
      responseDiv.textContent = `Created ${res.successful.length} discussion(s)`;
    } catch (err) {
      responseDiv.textContent = err?.message || String(err);
    } finally {
      createBtn.disabled = false;
    }
  });
}

window.discussionTemplate = discussionTemplate;
