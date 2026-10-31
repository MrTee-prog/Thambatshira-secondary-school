const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));
document.getElementById('year').textContent = new Date().getFullYear();

const admissionsForm = document.getElementById('admissions-form');
if (admissionsForm) {
  admissionsForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!admissionsForm.reportValidity()) return;
    const data = new FormData(admissionsForm);
    const subject = encodeURIComponent(`Admissions enquiry — ${data.get('grade')} / ${data.get('year')}`);
    const body = encodeURIComponent(
      `Dear Thambatshira Secondary School Admissions Office,\\n\\nI would like to enquire about admission.\\n\\nParent/guardian: ${data.get('guardian')}\\nContact number: ${data.get('phone')}\\nEmail: ${data.get('email') || 'Not provided'}\\nGrade: ${data.get('grade')}\\nIntended year: ${data.get('year')}\\n\\nEnquiry:\\n${data.get('message')}\\n\\nI understand this is an enquiry and not a confirmed application.`
    );
    const status = document.getElementById('form-message');
    status.textContent = 'Your email app should open with a prepared enquiry. Review the details and press Send. If it does not open, email thambatshira.admissions@gmail.com directly.';
    window.location.href = `mailto:thambatshira.admissions@gmail.com?subject=${subject}&body=${body}`;
  });
}
