import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

const exampleCode = `// Define any POJO as an actor
public class TaskRunner {
    public String execute(String command) {
        return Runtime.exec(command);
    }
}

// Use it with the actor system
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
  const {siteConfig} = useDocusaurusContext();
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <span className={styles.badge}>Open Source</span>
          <Heading as="h1" className={styles.heroTitle}>
            Lightweight Actor Model{' '}
            <span className={styles.gradient}>with Automaton-Based Workflows</span>
          </Heading>
          <p className={styles.heroSubtitle}>
            Turn any Plain Old Java Object into a concurrent actor.
            Define workflows in minimal YAML with natural conditional branching—simple
            enough that AI agents generate correct code on the first try.
          </p>
          <div className={styles.heroCta}>
            <Link className={styles.primaryBtn} to="/docs/pojo-actor/introduction">
              Get Started
            </Link>
            <Link className={styles.secondaryBtn} to="https://github.com/scivicslab/POJO-actor">
              View on GitHub
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
              {exampleCode}
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function DocsSection() {
  return (
    <section className={styles.docs}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Documentation</span>
          <Heading as="h2" className={styles.sectionTitle}>
            Complete Guides & References
          </Heading>
          <p className={styles.sectionDesc}>
            Everything you need to get started and master our tools.
          </p>
        </div>
        <div className={styles.docsGrid}>
          <Link to="/docs/pojo-actor/introduction" className={styles.docCard}>
            <div className={styles.docIcon}>📦</div>
            <div className={styles.docContent}>
              <h3>POJO-actor</h3>
              <p className={styles.docTagline}>Actor Model for Java</p>
              <p className={styles.docDesc}>
                Turn any Plain Old Java Object into a concurrent actor.
                No base classes, no annotations—just your code with built-in
                thread safety and async messaging.
              </p>
              <span className={styles.docLink}>Read the docs →</span>
            </div>
          </Link>
          <Link to="/docs/actor-iac/introduction" className={styles.docCard}>
            <div className={styles.docIcon}>🔧</div>
            <div className={styles.docContent}>
              <h3>actor-IaC</h3>
              <p className={styles.docTagline}>Infrastructure as Code</p>
              <p className={styles.docDesc}>
                Define infrastructure workflows in YAML with state machine semantics.
                Execute commands across distributed nodes with automatic error handling.
              </p>
              <span className={styles.docLink}>Read the docs →</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className={styles.features}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Why POJO-actor?</span>
          <Heading as="h2" className={styles.sectionTitle}>
            Simple yet powerful actor model
          </Heading>
          <p className={styles.sectionDesc}>
            No complex frameworks. No boilerplate. Just your Java classes with superpowers.
          </p>
        </div>
        <div className={styles.featureGrid}>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>&#x1F4E6;</div>
            <h3>Zero Dependencies</h3>
            <p>Use any POJO as an actor. No base classes to extend, no interfaces to implement.</p>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>&#x26A1;</div>
            <h3>Virtual Thread Native</h3>
            <p>Built for Java 21+. Each actor runs on its own virtual thread for massive concurrency.</p>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>&#x1F916;</div>
            <h3>Automaton-Based Workflows</h3>
            <p>Simple enough to get right the first time—by humans or AI agents.</p>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>&#x1F310;</div>
            <h3>Distributed Actor System</h3>
            <p>Scale across multiple nodes with location-transparent messaging. (Coming Soon)</p>
          </div>
        </div>
        <div className={styles.featureCta}>
          <Link className={styles.primaryBtn} to="/docs/pojo-actor/introduction">
            Learn POJO-actor
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
            <span className={styles.sectionBadge}>Built on POJO-actor</span>
            <Heading as="h2" className={styles.sectionTitle}>
              actor-IaC: Infrastructure Automation
            </Heading>
            <p className={styles.workflowDesc}>
              Apply POJO-actor's workflow engine to infrastructure automation.
              Execute commands across distributed nodes via SSH, with every action
              logged to an H2 database for full traceability.
            </p>
            <ul className={styles.workflowList}>
              <li>SSH-based remote execution with Ansible-compatible inventory</li>
              <li>Parallel execution across node groups</li>
              <li>Overlay system for environment customization</li>
              <li>Full audit trail with structured logging</li>
            </ul>
            <Link className={styles.primaryBtn} to="/docs/actor-iac/introduction">
              Learn actor-IaC
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const articles = [
  {
    title: 'POJO-actor Tutorial Part 2 (Second Half): Creating Workflows',
    url: 'https://coderlegion.com/9132/pojo-actor-tutorial-part-2-second-half-creating-workflows',
    date: 'Dec 31, 2025',
    description: 'Learn how to create and execute workflows using POJO-actor.',
    pattern: 'nodes',
  },
  {
    title: 'POJO-actor Tutorial Part 2 (First Half): Workflow Language Basics',
    url: 'https://coderlegion.com/9131/pojo-actor-tutorial-part-2-first-half-workflow-language-basics',
    date: 'Dec 31, 2025',
    description: 'Introduction to the workflow language and its core concepts.',
    pattern: 'grid',
  },
  {
    title: 'POJO-actor v1.0: A Lightweight Actor Model Library for Java',
    url: 'https://coderlegion.com/8748/pojo-actor-v1-0-a-lightweight-actor-model-library-for-java',
    date: 'Dec 22, 2025',
    description: 'Announcing POJO-actor v1.0 and its key features.',
    pattern: 'waves',
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
            Tutorials, announcements, and insights from the team.
          </p>
        </div>
        <div className={styles.articlesGrid}>
          {articles.map((article, index) => (
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
                <span className={styles.articleLink}>Read on CoderLegion →</span>
              </div>
            </a>
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
          <span className={styles.sectionBadge}>Support the Project</span>
          <Heading as="h2" className={styles.sectionTitle}>
            Help us build better tools
          </Heading>
          <p className={styles.sectionDesc}>
            Your support helps us maintain and improve these open source tools.
          </p>
        </div>
        <div className={styles.supportGrid}>
          <div className={styles.supportItem}>
            <div className={styles.supportIcon}>⭐</div>
            <h3>Star on GitHub</h3>
            <p>Show your support and help others discover the project.</p>
          </div>
          <div className={styles.supportItem}>
            <div className={styles.supportIcon}>💬</div>
            <h3>Enterprise Support</h3>
            <p>Priority assistance and dedicated support for your team.</p>
          </div>
          <div className={styles.supportItem}>
            <div className={styles.supportIcon}>🛠️</div>
            <h3>Custom Development</h3>
            <p>Tailored solutions and workflow development for your needs.</p>
          </div>
          <div className={styles.supportItem}>
            <div className={styles.supportIcon}>❤️</div>
            <h3>Sponsor</h3>
            <p>Help fund ongoing development and new features.</p>
          </div>
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
          Ready to simplify your infrastructure?
        </Heading>
        <p className={styles.ctaDesc}>
          Get started with POJO-actor and actor-IaC today.
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
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="Scivics Lab - Actor-based Infrastructure as Code. Build concurrent, distributed applications with POJO-actor and automate infrastructure with actor-IaC.">
      <main>
        <HeroSection />
        <FeaturesSection />
        <WorkflowSection />
        <ArticlesSection />
        <SupportSection />
        <CtaSection />
      </main>
    </Layout>
  );
}
