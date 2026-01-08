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
  url: 'https://scivics-lab.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'scivicslab',
  projectName: 'scivics-lab-homepage',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

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
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/scivicslab/scivics-lab-homepage/tree/main/',
        },
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
          type: 'docSidebar',
          sidebarId: 'pojoActorSidebar',
          position: 'left',
          label: 'POJO-actor',
        },
        {
          type: 'docSidebar',
          sidebarId: 'actorIacSidebar',
          position: 'left',
          label: 'actor-IaC',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
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
              to: '/docs/pojo-actor/intro',
            },
            {
              label: 'actor-IaC',
              to: '/docs/actor-iac/intro',
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
