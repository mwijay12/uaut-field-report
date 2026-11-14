// Contact page: turns the form into a WhatsApp message. Nothing is sent to a
// server and nothing is stored. The links simply carry the text.

const WHATSAPP = 'https://wa.me/255792867427';
const EMAIL = 'altrawaretechnology@gmail.com';

export function mountContact(root) {
  const form = root.querySelector('[data-brief]');
  if (!form) return undefined;

  const preview = form.querySelector('[data-brief-preview]');
  const whatsapp = form.querySelector('[data-brief-whatsapp]');
  const email = form.querySelector('[data-brief-email]');

  // A link such as /contact/?need=web-starter arrives with that package chosen.
  // ?need=other&about=Payment+integration names a topic that is not a package.
  const query = new URLSearchParams(window.location.search);
  const wanted = query.get('need');
  const about = (query.get('about') || '').slice(0, 80);
  const choice = [...form.elements.need].find((input) => input.value === wanted);
  if (choice) choice.checked = true;

  const clean = (value) => value.replace(/\s+/g, ' ').trim();

  function compose() {
    const selected = form.querySelector('input[name="need"]:checked');
    const need = selected.value === 'other' && about ? about : selected.dataset.summary;
    const name = clean(form.elements.name.value);
    const org = clean(form.elements.org.value);
    const note = form.elements.note.value.trim();

    const lines = ['Habari Altraware,', '', 'I would like to start a project.', `Need: ${need}`];
    if (name) lines.push(`Name: ${name}`);
    if (org) lines.push(`Business: ${org}`);
    if (note) lines.push(`Note: ${note}`);
    return lines.join('\n');
  }

  function update() {
    const message = compose();
    preview.textContent = message;
    whatsapp.href = `${WHATSAPP}?text=${encodeURIComponent(message)}`;
    email.href = `mailto:${EMAIL}?subject=${encodeURIComponent('New project')}&body=${encodeURIComponent(message)}`;
  }

  const onSubmit = (event) => {
    event.preventDefault();
    whatsapp.click();
  };

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', onSubmit);
  update();

  return () => {
    form.removeEventListener('input', update);
    form.removeEventListener('change', update);
    form.removeEventListener('submit', onSubmit);
  };
}
