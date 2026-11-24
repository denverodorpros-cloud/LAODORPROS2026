// Apply the site's review presentation without changing Elfsight review data or controls.
(() => {
  const widget = document.querySelector('.customer-reviews [data-elfsight-app-lazy]');
  if (!widget) return;
  const attachStyles = () => {
    const host = widget.querySelector('.es-embed-root');
    const shadow = host && host.shadowRoot;
    if (!shadow) return false;
    if (!shadow.querySelector('[data-la-reviews-style]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/reviews-widget.css?v=20261124';
      link.dataset.laReviewsStyle = '';
      shadow.appendChild(link);
    }
    return true;
  };
  if (attachStyles()) return;
  const observer = new MutationObserver(attachStyles);
  observer.observe(widget, { childList: true, subtree: true });
  let attempts = 0;
  const timer = setInterval(() => {
    if (attachStyles() || ++attempts >= 120) clearInterval(timer);
  }, 500);
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    clearInterval(timer);
  }, { once: true });
})();
