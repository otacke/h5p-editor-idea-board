/**
 * Convert HTML to plain text.
 * @param {string} html The HTML string to convert.
 * @returns {string} The converted plain text.
 */
export const htmlToText = (html) => {
  if (!html) {
    return '';
  }


  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  processLineBreaks(tempDiv);
  removeEmptyParagraphs(tempDiv);

  return cleanupText(tempDiv.innerText || tempDiv.textContent || '');
};

/**
 * Process BR and P tags to create appropriate line breaks.
 * @param {HTMLElement} element DOM element to process.
 */
const processLineBreaks = (element) => {
  element.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));

  element.querySelectorAll('p').forEach((p) => {
    if (p.nextSibling) {
      p.insertAdjacentText('afterend', '\n');
    }
  });
};

/**
 * Remove empty paragraphs from the DOM.
 * @param {HTMLElement} element DOM element to process.
 */
const removeEmptyParagraphs = (element) => {
  element.querySelectorAll('p').forEach((p) => {
    const content = p.textContent.trim();
    if (content === '' || content === '\u00A0') {
      p.parentNode.removeChild(p);
    }
  });
};

/**
 * Clean up the extracted text.
 * @param {string} text Text to clean.
 * @returns {string} Cleaned text.
 */
const cleanupText = (text) => {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

/**
 * Convert plain text to HTML formatted for cards.
 * @param {string} text Text to convert.
 * @returns {Array} Array of HTML strings.
 */
export const textToCardHTMLs = (text) => {
  if (!text) {
    return '';
  }

  return text
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0)
    .map((section) => {
      const cleanedLines = section
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      return `<p style="text-align:center;">${cleanedLines.join('<br>')}</p>`;
    });
};

/**
 * Call callback function whenever dom element gets visible in viewport.
 * @async
 * @param {HTMLElement} dom DOM element to wait for.
 * @param {function} callback Function to call once DOM element is visible.
 * @param {object} [options] IntersectionObserver options.
 * @returns {IntersectionObserver} Promise for IntersectionObserver.
 */
export const callOnVisibilityChange = async (dom, callback, options = {}) => {
  if (typeof dom !== 'object' || typeof callback !== 'function') {
    return; // Invalid arguments
  }

  options.threshold = options.threshold || 0;

  return await new Promise((resolve) => {
    // iOS is behind ... Again ...
    const idleCallback = window.requestIdleCallback ?
      window.requestIdleCallback :
      window.requestAnimationFrame;

    idleCallback(() => {
      // Get started once visible and ready
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      }, {
        ...(options.root && { root: options.root }),
        threshold: options.threshold,
      });
      observer.observe(dom);

      resolve(observer);
    });
  });
};
