import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

const actorCode = `// Any POJO becomes an actor
public class TaskRunner {
    public String execute(String command) {
        return Runtime.exec(command);
    }
}

// Wrap it with the actor system
IIActorRef<TaskRunner> runner =
    new IIActorRef<>("runner", new TaskRunner(), system);

// Call methods asynchronously
String result = runner.ask(r -> r.execute("deploy")).get();`;

const workflowYaml = `name: deploy-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: executeCommand
          arguments: ["./deploy.sh"]`;

function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <span className={styles.badge}>Open Source</span>
          <Heading as="h1" className={styles.heroTitle}>
            <span className={styles.gradient}>From Actors to Applications</span>
          </Heading>
          <p className={styles.heroSubtitle}>
            A lightweight actor model and workflow engine for Java — powering
            AI agent platforms, infrastructure automation, and container orchestration.
          </p>
          <div className={styles.heroCta}>
            <Link className={styles.primaryBtn} to="/docs/pojo-actor/introduction">
              Get Started
            </Link>
            <Link className={styles.secondaryBtn} to="https://github.com/scivicslab">
              GitHub
            </Link>
          </div>
        </div>
        <div className={styles.heroCode}>
          <div className={styles.codeWindow}>
            <div className={styles.codeHeader}>
              <span className={styles.dot} style={{background: '#ff5f56'}}></span>
              <span className={styles.dot} style={{background: '#ffbd2e'}}></span>
              <span className={styles.dot} style={{background: '#27ca40'}}></span>
              <span className={styles.codeTitle}>TaskRunner.java</span>
            </div>
            <CodeBlock language="java" className={styles.codeBlock}>
              {actorCode}
            </CodeBlock>
          </div>
          <div className={styles.heroFeatureGrid}>
            <div className={styles.heroFeatureItem}>
              <div className={styles.heroFeatureIcon}>📦</div>
              <h3>Zero Dependencies</h3>
              <p>Use any POJO as an actor. No base classes, no interfaces.</p>
            </div>
            <div className={styles.heroFeatureItem}>
              <div className={styles.heroFeatureIcon}>⚡</div>
              <h3>Virtual Thread Native</h3>
              <p>Java 21+. Each actor on its own virtual thread.</p>
            </div>
            <div className={styles.heroFeatureItem}>
              <div className={styles.heroFeatureIcon}>🤖</div>
              <h3>Automaton-Based Workflows</h3>
              <p>Simple enough for humans and AI agents alike.</p>
            </div>
            <div className={styles.heroFeatureItem}>
              <div className={styles.heroFeatureIcon}>🌐</div>
              <h3>Distributed Actor System</h3>
              <p>Scale across multiple nodes transparently.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StackSection() {
  return (
    <section className={styles.stack}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>The Stack</span>
          <Heading as="h2" className={styles.sectionTitle}>
            Two building blocks, many applications
          </Heading>
          <p className={styles.sectionDesc}>
            POJO-actor is a minimal actor model library for Java virtual threads.
            Turing-workflow is a YAML workflow engine and visual editor built on it.
            Together, they are the foundation for everything we build.
          </p>
        </div>
        <div className={styles.stackGrid}>
          <Link to="/docs/pojo-actor/introduction" className={styles.stackCard}>
            <div className={styles.stackIcon}>&#x1F4E6;</div>
            <div className={styles.stackContent}>
              <h3>POJO-actor</h3>
              <p className={styles.stackTagline}>Actor Model for Java</p>
              <p className={styles.stackDesc}>
                Turn any Plain Old Java Object into a concurrent actor.
                No base classes, no annotations — just your code with built-in
                thread safety and async messaging on virtual threads.
              </p>
              <span className={styles.stackLink}>Read the docs &rarr;</span>
            </div>
          </Link>
          <Link to="https://github.com/scivicslab/Turing-workflow" className={styles.stackCard}>
            <div className={styles.stackIcon}>&#x2699;</div>
            <div className={styles.stackContent}>
              <h3>Turing-workflow</h3>
              <p className={styles.stackTagline}>YAML Workflow Engine</p>
              <p className={styles.stackDesc}>
                Define, inspect, and execute complex pipelines in YAML with
                automaton-based state transitions. Simple enough that
                AI agents generate correct workflows on the first try.
              </p>
              <span className={styles.stackLink}>View on GitHub &rarr;</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

const applications = [
  {
    icon: '\u{1F916}',
    title: 'AI Agent Platform',
    status: 'Actively developing',
    description:
      'Our own take on OpenClaw + LangGraph, built on Turing-workflow. LLM tool-calling, MCP gateway integration, and multi-step reasoning chains — all orchestrated as actor workflows.',
    links: [
      { label: 'MCP Gateway', url: 'https://github.com/scivicslab/quarkus-mcp-gateway' },
      { label: 'LLM Console', url: 'https://github.com/scivicslab/quarkus-llm-console' },
      { label: 'Workflow Editor', url: 'https://github.com/scivicslab/Turing-workflow-editor' },
    ],
  },
  {
    icon: '\u{1F527}',
    title: 'actor-IaC',
    status: 'Production',
    description:
      'Infrastructure as Code as a Turing-workflow plugin. State-machine-driven node management across clusters, with SSH execution and full audit trails.',
    links: [
      { label: 'Documentation', url: '/docs/actor-iac/introduction' },
      { label: 'Plugins', url: 'https://github.com/scivicslab/actor-IaC-plugins' },
    ],
  },
  {
    icon: '\u{1F433}',
    title: 'k8s-pups / LXD-pups',
    status: 'Production / In development',
    description:
      'Container orchestration portals built on POJO-actor. k8s-pups for multi-user Kubernetes environments, LXD-pups for single-user local AI development setups.',
    links: [],
  },
];

function ApplicationsSection() {
  return (
    <section className={styles.applications}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Built With the Stack</span>
          <Heading as="h2" className={styles.sectionTitle}>
            Applications
          </Heading>
          <p className={styles.sectionDesc}>
            Real systems built on POJO-actor and Turing-workflow.
          </p>
        </div>
        <div className={styles.appGrid}>
          {applications.map((app, index) => (
            <div key={index} className={styles.appCard}>
              <div className={styles.appHeader}>
                <span className={styles.appIcon}>{app.icon}</span>
                <div>
                  <h3 className={styles.appTitle}>{app.title}</h3>
                  <span className={styles.appStatus}>{app.status}</span>
                </div>
              </div>
              <p className={styles.appDesc}>{app.description}</p>
              {app.links.length > 0 && (
                <div className={styles.appLinks}>
                  {app.links.map((link, i) => (
                    <Link key={i} to={link.url} className={styles.appLink}>
                      {link.label} &rarr;
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function AiToolsSection() {
  const tools = [
    {
      icon: '💬',
      title: 'quarkus-chat-ui',
      tagline: 'Web Front-End for LLMs',
      desc: 'Browser-based UI for Claude Code, vLLM, Ollama, and any OpenAI-compatible server. Multi-instance conversations via MCP.',
      to: 'https://github.com/scivicslab/quarkus-chat-ui',
    },
    {
      icon: '🔀',
      title: 'MCP Gateway',
      tagline: 'Name-based MCP reverse proxy',
      desc: 'Register MCP servers by name. Route all clients through one gateway instead of tracking individual ports.',
      to: 'https://github.com/scivicslab/quarkus-mcp-gateway',
    },
    {
      icon: '📝',
      title: 'Emacs MCP Server',
      tagline: 'Control Emacs from Claude',
      desc: 'Let Claude open files, evaluate Lisp, and navigate definitions in your running Emacs instance via emacsclient.',
      to: 'https://github.com/scivicslab/emacs-mcp-server',
    },
  ];

  return (
    <section className={styles.aiTools}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.aiToolsBadge}>Built on POJO-actor</span>
          <Heading as="h2" className={styles.aiToolsTitle}>
            AI Tools
          </Heading>
          <p className={styles.aiToolsDesc}>
            LLM consoles, MCP infrastructure, and editor integration — all built with Java and Quarkus on top of the POJO-actor stack.
          </p>
        </div>
        <div className={styles.aiToolsGrid}>
          {tools.map((tool, idx) => (
            <Link key={idx} to={tool.to} className={styles.aiToolCard}>
              <div className={styles.aiToolIcon}>{tool.icon}</div>
              <div>
                <h3 className={styles.aiToolName}>{tool.title}</h3>
                <p className={styles.aiToolTagline}>{tool.tagline}</p>
                <p className={styles.aiToolDesc}>{tool.desc}</p>
                <span className={styles.aiToolLink}>Learn more →</span>
              </div>
            </Link>
          ))}
        </div>
        <div className={styles.featureCta}>
          <Link className={styles.aiToolsBtn} to="/docs/ai-tools/introduction">
            Explore AI Tools
          </Link>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className={styles.workflow}>
      <div className={styles.container}>
        <div className={styles.workflowGrid}>
          <div className={styles.workflowCode}>
            <div className={styles.codeWindow}>
              <div className={styles.codeHeader}>
                <span className={styles.dot} style={{background: '#ff5f56'}}></span>
                <span className={styles.dot} style={{background: '#ffbd2e'}}></span>
                <span className={styles.dot} style={{background: '#27ca40'}}></span>
                <span className={styles.codeTitle}>deploy.yaml</span>
              </div>
              <CodeBlock language="yaml" className={styles.codeBlock}>
                {workflowYaml}
              </CodeBlock>
            </div>
          </div>
          <div className={styles.workflowText}>
            <span className={styles.sectionBadge}>Turing-workflow in Action</span>
            <Heading as="h2" className={styles.sectionTitle}>
              Define workflows in YAML, execute anywhere
            </Heading>
            <p className={styles.workflowDesc}>
              Turing-workflow turns YAML definitions into executable pipelines.
              Combined with actor-IaC, it orchestrates commands across distributed
              nodes via SSH with full traceability.
            </p>
            <ul className={styles.workflowList}>
              <li>Automaton-based state transitions with conditional branching</li>
              <li>Parallel execution across node groups</li>
              <li>Visual workflow editor for browser-based design</li>
              <li>Plugin system for custom actions and integrations</li>
            </ul>
            <Link className={styles.primaryBtn} to="/docs/actor-iac/introduction">
              See actor-IaC Example
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const articles = [
  {
    title: 'quarkus-chat-ui: A Web Front-End for LLMs, and a Real-World Case for POJO-actor',
    url: '/blog/2026-04-05-quarkus-chat-ui-intro',
    date: 'Apr 5, 2026',
    description: 'A web UI for LLMs where multiple instances can talk to each other via MCP.',
    pattern: 'grid',
    isInternal: true,
  },
  {
    title: 'POJO-actor Tutorial Part 2-3: Introducing the @Action Annotation',
    url: '/blog/2026-01-27-TutorialPart2-3',
    date: 'Jan 27, 2026',
    description: 'Define workflow actions declaratively without overriding callByActionName().',
    pattern: 'waves',
    isInternal: true,
  },
  {
    title: 'POJO-actor Tutorial Part 2-1: Workflow Language Basics',
    url: '/blog/2025-12-30-TutorialPart2-1',
    date: 'Dec 30, 2025',
    description: 'Introduction to the workflow language and its core concepts.',
    pattern: 'nodes',
    isInternal: true,
  },
  {
    title: 'POJO-actor v1.0: A Lightweight Actor Model Library for Java',
    url: '/blog/2025-12-22-pojo-actor-v1-introduction',
    date: 'Dec 22, 2025',
    description: 'Announcing POJO-actor v1.0 and its key features.',
    pattern: 'grid',
    isInternal: true,
  },
];

function ArticlePattern({ pattern }: { pattern: string }) {
  if (pattern === 'nodes') {
    return (
      <svg className={styles.articlePattern} viewBox="0 0 200 80" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect width="200" height="80" fill="url(#grad1)" />
        <circle cx="30" cy="25" r="8" fill="rgba(255,255,255,0.3)" />
        <circle cx="80" cy="50" r="10" fill="rgba(255,255,255,0.4)" />
        <circle cx="140" cy="30" r="6" fill="rgba(255,255,255,0.3)" />
        <circle cx="170" cy="60" r="8" fill="rgba(255,255,255,0.35)" />
        <line x1="30" y1="25" x2="80" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        <line x1="80" y1="50" x2="140" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        <line x1="140" y1="30" x2="170" y2="60" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        <circle cx="50" cy="65" r="5" fill="rgba(255,255,255,0.25)" />
        <line x1="50" y1="65" x2="80" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (pattern === 'grid') {
    return (
      <svg className={styles.articlePattern} viewBox="0 0 200 80" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect width="200" height="80" fill="url(#grad2)" />
        {[0, 40, 80, 120, 160].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="80" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        ))}
        {[0, 20, 40, 60].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        ))}
        <rect x="40" y="20" width="40" height="20" fill="rgba(255,255,255,0.2)" rx="2" />
        <rect x="120" y="40" width="40" height="20" fill="rgba(255,255,255,0.25)" rx="2" />
        <rect x="80" y="40" width="20" height="20" fill="rgba(255,255,255,0.15)" rx="2" />
      </svg>
    );
  }
  // waves
  return (
    <svg className={styles.articlePattern} viewBox="0 0 200 80" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <rect width="200" height="80" fill="url(#grad3)" />
      <path d="M0 50 Q25 30 50 50 T100 50 T150 50 T200 50" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <path d="M0 60 Q25 40 50 60 T100 60 T150 60 T200 60" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      <path d="M0 40 Q25 20 50 40 T100 40 T150 40 T200 40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle cx="160" cy="25" r="12" fill="rgba(255,255,255,0.25)" />
    </svg>
  );
}

function ArticlesSection() {
  return (
    <section className={styles.articles}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Latest Articles</span>
          <Heading as="h2" className={styles.sectionTitle}>
            From Our Blog
          </Heading>
          <p className={styles.sectionDesc}>
            Tutorials, announcements, and insights.
          </p>
        </div>
        <div className={styles.articlesGrid}>
          {articles.map((article, index) => (
            article.isInternal ? (
              <Link
                key={index}
                to={article.url}
                className={styles.articleCard}
              >
                <ArticlePattern pattern={article.pattern} />
                <div className={styles.articleBody}>
                  <span className={styles.articleDate}>{article.date}</span>
                  <h3 className={styles.articleTitle}>{article.title}</h3>
                  <p className={styles.articleDesc}>{article.description}</p>
                  <span className={styles.articleLink}>Read more &rarr;</span>
                </div>
              </Link>
            ) : (
              <a
                key={index}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.articleCard}
              >
                <ArticlePattern pattern={article.pattern} />
                <div className={styles.articleBody}>
                  <span className={styles.articleDate}>{article.date}</span>
                  <h3 className={styles.articleTitle}>{article.title}</h3>
                  <p className={styles.articleDesc}>{article.description}</p>
                  <span className={styles.articleLink}>Read on CoderLegion &rarr;</span>
                </div>
              </a>
            )
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportSection() {
  return (
    <section className={styles.support}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Support &amp; Sponsorship</span>
          <Heading as="h2" className={styles.sectionTitle}>
            Open source, with professional support
          </Heading>
          <p className={styles.sectionDesc}>
            All projects are free and open source. Sponsors get dedicated support.
          </p>
        </div>
        <div className={styles.supportGrid}>
          <div className={styles.supportItem}>
            <div className={styles.supportIcon}>&#x2615;</div>
            <h3>$2/mo</h3>
            <p className={styles.supportTier}>Coffee Supporter</p>
            <p>Our thanks and a GitHub Sponsor badge.</p>
          </div>
          <div className={styles.supportItem}>
            <div className={styles.supportIcon}>&#x1F4AC;</div>
            <h3>$10/mo</h3>
            <p className={styles.supportTier}>Support</p>
            <p>Priority issue response and setup guidance.</p>
          </div>
          <div className={styles.supportItem}>
            <div className={styles.supportIcon}>&#x1F680;</div>
            <h3>$50/mo</h3>
            <p className={styles.supportTier}>Pro Support</p>
            <p>Direct support channel, architecture consultation, bug-fix priority.</p>
          </div>
          <div className={styles.supportItem}>
            <div className={styles.supportIcon}>&#x1F3E2;</div>
            <h3>$200/mo</h3>
            <p className={styles.supportTier}>Organization</p>
            <p>Team support, logo on scivicslab.com.</p>
          </div>
        </div>
        <div className={styles.supportCta}>
          <Link className={styles.primaryBtn} to="https://github.com/sponsors/scivicslab">
            Become a Sponsor
          </Link>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className={styles.cta}>
      <div className={styles.container}>
        <Heading as="h2" className={styles.ctaTitle}>
          Ready to build with actors?
        </Heading>
        <p className={styles.ctaDesc}>
          Start with POJO-actor, define workflows in YAML, and scale to AI agents and infrastructure.
        </p>
        <div className={styles.ctaButtons}>
          <Link className={styles.primaryBtn} to="/docs/pojo-actor/getting-started">
            Quick Start Guide
          </Link>
          <Link className={styles.secondaryBtn} to="https://github.com/scivicslab">
            Star on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Home"
      description="Scivics Lab — A lightweight actor model and workflow engine for Java, powering AI agent platforms, infrastructure automation, and container orchestration.">
      <main>
        <HeroSection />
        <StackSection />
        <ApplicationsSection />
        <AiToolsSection />
        <WorkflowSection />
        <ArticlesSection />
        <SupportSection />
        <CtaSection />
      </main>
    </Layout>
  );
}
