/** Screens where a floating button would sit on top of something that matters: the till's pay bar, scanners, forms, the lock and the chat itself. */
const HIDDEN = /^\/(sell|ask|ask-model|lock|login|join|forgot-password|price-check|end-shift|give-free|record-production)(\/|$)|^\/(add|new|edit)-/;

export const showAskButton = (pathname: string): boolean => !HIDDEN.test(pathname);
