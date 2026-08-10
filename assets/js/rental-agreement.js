// ============================================================
// RENTAL AGREEMENT MODAL
// ------------------------------------------------------------
// Injected on every page. On the Reservations page, submitting
// the "Check Availability" form is blocked until this has been
// completed once this browser session, then the original
// submission continues automatically.
// ============================================================

(function () {
  let gatedMode = false;
  let hasDrawn = false;
  let isDrawing = false;
  let canvas, ctx;

  function alreadySigned() {
    return sessionStorage.getItem('raSigned') === '1';
  }

  function openModal(gated) {
    gatedMode = gated;
    const backdrop = document.getElementById('raBackdrop');
    const notice = document.getElementById('raGateNotice');
    const step1 = document.getElementById('raStep1');
    const form = document.getElementById('raForm');
    const success = document.getElementById('raSuccess');
    if (!backdrop) return;

    notice.style.display = gated ? 'block' : 'none';
    step1.style.display = 'block';
    form.style.display = 'none';
    success.style.display = 'none';
    document.getElementById('raError').style.display = 'none';
    backdrop.classList.add('open');
  }

  function closeModal() {
    const backdrop = document.getElementById('raBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function showError(msg) {
    const err = document.getElementById('raError');
    err.textContent = msg;
    err.style.display = 'block';
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Signature canvas ----------

  function setupCanvas() {
    canvas = document.getElementById('raSignatureCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0B3D54';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const point = e.touches ? e.touches[0] : e;
      return {
        x: (point.clientX - rect.left) * (canvas.width / rect.width),
        y: (point.clientY - rect.top) * (canvas.height / rect.height),
      };
    }

    function start(e) {
      e.preventDefault();
      isDrawing = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function move(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      hasDrawn = true;
    }
    function end() { isDrawing = false; }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    document.getElementById('raSigClear').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
    });
  }

  function resetCanvas() {
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
  }

  function canvasToBlob() {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  // ---------- Submission ----------

  async function handleSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('raForm');
    const agree = document.getElementById('raAgreeCheckbox').checked;
    const sigName = document.getElementById('raSignatureName').value.trim();
    const sigEmail = document.getElementById('raSignatureEmail').value.trim();

    if (!agree) {
      showError('Please check the box confirming you agree to the terms.');
      return;
    }
    if (!document.querySelector('input[name="insurance_option"]:checked')) {
      showError('Please select whether you accept or decline the Deductible Limitation Package.');
      return;
    }
    if (!sigName || !sigEmail) {
      showError('Please fill in your legal name and email at the bottom to sign.');
      return;
    }
    if (!hasDrawn) {
      showError('Please draw your signature in the box before submitting.');
      return;
    }

    const submitBtn = document.getElementById('raSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const formData = new FormData(form);
      formData.set('signature_name', sigName);
      formData.set('signature_email', sigEmail);

      const sigBlob = await canvasToBlob();
      formData.set('signature_image', sigBlob, 'signature.png');

      const res = await fetch('/php/agreement-submit.php', { method: 'POST', body: formData });
      const data = await res.json();

      if (!data.ok) {
        showError(data.error || 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Agree & Sign';
        return;
      }

      sessionStorage.setItem('raSigned', '1');
      form.style.display = 'none';
      document.getElementById('raSuccess').style.display = 'block';

      if (gatedMode) {
        setTimeout(() => {
          closeModal();
          const reservationForm = document.getElementById('reservationForm');
          if (reservationForm) {
            if (reservationForm.requestSubmit) reservationForm.requestSubmit();
            else reservationForm.submit();
          }
        }, 900);
      }
    } catch (err) {
      showError('Network error — please check your connection and try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Agree & Sign';
    }
  }

  async function init() {
    try {
      const res = await fetch('/html/rental-agreement-modal.html');
      const html = await res.text();
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
    } catch (e) {
      console.warn('Rental agreement modal failed to load.');
      return;
    }

    setupCanvas();

    document.getElementById('raCloseBtn').addEventListener('click', closeModal);
    document.getElementById('raCancelBtn').addEventListener('click', closeModal);
    document.getElementById('raStep1Cancel').addEventListener('click', closeModal);
    document.getElementById('raStep1Continue').addEventListener('click', () => {
      document.getElementById('raStep1').style.display = 'none';
      document.getElementById('raForm').style.display = 'block';
    });
    document.getElementById('raBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'raBackdrop') closeModal();
    });
    document.getElementById('raForm').addEventListener('submit', handleSubmit);

    // Convenience: auto-fill the signature name/email from the top fields
    document.getElementById('raFullName').addEventListener('blur', function () {
      const sigName = document.getElementById('raSignatureName');
      if (!sigName.value) sigName.value = this.value;
    });
    document.getElementById('raEmailTop').addEventListener('blur', function () {
      const sigEmail = document.getElementById('raSignatureEmail');
      if (!sigEmail.value) sigEmail.value = this.value;
    });

    document.querySelectorAll('.rental-agreement-trigger').forEach(btn => {
      btn.addEventListener('click', () => openModal(false));
    });
    document.querySelectorAll('.rental-agreement-trigger-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(false);
      });
    });

    // Deep link: the approval email (sent from admin/reservation-
    // status-update.php) links to /pricing#rental-agreement.
    // The modal has no URL of its own, so this hash IS its address —
    // opening any page with it auto-opens the agreement. Also reacts
    // to hash changes so the link works from within the site too.
    function openFromHash() {
      if (window.location.hash === '#rental-agreement') {
        openModal(false);
      }
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    // Rental agreement is available via the footer link, but no longer
    // mandatory before submitting the Check Availability form.
    // (Previously this blocked submission until signed — removed per request.)
  }

  document.addEventListener('DOMContentLoaded', init);
})();
