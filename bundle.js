document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.menu a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) {
    backdrop.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => backdrop.classList.remove('open')));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-on-scroll');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            entry.target.classList.add('visible');
          });
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
});