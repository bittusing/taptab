(() => {
  const STORAGE_KEY = 'taptag-theme';
  const root = document.documentElement;
  const toggleBtn = document.querySelector('[data-theme-toggle]');

  const getPreferredTheme = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const setTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  };

  const rotateTheme = () => {
    const current = root.getAttribute('data-theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
  };

  setTheme(getPreferredTheme());

  if (toggleBtn) {
    toggleBtn.addEventListener('click', rotateTheme);
  }
})();

