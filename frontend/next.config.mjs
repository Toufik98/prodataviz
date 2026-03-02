import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/projects/prodataviz',
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/fr/',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
