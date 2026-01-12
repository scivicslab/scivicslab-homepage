import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Scivics Lab',
  tagline: 'Actor-based Infrastructure as Code',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://scivicslab.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'scivicslab',
  projectName: 'scivics-lab-homepage',

  onBrokenLinks: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang.
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        // POJO-actor docs (main docs instance)
        docs: {
          id: 'pojo-actor',
          path: 'docs-pojo-actor',
          routeBasePath: 'docs/pojo-actor',
          sidebarPath: './sidebars-pojo-actor.ts',
          editUrl:
            'https://github.com/scivicslab/scivics-lab-homepage/tree/main/',
          lastVersion: 'current',
          versions: {
            current: {
              label: '2.12.0',
            },
            '2.11.0': {
              banner: 'none',
            },
          },
        },
        // gtag: {
        //   trackingID: 'G-MK0GHMG9LS',
        //   anonymizeIP: true,
        // },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl:
            'https://github.com/scivicslab/scivics-lab-homepage/tree/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // actor-IaC docs (separate plugin instance)
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'actor-iac',
        path: 'docs-actor-iac',
        routeBasePath: 'docs/actor-iac',
        sidebarPath: './sidebars-actor-iac.ts',
        editUrl:
          'https://github.com/scivicslab/scivics-lab-homepage/tree/main/',
        lastVersion: 'current',
        versions: {
          current: {
            label: '2.12.0',
          },
          '2.11.0': {
            banner: 'none',
          },
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/scivics-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Scivics Lab',
      logo: {
        alt: 'Scivics Lab Logo',
        src: 'img/logo200.png',
      },
      items: [
        {
          type: 'doc',
          docId: 'introduction',
          docsPluginId: 'pojo-actor',
          position: 'left',
          label: 'POJO-actor',
        },
        {
          type: 'doc',
          docId: 'introduction',
          docsPluginId: 'actor-iac',
          position: 'left',
          label: 'actor-IaC',
        },
        {to: '/blog', label: 'Blog', position: 'right'},
        {
          href: 'https://github.com/scivicslab',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'POJO-actor',
              to: '/docs/pojo-actor/introduction',
            },
            {
              label: 'actor-IaC',
              to: '/docs/actor-iac/introduction',
            },
            {
              label: 'POJO-actor Javadoc',
              href: 'https://scivicslab.github.io/POJO-actor/',
            },
            {
              label: 'actor-IaC Javadoc',
              href: 'https://scivicslab.github.io/actor-IaC/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/scivicslab',
            },
            {
              label: 'CoderLegion',
              href: 'https://coderlegion.com',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'Medium',
              href: 'https://medium.com',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Scivics Lab.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'yaml', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
