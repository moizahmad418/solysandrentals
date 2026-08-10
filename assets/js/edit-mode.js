// ============================================================
// EDIT MODE
// ------------------------------------------------------------
// Two jobs, kept separate on purpose:
//  1. APPLY saved overrides — runs for every visitor, always.
//  2. EDITING UI — only ever shown if session-check.php says
//     the visitor is a logged-in admin.
// ============================================================

(function () {
  let overrides = {};
  let isLoggedIn = false;
  let csrfToken = '';
  let editModeActive = false;

  // ---------- 1. APPLY OVERRIDES (runs for everyone) ----------

  function applyOverrides() {
    document.querySelectorAll('[data-edit-id]').forEach(el => {
      const key = el.getAttribute('data-edit-id');
      const type = el.getAttribute('data-edit-type');
      const data = overrides[key];
      if (!data) return;

      if (type === 'text' && data.text) {
        const inner = el.querySelector(':scope > .edit-text-inner');
        if (inner) inner.innerHTML = data.text;
        else el.innerHTML = data.text;
      }

      if (type === 'image' && data.src) {
        el.setAttribute('src', data.src);
      }

      if (type === 'section') {
        if (data.padding_top) el.style.paddingTop = data.padding_top + 'px';
        if (data.padding_bottom) el.style.paddingBottom = data.padding_bottom + 'px';
        if (data.padding_left) el.style.paddingLeft = data.padding_left + 'px';
        if (data.padding_right) el.style.paddingRight = data.padding_right + 'px';
        if (data.margin_top) el.style.marginTop = data.margin_top + 'px';
        if (data.margin_bottom) el.style.marginBottom = data.margin_bottom + 'px';
        if (data.bg_image === '__removed__') {
          el.style.backgroundImage = 'none';
        } else if (data.bg_image) {
          const current = el.style.backgroundImage || '';
          const gradientMatch = current.match(/[a-z-]+gradient\([^]*?\)(?=,|$)/i);
          const newUrl = "url('" + data.bg_image + "')";
          el.style.backgroundImage = gradientMatch ? gradientMatch[0] + ', ' + newUrl : newUrl;
        }
      }

      if (type === 'button') {
        const inner = el.querySelector(':scope > .edit-text-inner');
        if (data.text && inner) inner.innerHTML = data.text;
        if (data.bg_color) el.style.backgroundColor = data.bg_color;
        if (data.text_color) el.style.color = data.text_color;
        if (data.hover_anim) el.setAttribute('data-hover-anim', data.hover_anim);
      }
    });
  }

  // ---------- 2. EDIT MODE UI (admins only) ----------

  function buildToggleButton() {
    const btn = document.createElement('button');
    btn.className = 'edit-toggle-btn';
    btn.innerHTML = '<span class="dot"></span> Edit Mode: Off';
    btn.addEventListener('click', () => {
      editModeActive = !editModeActive;
      document.body.classList.toggle('edit-mode-active', editModeActive);
      btn.classList.toggle('active', editModeActive);
      btn.innerHTML = editModeActive
        ? '<span class="dot"></span> Edit Mode: On'
        : '<span class="dot"></span> Edit Mode: Off';
      if (editModeActive) enterEditMode();
      else exitEditMode();
    });
    document.body.appendChild(btn);
  }

  function enterEditMode() {
    document.querySelectorAll('[data-edit-type="section"], a.btn[data-edit-id]').forEach(el => {
      if (el.querySelector(':scope > .edit-gear')) return;
      const gear = document.createElement('button');
      gear.type = 'button';
      gear.className = 'edit-gear';
      gear.innerHTML = '&#9881;';
      gear.title = 'Style settings';
      gear.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = el.getAttribute('data-edit-type');
        if (type === 'section') openSectionPanel(el, gear);
        else openButtonPanel(el, gear);
      });
      el.appendChild(gear);
    });

    document.querySelectorAll('[data-edit-type="text"]').forEach(el => {
      el.addEventListener('click', onTextClick);
    });

    document.querySelectorAll('[data-edit-type="image"]').forEach(el => {
      el.addEventListener('click', onImageClick);
    });

    // Prevent buttons from actually navigating away while editing.
    document.querySelectorAll('a.btn[data-edit-id]').forEach(el => {
      el.addEventListener('click', onButtonAnchorClick);
    });
  }

  function exitEditMode() {
    document.querySelectorAll('.edit-gear').forEach(el => el.remove());
    document.querySelectorAll('[data-edit-type="text"]').forEach(el => {
      el.removeEventListener('click', onTextClick);
      el.contentEditable = 'false';
    });
    document.querySelectorAll('[data-edit-type="image"]').forEach(el => {
      el.removeEventListener('click', onImageClick);
    });
    document.querySelectorAll('a.btn[data-edit-id]').forEach(el => {
      el.removeEventListener('click', onButtonAnchorClick);
    });
    closePopover();
  }

  function onButtonAnchorClick(e) {
    if (editModeActive) e.preventDefault();
  }

  function onTextClick(e) {
    if (!editModeActive) return;
    const el = e.currentTarget;
    if (el.getAttribute('contenteditable') === 'true') return;
    el.setAttribute('contenteditable', 'true');
    el.focus();

    const save = () => {
      el.removeAttribute('contenteditable');
      el.removeEventListener('blur', save);
      saveEdit(el.getAttribute('data-edit-id'), { text: el.innerHTML.trim() });
    };
    el.addEventListener('blur', save);
  }

  function onImageClick(e) {
    if (!editModeActive) return;
    e.preventDefault();
    const el = e.currentTarget;
    openImagePanel(el, el);
  }

  // ---------- Popovers ----------

  function closePopover() {
    document.querySelectorAll('.edit-popover, .edit-popover-backdrop').forEach(n => n.remove());
  }

  function positionNear(panel, anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;
    document.body.appendChild(panel);
    const panelRect = panel.getBoundingClientRect();
    if (left + panelRect.width > window.innerWidth - 16) {
      left = window.innerWidth - panelRect.width - 16;
    }
    if (top + panelRect.height > window.innerHeight - 16) {
      top = rect.top - panelRect.height - 8;
    }
    panel.style.top = Math.max(16, top) + 'px';
    panel.style.left = Math.max(16, left) + 'px';
  }

  function openPopoverShell(anchorEl) {
    closePopover();
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-popover-backdrop';
    backdrop.addEventListener('click', closePopover);
    document.body.appendChild(backdrop);

    const panel = document.createElement('div');
    panel.className = 'edit-popover';
    return panel;
  }

  function currentPx(el, prop) {
    const val = parseInt(getComputedStyle(el)[prop], 10);
    return isNaN(val) ? 0 : val;
  }

  function currentBgImageUrl(el) {
    const bg = el.style.backgroundImage || getComputedStyle(el).backgroundImage || '';
    const match = bg.match(/url\((['"]?)(.*?)\1\)/);
    return match ? match[2] : '';
  }

  function openSectionPanel(el, anchorEl) {
    const panel = openPopoverShell(anchorEl);
    panel.innerHTML = `
      <h4>Section Spacing</h4>
      <div class="edit-popover-row">
        <div class="edit-popover-field"><label>Padding Top</label><input type="number" id="ep-pt" value="${currentPx(el, 'paddingTop')}"></div>
        <div class="edit-popover-field"><label>Padding Bottom</label><input type="number" id="ep-pb" value="${currentPx(el, 'paddingBottom')}"></div>
      </div>
      <div class="edit-popover-row">
        <div class="edit-popover-field"><label>Padding Left</label><input type="number" id="ep-pl" value="${currentPx(el, 'paddingLeft')}"></div>
        <div class="edit-popover-field"><label>Padding Right</label><input type="number" id="ep-pr" value="${currentPx(el, 'paddingRight')}"></div>
      </div>
      <div class="edit-popover-row">
        <div class="edit-popover-field"><label>Margin Top</label><input type="number" id="ep-mt" value="${currentPx(el, 'marginTop')}"></div>
        <div class="edit-popover-field"><label>Margin Bottom</label><input type="number" id="ep-mb" value="${currentPx(el, 'marginBottom')}"></div>
      </div>
      <h4 style="margin-top:18px;">Background Image</h4>
      <div class="edit-popover-field">
        <label>Image URL</label>
        <input type="url" id="ep-bg-url" value="${currentBgImageUrl(el)}" placeholder="https://...">
      </div>
      <div class="edit-popover-field">
        <label>Or Upload a File</label>
        <input type="file" id="ep-bg-file" accept=".jpg,.jpeg,.png,.webp">
      </div>
      <div class="edit-popover-hint">Uploading a file takes priority over the URL above. Any existing dark overlay is preserved automatically.</div>
      <button type="button" class="edit-popover-remove-bg" id="ep-bg-remove">Remove Background Image</button>
      <div class="edit-popover-actions">
        <button class="edit-popover-cancel" type="button">Cancel</button>
        <button class="edit-popover-save" type="button">Save</button>
      </div>
    `;
    positionNear(panel, anchorEl);

    let removeRequested = false;

    panel.querySelector('.edit-popover-cancel').addEventListener('click', closePopover);
    panel.querySelector('#ep-bg-remove').addEventListener('click', () => {
      removeRequested = true;
      panel.querySelector('#ep-bg-url').value = '';
      panel.querySelector('#ep-bg-file').value = '';
      panel.querySelector('#ep-bg-remove').textContent = 'Will remove on Save';
    });

    panel.querySelector('.edit-popover-save').addEventListener('click', async () => {
      const fields = {
        padding_top: panel.querySelector('#ep-pt').value,
        padding_bottom: panel.querySelector('#ep-pb').value,
        padding_left: panel.querySelector('#ep-pl').value,
        padding_right: panel.querySelector('#ep-pr').value,
        margin_top: panel.querySelector('#ep-mt').value,
        margin_bottom: panel.querySelector('#ep-mb').value,
      };
      el.style.paddingTop = fields.padding_top + 'px';
      el.style.paddingBottom = fields.padding_bottom + 'px';
      el.style.paddingLeft = fields.padding_left + 'px';
      el.style.paddingRight = fields.padding_right + 'px';
      el.style.marginTop = fields.margin_top + 'px';
      el.style.marginBottom = fields.margin_bottom + 'px';

      const saveBtn = panel.querySelector('.edit-popover-save');
      const fileInput = panel.querySelector('#ep-bg-file');
      const urlInput = panel.querySelector('#ep-bg-url');

      if (removeRequested) {
        fields.bg_image = '__removed__';
        el.style.backgroundImage = 'none';
      } else if (fileInput.files && fileInput.files[0]) {
        saveBtn.textContent = 'Uploading...';
        saveBtn.disabled = true;
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('csrf_token', csrfToken);
        try {
          const res = await fetch('admin/edits-upload.php', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.ok) {
            fields.bg_image = data.path;
            const current = el.style.backgroundImage || '';
            const gradientMatch = current.match(/[a-z-]+gradient\([^]*?\)(?=,|$)/i);
            const newUrl = "url('" + data.path + "')";
            el.style.backgroundImage = gradientMatch ? gradientMatch[0] + ', ' + newUrl : newUrl;
          } else {
            alert(data.error || 'Upload failed');
            saveBtn.textContent = 'Save';
            saveBtn.disabled = false;
            return;
          }
        } catch (err) {
          alert('Upload failed. Please try again.');
          saveBtn.textContent = 'Save';
          saveBtn.disabled = false;
          return;
        }
      } else if (urlInput.value.trim()) {
        fields.bg_image = urlInput.value.trim();
        const current = el.style.backgroundImage || '';
        const gradientMatch = current.match(/[a-z-]+gradient\([^]*?\)(?=,|$)/i);
        const newUrl = "url('" + fields.bg_image + "')";
        el.style.backgroundImage = gradientMatch ? gradientMatch[0] + ', ' + newUrl : newUrl;
      }

      saveEdit(el.getAttribute('data-edit-id'), fields);
      closePopover();
    });
  }

  function rgbToHex(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m) return '#000000';
    return '#' + m.slice(0, 3).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('');
  }

  function openButtonPanel(el, anchorEl) {
    const panel = openPopoverShell(anchorEl);
    const currentBg = rgbToHex(getComputedStyle(el).backgroundColor);
    const currentColor = rgbToHex(getComputedStyle(el).color);
    const currentAnim = el.getAttribute('data-hover-anim') || 'none';

    panel.innerHTML = `
      <h4>Button Style</h4>
      <div class="edit-popover-row">
        <div class="edit-popover-field"><label>Background</label><input type="color" id="ep-bg" value="${currentBg}"></div>
        <div class="edit-popover-field"><label>Text Color</label><input type="color" id="ep-color" value="${currentColor}"></div>
      </div>
      <div class="edit-popover-field">
        <label>Hover Animation</label>
        <select id="ep-anim">
          <option value="none">None</option>
          <option value="lift">Lift Up</option>
          <option value="scale">Scale</option>
          <option value="glow">Glow</option>
        </select>
      </div>
      <div class="edit-popover-hint">Tip: click the button's own text (not this panel) to rename it.</div>
      <div class="edit-popover-actions">
        <button class="edit-popover-cancel" type="button">Cancel</button>
        <button class="edit-popover-save" type="button">Save</button>
      </div>
    `;
    positionNear(panel, anchorEl);
    panel.querySelector('#ep-anim').value = currentAnim;

    panel.querySelector('.edit-popover-cancel').addEventListener('click', closePopover);
    panel.querySelector('.edit-popover-save').addEventListener('click', () => {
      const fields = {
        bg_color: panel.querySelector('#ep-bg').value,
        text_color: panel.querySelector('#ep-color').value,
        hover_anim: panel.querySelector('#ep-anim').value,
      };
      el.style.backgroundColor = fields.bg_color;
      el.style.color = fields.text_color;
      el.setAttribute('data-hover-anim', fields.hover_anim);
      saveEdit(el.getAttribute('data-edit-id'), fields);
      closePopover();
    });
  }

  function openImagePanel(el, anchorEl) {
    const panel = openPopoverShell(anchorEl);
    panel.innerHTML = `
      <h4>Change Image</h4>
      <div class="edit-popover-field">
        <label>Image URL</label>
        <input type="url" id="ep-img-url" value="${el.getAttribute('src') || ''}" placeholder="https://...">
      </div>
      <div class="edit-popover-field">
        <label>Or Upload a File</label>
        <input type="file" id="ep-img-file" accept=".jpg,.jpeg,.png,.webp">
      </div>
      <div class="edit-popover-hint">Uploading a file takes priority over the URL above.</div>
      <button type="button" class="edit-popover-remove-bg" id="ep-img-remove">Remove Image</button>
      <div class="edit-popover-actions">
        <button class="edit-popover-cancel" type="button">Cancel</button>
        <button class="edit-popover-save" type="button">Save</button>
      </div>
    `;
    positionNear(panel, anchorEl);

    const PLACEHOLDER_IMG = 'https://placehold.co/700x500/E7E2D8/13475F?text=Image+Removed';
    let removeRequested = false;

    panel.querySelector('.edit-popover-cancel').addEventListener('click', closePopover);
    panel.querySelector('#ep-img-remove').addEventListener('click', () => {
      removeRequested = true;
      panel.querySelector('#ep-img-url').value = '';
      panel.querySelector('#ep-img-file').value = '';
      panel.querySelector('#ep-img-remove').textContent = 'Will remove on Save';
    });

    panel.querySelector('.edit-popover-save').addEventListener('click', async () => {
      const fileInput = panel.querySelector('#ep-img-file');
      const urlInput = panel.querySelector('#ep-img-url');
      const saveBtn = panel.querySelector('.edit-popover-save');
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      let finalSrc = urlInput.value.trim();

      if (removeRequested) {
        finalSrc = PLACEHOLDER_IMG;
      } else if (fileInput.files && fileInput.files[0]) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('csrf_token', csrfToken);
        try {
          const res = await fetch('admin/edits-upload.php', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.ok) {
            finalSrc = data.path;
          } else {
            alert(data.error || 'Upload failed');
            saveBtn.textContent = 'Save';
            saveBtn.disabled = false;
            return;
          }
        } catch (err) {
          alert('Upload failed. Please try again.');
          saveBtn.textContent = 'Save';
          saveBtn.disabled = false;
          return;
        }
      }

      if (finalSrc) {
        el.setAttribute('src', finalSrc);
        saveEdit(el.getAttribute('data-edit-id'), { src: finalSrc });
      }
      closePopover();
    });
  }

  // ---------- Saving ----------

  function saveEdit(editKey, fields) {
    if (!editKey || !isLoggedIn) return;
    fetch('admin/edits-save.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_key: editKey, fields, csrf_token: csrfToken }),
    }).catch(() => {
      console.warn('Edit Mode: failed to save change for', editKey);
    });
  }

  // ---------- Boot ----------

  async function init() {
    try {
      const overridesRes = await fetch('/php/edits-data.php');
      overrides = await overridesRes.json();
    } catch (e) {
      overrides = {};
    }
    applyOverrides();

    try {
      const sessionRes = await fetch('/php/session-check.php');
      const session = await sessionRes.json();
      isLoggedIn = !!session.loggedIn;
      csrfToken = session.csrfToken || '';
    } catch (e) {
      isLoggedIn = false;
    }

    if (isLoggedIn) {
      buildToggleButton();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
