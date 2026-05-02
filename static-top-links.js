(function () {
  const ALMANAC_URL = 'https://jefrix.github.io/History-Timeline/';
  const TIMELINE_URL = 'https://jefrix.github.io/History-Timeline/history-timeline.html';

  function patchTopLinks() {
    const nav = document.querySelector('.top-links');
    if (!nav) return false;

    const links = Array.from(nav.querySelectorAll('a'));
    const almanacLink = links.find(link => {
      const label = link.textContent.trim().toUpperCase();
      return label === 'TIMELINE' || label === 'ALMANAC' || link.href.replace(/index\.html$/, '') === ALMANAC_URL;
    });

    if (almanacLink) {
      almanacLink.textContent = 'ALMANAC';
      almanacLink.href = ALMANAC_URL;
    }

    if (!nav.querySelector('[data-fieldnotes-timeline-link]')) {
      const timelineLink = document.createElement('a');
      timelineLink.dataset.fieldnotesTimelineLink = '1';
      timelineLink.href = TIMELINE_URL;
      timelineLink.textContent = 'TIMELINE';

      if (almanacLink) {
        almanacLink.insertAdjacentElement('afterend', timelineLink);
      } else {
        nav.appendChild(timelineLink);
      }
    }

    return true;
  }

  patchTopLinks();
  const observer = new MutationObserver(() => patchTopLinks());
  observer.observe(document.body, { childList: true, subtree: true });
})();
