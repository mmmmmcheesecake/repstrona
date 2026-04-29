// Dark / Light mode
const toggle = document.getElementById('themeToggle');
const html = document.documentElement;
const icon = toggle.querySelector('.icon');

const saved = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', saved);
icon.textContent = saved === 'dark' ? '🌙' : '☀️';

toggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    icon.textContent = next === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('theme', next);
});
