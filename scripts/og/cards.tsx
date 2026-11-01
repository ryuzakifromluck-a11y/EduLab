/**
 * Social card markup (1200×630) for the default page, each subject and each
 * catalog experiment. Rendered to PNG by scripts/og/generate.mjs.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { ExperimentIllustration } from '../../src/components/ExperimentIllustration'
import { LogoMark } from '../../src/components/layout/Logo'
import { EXPERIMENTS, type IllustrationId, type Subject } from '../../src/data/experiments'
import en from '../../src/i18n/locales/en'
import { translatorFor } from '../../src/seo/meta'

const t = translatorFor(en)

const ACCENT: Record<Subject | 'brand', { ink: string; soft: string }> = {
  physics: { ink: '#a9b8ff', soft: '#1a2349' },
  chemistry: { ink: '#6be3cf', soft: '#0f2f2c' },
  biology: { ink: '#bce582', soft: '#1f2b10' },
  brand: { ink: '#9aadff', soft: '#1b2447' },
}

const CSS = `
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; }
  body {
    --surface: #111725; --brand: #7b93ff;
    font-family: 'Inter Variable', Inter, system-ui, sans-serif;
    background: #0a0e17; color: #e8ecf5;
    display: grid; grid-template-columns: 1fr 440px; gap: 48px; padding: 64px 72px;
  }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 34px; font-weight: 650; letter-spacing: -0.02em; }
  .brand svg { width: 56px; height: 56px; }
  .brand b { color: #7b93ff; font-weight: inherit; }
  .left { display: flex; flex-direction: column; min-width: 0; }
  .pill { align-self: flex-start; margin-top: 64px; padding: 8px 18px; border-radius: 999px; font-size: 22px; font-weight: 600; }
  h1 { margin-top: 22px; font-size: 64px; line-height: 1.05; letter-spacing: -0.03em; font-weight: 700; }
  p { margin-top: 22px; font-size: 26px; line-height: 1.4; color: #a1abc2; }
  footer { margin-top: auto; padding-top: 24px; font-size: 22px; color: #6f7a93; }
  .art { border-radius: 36px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
  .art > div { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  .art svg { width: 92%; height: auto; max-height: none; stroke-width: 1px; }
  .art .hero-grid { background-image: linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px);
    background-size: 32px 32px; opacity: 0.08; position: absolute; inset: 0; }
`

function Card({ pill, title, text, accent, illustration, subject }: {
  pill: string
  title: string
  text: string
  accent: { ink: string; soft: string }
  illustration: IllustrationId
  subject: Subject
}) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style>{CSS}</style>
      </head>
      <body>
        <div className="left">
          <div className="brand">
            <LogoMark />
            <span>
              Edu<b>Lab</b>
            </span>
          </div>
          <span className="pill" style={{ background: accent.soft, color: accent.ink }}>
            {pill}
          </span>
          <h1>{title}</h1>
          <p>{text}</p>
          <footer>{t('footer.free')}</footer>
        </div>
        <div className="art" style={{ background: accent.soft, color: accent.ink }}>
          <ExperimentIllustration id={illustration} subject={subject} />
        </div>
      </body>
    </html>
  )
}

const page = (node: React.ReactElement) => '<!doctype html>' + renderToStaticMarkup(node)

export function cards(): { name: string; html: string }[] {
  const subjects: { subject: Subject; illustration: IllustrationId }[] = [
    { subject: 'physics', illustration: 'pendulum' },
    { subject: 'chemistry', illustration: 'titration' },
    { subject: 'biology', illustration: 'dna' },
  ]
  return [
    {
      name: 'default',
      html: page(
        <Card
          pill={`${t('nav.physics')} · ${t('nav.chemistry')} · ${t('nav.biology')}`}
          title={t('brand.slogan').split('. ')[0]}
          text={t('footer.mission')}
          accent={ACCENT.brand}
          illustration="flask"
          subject="physics"
        />,
      ),
    },
    ...subjects.map(({ subject, illustration }) => ({
      name: subject,
      html: page(
        <Card
          pill={t(`nav.${subject}`)}
          title={t(`subject.${subject}.title`)}
          text={t(`home.subjects.${subject}.tagline`)}
          accent={ACCENT[subject]}
          illustration={illustration}
          subject={subject}
        />,
      ),
    })),
    ...EXPERIMENTS.map((e) => ({
      name: e.id,
      html: page(
        <Card
          pill={`${t(`nav.${e.subject}`)} · ${t(`categories.${e.subject}.${e.category}`)}`}
          title={t(`catalog.${e.id}.title`)}
          text={t(`catalog.${e.id}.description`)}
          accent={ACCENT[e.subject]}
          illustration={e.illustration}
          subject={e.subject}
        />,
      ),
    })),
  ]
}

/** Square brand logo for the schema.org organization. */
export const logo = () =>
  page(
    <html>
      <head>
        <style>{`* { margin: 0 } html, body { width: 512px; height: 512px; background: transparent; --brand: #3b5bdb; --surface: #ffffff; } svg { width: 512px; height: 512px; display: block; }`}</style>
      </head>
      <body>
        <LogoMark />
      </body>
    </html>,
  )
