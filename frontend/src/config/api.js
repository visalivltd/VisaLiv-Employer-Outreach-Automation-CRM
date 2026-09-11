export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${window.location.protocol}//${host}:8000`;
    }
  }
  let url = import.meta.env.VITE_API_URL || '';
  if (url) {
    return url.replace(/\/$/, '');
  }
  return 'https://visaliv-crm-backend-477131280275.asia-south2.run.app';
};
