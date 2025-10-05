import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export const useWarnIfUnsavedChanges = (unsaved: boolean, onLeave: () => void, pathname: string) => {
  const router = useRouter();

  const handleAnchorClick: EventListener = (event) => {
    const e = event as MouseEvent;
    if (e.button !== 0) return;
    const target = e.currentTarget as HTMLAnchorElement | null;
    if (!target || !target.href) return;
    const targetUrl = target.href;
    const currentUrl = window.location.href;
    if (targetUrl !== currentUrl && typeof window.onbeforeunload === 'function') {
      // @ts-expect-error onbeforeunload may return string or undefined, we want to call it to trigger warning
      const res = window.onbeforeunload();
      if (!res) e.preventDefault();
    }
  };

  const addAnchorListeners = () => {
    const anchorElements = document.querySelectorAll('a[href]');
    anchorElements.forEach((anchor) =>
      anchor.addEventListener('click', handleAnchorClick)
    );
  };

  const removeAnchorListeners = () => {
    const anchorElements = document.querySelectorAll('a[href]');
    anchorElements.forEach((anchor) =>
      anchor.removeEventListener('click', handleAnchorClick)
    );
  };

  useEffect(() => {
    const mutationObserver = new MutationObserver(addAnchorListeners);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    addAnchorListeners();

    return () => {
      mutationObserver.disconnect();
      removeAnchorListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // required for Chrome
    };

    const handlePopState = (e: PopStateEvent) => {
      if (unsaved) {
        const confirmLeave = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?'
        );
        if (!confirmLeave) {
          window.history.pushState(null, '', window.location.origin + pathname);
        } else {
          onLeave(); 
        }
      }
    };

    if (unsaved) {
      window.addEventListener('beforeunload', beforeUnloadHandler);
      window.addEventListener('popstate', handlePopState);
    } else {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      window.removeEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [unsaved, onLeave, router, pathname]);

  useEffect(() => {
    const originalPush = router.push;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (router as any).push = (url: string, options?: NavigateOptions) => {
      if (unsaved) {
        const confirmLeave = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?'
        );
        if (confirmLeave) {
          originalPush(url, options);
          onLeave();
        } else {
          originalPush(pathname, options);
        }
      } else {
        originalPush(url, options);
      }
    };

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (router as any).push = originalPush;
    };
  }, [router, unsaved, onLeave, pathname]);
};
