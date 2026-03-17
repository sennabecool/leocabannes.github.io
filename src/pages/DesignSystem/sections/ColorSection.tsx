import { useEffect, useState } from 'react'
import styles from './sections.module.css'

interface ColorToken {
  name: string
  value: string
}

interface ColorGroup {
  label: string
  tokens: ColorToken[]
}

function resolveVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function makeGroup(label: string, prefix: string, steps: (number | string)[]): ColorGroup {
  return {
    label,
    tokens: steps.map(step => {
      const name = `${prefix}${step}`
      return { name, value: resolveVar(name) }
    }),
  }
}

const SEMANTIC_TOKENS = [
  '--color-bg-base',
  '--color-bg-subtle',
  '--color-bg-muted',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-disabled',
  '--color-text-inverse',
  '--color-border',
  '--color-border-strong',
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-muted',
  '--color-accent-text',
  '--color-success',
  '--color-warning',
  '--color-error',
]

// ── Component-specific token groups ──────────────────────────────────────────
// Add a new entry here whenever a component introduces its own color tokens.
const PROMPT_TOKENS = [
  '--color-prompt-bg',
  '--color-prompt-bg-hover',
  '--color-prompt-accent',
  '--color-prompt-ink',
  '--color-prompt-border',
]

export default function ColorSection() {
  const [groups, setGroups] = useState<ColorGroup[]>([])

  useEffect(() => {
    setGroups([
      makeGroup('Neutrals', '--color-neutral-', [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
      makeGroup('Brand', '--color-brand-', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
      {
        label: 'Semantic',
        tokens: SEMANTIC_TOKENS.map(name => ({ name, value: resolveVar(name) })),
      },
      {
        label: 'ButtonPrompt',
        tokens: PROMPT_TOKENS.map(name => ({ name, value: resolveVar(name) })),
      },
    ])
  }, [])

  return (
    <section id="colors" className={styles.section}>
      <h2 className={styles.sectionTitle}>Colors</h2>
      {groups.map(group => (
        <div key={group.label} className={styles.tokenGroup}>
          <h3 className={styles.groupTitle}>{group.label}</h3>
          <div className={styles.swatches}>
            {group.tokens.map(token => (
              <div key={token.name} className={styles.swatch}>
                <div
                  className={styles.swatchColor}
                  style={{ backgroundColor: `var(${token.name})` }}
                  title={token.value}
                />
                <div className={styles.swatchMeta}>
                  <span className={styles.tokenName}>{token.name}</span>
                  <span className={styles.tokenValue}>{token.value || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
