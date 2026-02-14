/** @type {import('next').NextConfig} */
const nextConfig = {
    devIndicators: {
        buildActivityPosition: 'bottom-right',
    },
    // Disable the error overlay
    onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },
    reactStrictMode: true,
};

export default nextConfig;
