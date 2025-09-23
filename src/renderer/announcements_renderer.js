// announcements_renderer.js - UI for creating Announcements (discussions with is_announcement)
function announcementTemplate(e) {
  hideEndpoints(e);

  const eContent = document.querySelector('#endpoint-content');
  let form = eContent.querySelector('#create-announcements-form');
  if (!form) {
    form = document.createElement('form');
    form.id = 'create-announcements-form';
    form.innerHTML = `
      <div>
        <h3>Create Announcements</h3>
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
          <input type="text" class="form-control" id="title" placeholder="Announcement" />
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
  const courseHelp = form.querySelector('#course-id-help');
  const numHelp = form.querySelector('#num-items-help');

  function isPositiveInt(val) {
    const n = Number(String(val).trim());
    return Number.isInteger(n) && n > 0;
  }
  function validate() {
    const cidOk = isPositiveInt(courseIdInput.value);
    courseIdInput.classList.toggle('is-invalid', !cidOk);
    courseHelp.classList.toggle('d-none', cidOk);
    const cntOk = isPositiveInt(numItemsInput.value);
    numItemsInput.classList.toggle('is-invalid', !cntOk);
    numHelp.classList.toggle('d-none', cntOk);
    createBtn.disabled = !(cidOk && cntOk);
    return !createBtn.disabled;
  }
  courseIdInput.addEventListener('input', validate);
  numItemsInput.addEventListener('input', validate);
  validate();

  createBtn.addEventListener('click', async (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (!validate()) return;
    const domain = document.querySelector('#domain').value.trim();
    const token = document.querySelector('#token').value.trim();
    const course_id = form.querySelector('#course-id').value.trim();
    const number = parseInt(form.querySelector('#num-items').value.trim(), 10) || 0;
    const title = form.querySelector('#title').value.trim() || 'Announcement';
    const message = form.querySelector('#message').value.trim();
    const published = form.querySelector('#published').checked;

    if (!course_id || number <= 0) {
      alert('Enter a Course ID and a positive number.');
      return;
    }

    createBtn.disabled = true;
    progressDiv.hidden = false;
    progressInfo.textContent = 'Creating announcements...';
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
          is_announcement: true
        });
      }
      const res = await window.axios.createAnnouncements({ requests });
      responseDiv.textContent = `Created ${res.successful.length} announcement(s)`;
    } catch (err) {
      responseDiv.textContent = err?.message || String(err);
    } finally {
      createBtn.disabled = false;
    }
  });
}

window.announcementTemplate = announcementTemplate;
