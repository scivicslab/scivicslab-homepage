import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Scivics Lab',
  tagline: 'A lightweight actor model and workflow engine for Java — powering AI agents, infrastructure automation, and container orchestration.',
  favicon: 'img/favicon.png',

  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'POJO-actor, actor-IaC, Java actor model, virtual threads, infrastructure as code, IaC, concurrent programming, workflow engine',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'author',
        content: 'Scivics Lab',
      },
    },
  ],

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
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

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
          path: 'docs/pojo-actor',
          routeBasePath: 'docs/pojo-actor',
          sidebarPath: './sidebars-pojo-actor.ts',
        },
        gtag: {
          trackingID: 'G-MK0GHMG9LS',
          anonymizeIP: true,
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: 15,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
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
        path: 'docs/actor-iac',
        routeBasePath: 'docs/actor-iac',
        sidebarPath: './sidebars-actor-iac.ts',
      },
    ],
    // Turing-workflow docs (separate plugin instance)
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'turing-workflow',
        path: 'docs/turing-workflow',
        routeBasePath: 'docs/turing-workflow',
        sidebarPath: './sidebars-turing-workflow.ts',
      },
    ],
    // AI Tools docs (separate plugin instance)
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'ai-tools',
        path: 'docs/ai-tools',
        routeBasePath: 'docs/ai-tools',
        sidebarPath: './sidebars-ai-tools.ts',
      },
    ],
    // Redirects for old URLs
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/blog/pojo-actor-v1-introduction',
            to: '/blog/2025-12-22-pojo-actor-v1-introduction',
          },
          {
            from: '/blog/actor-iac-cluster-inventory',
            to: '/blog/2026-01-28-actor-iac-cluster-inventory',
          },
        ],
        createRedirects(existingPath) {
          // Redirect all /docs/actor-iac/* to /docs/pojo-actor/introduction
          if (existingPath === '/docs/pojo-actor/introduction') {
            return [
              '/docs/actor-iac/introduction',
              '/docs/actor-iac',
            ];
          }
          return undefined;
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
          docsPluginId: 'turing-workflow',
          position: 'left',
          label: 'Turing-workflow',
        },
        {
          type: 'doc',
          docId: 'introduction',
          docsPluginId: 'ai-tools',
          position: 'left',
          label: 'AI Tools',
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
              to: '/docs/pojo-actor/introduction',
            },
            {
              label: 'Turing-workflow',
              to: '/docs/turing-workflow/introduction',
            },
            {
              label: 'AI Tools',
              to: '/docs/ai-tools/introduction',
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
              href: 'https://coderlegion.com/search?q=POJO-actor',
            },
            {
              label: 'DEV',
              href: 'https://dev.to/search?utf8=%E2%9C%93&q=POJO-actor',
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
              label: 'Maven Repository',
              href: 'https://mvnrepository.com/search?q=com.scivicslab',
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
