'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const shortcuts: Record<string, string> = {
  n: '/operating/raw-movement-inbox',
  t: '/operating/tasks',
  d: '/operating/pipeline',
  c: '/operating/deal-control-sheets',
  g: '/operating/decision-gates',
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function OperatingKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return;

      const path = shortcuts[event.key.toLowerCase()];
      if (!path) return;

      event.preventDefault();
      router.push(path);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return null;
}
