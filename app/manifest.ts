// Web app manifest: lets Kollege be added to the home screen. On iPhone and iPad this is the
// condition for push notifications (Safari allows them only for installed web apps).
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kollege',
    short_name: 'Kollege',
    lang: 'de',
    start_url: '/heute',
    display: 'standalone',
    background_color: '#fbfbfa',
    theme_color: '#fbfbfa',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
