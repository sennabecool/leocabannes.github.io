import styles from './sections.module.css'

const FONT_SIZES = [
  { token: '--text-xs',   label: 'xs',   px: '12px' },
  { token: '--text-sm',   label: 'sm',   px: '14px' },
  { token: '--text-base', label: 'base', px: '16px' },
  { token: '--text-lg',   label: 'lg',   px: '18px' },
  { token: '--text-xl',   label: 'xl',   px: '20px' },
  { token: '--text-2xl',  label: '2xl',  px: '24px' },
  { token: '--text-3xl',  label: '3xl',  px: '30px' },
  { token: '--text-4xl',  label: '4xl',  px: '36px' },
  { token: '--text-5xl',  label: '5xl',  px: '48px' },
  { token: '--text-6xl',  label: '6xl',  px: '60px' },
]

const FONT_WEIGHTS = [
  { token: '--weight-light',     label: 'light',     value: '300' },
  { token: '--weight-regular',   label: 'regular',   value: '400' },
  { token: '--weight-medium',    label: 'medium',    value: '500' },
  { token: '--weight-semibold',  label: 'semibold',  value: '600' },
  { token: '--weight-bold',      label: 'bold',      value: '700' },
  { token: '--weight-extrabold', label: 'extrabold', value: '800' },
]

export default function TypographySection() {
  return (
    <section id="typography" className={styles.section}>
      <h2 className={styles.sectionTitle}>Typography</h2>

      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Font families</h3>
        <div className={styles.typeFamily}>
          <div>
            <span className={styles.tokenName}>--font-sans</span>
            <p style={{ fontFamily: 'var(--font-sans)', marginTop: 4 }}>
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
          <div>
            <span className={styles.tokenName}>--font-mono</span>
            <p style={{ fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              const hello = () =&gt; 'world'
            </p>
          </div>
        </div>
      </div>

      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Font sizes</h3>
        <div className={styles.typeScale}>
          {FONT_SIZES.map(({ token, label, px }) => (
            <div key={token} className={styles.typeRow}>
              <div className={styles.typeMeta}>
                <span className={styles.tokenName}>{token}</span>
                <span className={styles.tokenValue}>{px}</span>
              </div>
              <p style={{ fontSize: `var(${token})`, lineHeight: 'var(--leading-tight)' }}>
                Ag — {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Font weights</h3>
        <div className={styles.typeScale}>
          {FONT_WEIGHTS.map(({ token, label, value }) => (
            <div key={token} className={styles.typeRow}>
              <div className={styles.typeMeta}>
                <span className={styles.tokenName}>{token}</span>
                <span className={styles.tokenValue}>{value}</span>
              </div>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: `var(${token})` }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
