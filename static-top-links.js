(function () {
  const FIELDNOTES_URL = 'https://jefrix.github.io/Fieldnotes/index.html';
  const ALMANAC_URL = 'https://jefrix.github.io/History-Timeline/';
  const TIMELINE_URL = 'https://jefrix.github.io/History-Timeline/HistoryTimeline.html';
  const CSR_URL = 'https://jefrix.github.io/collapse-signature-research/';
  const HQR_URL = 'https://jefrix.github.io/HQR/';
  const MAX_ATTEMPTS = 40;

  function sameUrl(a, b) {
    return String(a || '').replace(/index\.html$/, '') === String(b || '').replace(/index\.html$/, '');
  }

  function patchTopLinks() {
    const nav = document.querySelector('.top-links');
    if (!nav) return false;

    const links = Array.from(nav.querySelectorAll('a'));
    const desired = [
      { label: 'FIELDNOTES', href: FIELDNOTES_URL, match: link => link.textContent.trim().toUpperCase() === 'FIELDNOTES' || sameUrl(link.href, FIELDNOTES_URL) },
      { label: 'ALMANAC', href: ALMANAC_URL, match: link => link.textContent.trim().toUpperCase() === 'ALMANAC' || sameUrl(link.href, ALMANAC_URL) },
      { label: 'TIMELINE', href: TIMELINE_URL, dataset: ['fieldnotesTimelineLink', '1'], match: link => link.dataset.fieldnotesTimelineLink || link.textContent.trim().toUpperCase() === 'TIMELINE' },
      { label: 'CSR', href: CSR_URL, dataset: ['collapseSignatureLink', '1'], match: link => link.dataset.collapseSignatureLink || link.textContent.trim().toUpperCase() === 'CSR' || sameUrl(link.href, CSR_URL) },
      { label: 'HQR', href: HQR_URL, match: link => link.textContent.trim().toUpperCase() === 'HQR' || sameUrl(link.href, HQR_URL) },
    ];

    desired.forEach(item => {
      const link = links.find(item.match) || document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      if (item.dataset) link.dataset[item.dataset[0]] = item.dataset[1];
      nav.appendChild(link);
    });

    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (patchTopLinks() || attempts >= MAX_ATTEMPTS) clearInterval(timer);
  }, 250);
  patchTopLinks();
})();
