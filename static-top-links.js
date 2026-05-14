(function () {
  const ALMANAC_URL = 'https://jefrix.github.io/History-Timeline/';
  const TIMELINE_URL = 'https://jefrix.github.io/History-Timeline/history-timeline.html';
  const CSR_URL = 'https://jefrix.github.io/collapse-signature-research/';
  const MAX_ATTEMPTS = 40;

  function sameUrl(a, b) {
    return String(a || '').replace(/index\.html$/, '') === String(b || '').replace(/index\.html$/, '');
  }

  function patchTopLinks() {
    const nav = document.querySelector('.top-links');
    if (!nav) return false;

    const links = Array.from(nav.querySelectorAll('a'));
    const almanacLink = links.find(link => {
      const label = link.textContent.trim().toUpperCase();
      return label === 'TIMELINE' || label === 'ALMANAC' || sameUrl(link.href, ALMANAC_URL);
    });

    if (almanacLink) {
      if (almanacLink.textContent.trim() !== 'ALMANAC') almanacLink.textContent = 'ALMANAC';
      if (!sameUrl(almanacLink.href, ALMANAC_URL)) almanacLink.href = ALMANAC_URL;
    }

    let timelineLink = nav.querySelector('[data-fieldnotes-timeline-link]');
    if (!timelineLink) {
      const timelineLink = document.createElement('a');
      timelineLink.dataset.fieldnotesTimelineLink = '1';
      timelineLink.href = TIMELINE_URL;
      timelineLink.textContent = 'TIMELINE';

      if (almanacLink) almanacLink.insertAdjacentElement('afterend', timelineLink);
      else nav.appendChild(timelineLink);
    } else {
      timelineLink.href = TIMELINE_URL;
      timelineLink.textContent = 'TIMELINE';
    }

    timelineLink = nav.querySelector('[data-fieldnotes-timeline-link]');
    let csrLink = nav.querySelector('[data-collapse-signature-link]')
      || links.find(link => link.textContent.trim().toUpperCase() === 'CSR' || sameUrl(link.href, CSR_URL));
    if (!csrLink) {
      csrLink = document.createElement('a');
      csrLink.dataset.collapseSignatureLink = '1';
      csrLink.textContent = 'CSR';
      if (timelineLink?.nextSibling) nav.insertBefore(csrLink, timelineLink.nextSibling);
      else nav.appendChild(csrLink);
    }
    csrLink.dataset.collapseSignatureLink = '1';
    csrLink.href = CSR_URL;
    csrLink.textContent = 'CSR';

    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (patchTopLinks() || attempts >= MAX_ATTEMPTS) clearInterval(timer);
  }, 250);
  patchTopLinks();
})();
