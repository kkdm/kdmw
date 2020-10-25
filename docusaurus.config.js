module.exports = {
  title: 'kdmw',
  tagline: 'something like notes',
  url: 'https://kdmw.dev',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.ico',
  organizationName: 'kkdm',
  themeConfig: {
    navbar: {
      title: 'kdmw',
      logo: {
        alt: 'kdmw logo',
        src: 'img/logo.svg',
      },
      items: [
        {to: 'blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/kkdm',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} kdmw, Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
	  routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/kkdm/kdmw-docusaurus/tree/main/kdmw',
        },
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/kkdm/kdmw-docusaurus/tree/main/kdmw/blog',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
