import styles from './sections.module.css'

const SPACE_TOKENS = [
  { token: '--space-1',  label: '1',  px: '4px'  },
  { token: '--space-2',  label: '2',  px: '8px'  },
  { token: '--space-3',  label: '3',  px: '12px' },
  { token: '--space-4',  label: '4',  px: '16px' },
  { token: '--space-5',  label: '5',  px: '20px' },
  { token: '--space-6',  label: '6',  px: '24px' },
  { token: '--space-8',  label: '8',  px: '32px' },
  { token: '--space-10', label: '10', px: '40px' },
  { token: '--space-12', label: '12', px: '48px' },
  { token: '--space-16', label: '16', px: '64px' },
  { token: '--space-20', label: '20', px: '80px' },
  { token: '--space-24', label: '24', px: '96px' },
  { token: '--space-32', label: '32', px: '128px' },
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

      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Layout tokens</h3>
        <table className={styles.table}>
          <tbody>
            <tr><td className={styles.tokenName}>--container-max</td><td className={styles.tokenValue}>1280px</td></tr>
            <tr><td className={styles.tokenName}>--container-narrow</td><td className={styles.tokenValue}>768px</td></tr>
            <tr><td className={styles.tokenName}>--container-px</td><td className={styles.tokenValue}>24px</td></tr>
            <tr><td className={styles.tokenName}>--section-py</td><td className={styles.tokenValue}>80px</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
