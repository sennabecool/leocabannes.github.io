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

export default function ColorSection() {
  const [groups, setGroups] = useState<ColorGroup[]>([])

  useEffect(() => {
    setGroups([
      {
        label: 'Neon',
        tokens: [
          '--color-neon-light',
          '--color-neon-subtle',
          '--color-neon',
          '--color-neon-dark',
        ].map(name => ({ name, value: resolveVar(name) })),
      },
      {
        label: 'Ink & Surface',
        tokens: ['--color-black', '--color-grey'].map(name => ({
          name,
          value: resolveVar(name),
        })),
      },
      {
        label: 'Navbar',
        tokens: [
          '--color-navbar-card',
          '--color-navbar-card-border',
          '--color-navbar-input',
        ].map(name => ({ name, value: resolveVar(name) })),
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
