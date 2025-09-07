// Image URL fixer utility
// Ensures all <img> and CSS background-image URLs that point to /uploads or /images
// are automatically prefixed with the backend API_BASE_URL in production.

import { API_BASE_URL } from './apiConfig';

const isAbsolute = (url) => /^https?:\/\//i.test(url);
const needsPrefix = (url) => url && (url.startsWith('/uploads') || url.startsWith('/images'));

export const getImageUrl = (path) => {
  if (!path) return '';
  if (isAbsolute(path)) return path;
  if (needsPrefix(path)) return `${API_BASE_URL}${path}`;
  // fallback: treat as relative resource hosted by backend
  if (path.startsWith('/')) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
};

function fixImgElement(img) {
  const src = img.getAttribute('src');
  if (!src) return;
  if (src.includes('http://localhost:3001')) {
    img.src = src.replace('http://localhost:3001', API_BASE_URL);
    return;
  }
  if (needsPrefix(src)) {
    img.src = `${API_BASE_URL}${src}`;
    return;
  }
}

function fixElementBackground(el) {
  const style = window.getComputedStyle(el);
  const bg = style.backgroundImage; // e.g., url("/uploads/foo.png")
  if (!bg || bg === 'none') return;
  const match = bg.match(/url\(["']?(.*?)["']?\)/i);
  if (!match || !match[1]) return;
  const url = match[1];
  let fixed = url;
  if (url.includes('http://localhost:3001')) {
    fixed = url.replace('http://localhost:3001', API_BASE_URL);
  } else if (needsPrefix(url)) {
    fixed = `${API_BASE_URL}${url}`;
  }
  if (fixed !== url) {
    el.style.backgroundImage = `url("${fixed}")`;
  }
}

function scanAndFixAll() {
  document.querySelectorAll('img').forEach(fixImgElement);
  document.querySelectorAll('*').forEach(fixElementBackground);
}

export function initImageUrlFixer() {
  // Initial pass
  scanAndFixAll();

  // Observe DOM changes
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes') {
        if (m.target.tagName === 'IMG' && m.attributeName === 'src') {
          fixImgElement(m.target);
        }
        if (m.attributeName && m.attributeName.startsWith('style')) {
          fixElementBackground(m.target);
        }
      }
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return; // element only
          if (node.tagName === 'IMG') fixImgElement(node);
          fixElementBackground(node);
          node.querySelectorAll && node.querySelectorAll('img').forEach(fixImgElement);
        });
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['src', 'style'],
    childList: true,
    subtree: true,
  });
}
