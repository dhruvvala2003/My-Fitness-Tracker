/* Shared motion capability flags — evaluated once at load */

export const reducedMotion = typeof window !== 'undefined'
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const finePointer = typeof window !== 'undefined'
  && !!window.matchMedia?.('(pointer: fine)').matches
  && !reducedMotion;
