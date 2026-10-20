// Set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example). Expo inlines it at
// build time; a device can't reach your machine through "localhost".
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
