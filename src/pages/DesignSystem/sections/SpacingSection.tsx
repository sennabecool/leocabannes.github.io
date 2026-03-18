import styles from './sections.module.css'

const SPACE_TOKENS = [
  { token: '--space-1', px: '4px'  },
  { token: '--space-2', px: '8px'  },
  { token: '--space-3', px: '12px' },
  { token: '--space-4', px: '16px' },
]

export default function SpacingSection() {
  return (
    <section id="spacing" className={styles.section}>
      <h2 className={styles.sectionTitle}>Spacing</h2>
      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Space scale (base unit: 4px)</h3>
        <div className={styles.spaceScale}>
          {SPACE_TOKENS.map(({ token, px }) => (
            <div key={token} className={styles.spaceRow}>
              <div className={styles.spaceMeta}>
                <span className={styles.tokenName}>{token}</span>
                <span className={styles.tokenValue}>{px}</span>
              </div>
              <div className={styles.spaceBar}>
                <div
                  className={styles.spaceBarFill}
                  style={{ width: `var(${token})` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
