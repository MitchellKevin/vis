import { useEffect } from 'react';

// Laadt een stylesheet alleen zolang de aanroepende component gemount is.
// Voorkomt dat per-pagina CSS lekt naar andere routes.
export function useStylesheet(href) {
  useEffect(() => {
    const existing = document.querySelector(`link[data-dynamic="${href}"]`);
    if (existing) {
      existing.dataset.refcount = String((+existing.dataset.refcount || 0) + 1);
      return () => {
        const c = +existing.dataset.refcount - 1;
        if (c <= 0) existing.remove();
        else existing.dataset.refcount = String(c);
      };
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.dynamic = href;
    link.dataset.refcount = '1';
    document.head.appendChild(link);
    return () => {
      const c = +link.dataset.refcount - 1;
      if (c <= 0) link.remove();
      else link.dataset.refcount = String(c);
    };
  }, [href]);
}
