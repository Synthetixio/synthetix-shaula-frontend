export const local = window.location.hostname === 'localhost';

export const getMatchedUrl = () => window.location.pathname.replace('/', '');
