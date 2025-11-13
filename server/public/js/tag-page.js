(function () {
  const page = document.querySelector('[data-shortcode]');
  if (!page) return;

  const reasonInputs = Array.from(document.querySelectorAll('input[name="reason"]'));
  const reasonFields = Array.from(document.querySelectorAll('[data-reason-field]'));
  const messageDialog = document.getElementById('messageDialog');
  const callDialog = document.getElementById('callDialog');
  const menuDialog = document.getElementById('menuDialog');
  const openMessageBtn = document.querySelector('[data-open-message]');
  const openCallBtn = document.querySelector('[data-open-call]');
  const menuButton = document.querySelector('[data-open-menu]');
  const emergencyButton = document.querySelector('[data-emergency-number]');
  const messageForm = document.getElementById('messageForm');
  const callForm = document.getElementById('callForm');

  const closeDialog = (dialog, form) => {
    if (!dialog) return;
    dialog.addEventListener('cancel', () => dialog.close());
    dialog.addEventListener('close', () => {
      form?.reset();
    });
  };

  closeDialog(messageDialog, messageForm);
  closeDialog(callDialog, callForm);
  closeDialog(menuDialog);

  const getSelectedReason = () => {
    const selected = reasonInputs.find((input) => input.checked);
    if (!selected) {
      return { value: '', label: '' };
    }
    return {
      value: selected.value,
      label: selected.dataset.label,
    };
  };

  const syncReasonFields = () => {
    const { value } = getSelectedReason();
    reasonFields.forEach((field) => {
      field.value = value;
    });
  };

  reasonInputs.forEach((input) => input.addEventListener('change', syncReasonFields));
  syncReasonFields();

  const showDialog = (dialog) => {
    if (!dialog || typeof dialog.showModal !== 'function') {
      return;
    }
    dialog.showModal();
  };

  openMessageBtn?.addEventListener('click', () => {
    showDialog(messageDialog);
    messageDialog?.querySelector('#digits')?.focus();
  });

  openCallBtn?.addEventListener('click', () => {
    showDialog(callDialog);
    callDialog?.querySelector('#callBackNumber')?.focus();
  });

  menuButton?.addEventListener('click', () => {
    showDialog(menuDialog);
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    const targetId = button.getAttribute('data-close-dialog');
    button.addEventListener('click', () => {
      const dialog = document.getElementById(targetId);
      dialog?.close();
    });
  });

  emergencyButton?.addEventListener('click', () => {
    const number = emergencyButton.dataset.emergencyNumber || '112';
    window.location.href = `tel:${number}`;
  });

  const appendReasonLabel = (form) => {
    if (!form) return;
    form.addEventListener('submit', () => {
      const { label } = getSelectedReason();
      const existing = form.querySelector('input[name="reasonLabel"]');
      if (!existing) {
        const reasonLabelField = document.createElement('input');
        reasonLabelField.type = 'hidden';
        reasonLabelField.name = 'reasonLabel';
        reasonLabelField.value = label;
        form.appendChild(reasonLabelField);
      } else {
        existing.value = label;
      }
    });
  };

  appendReasonLabel(messageForm);
  appendReasonLabel(callForm);
})();

