import styles from './sections.module.css'

const TEXT_STYLES = [
  {
    name: 'btn-sm',
    description: 'ButtonPrompt — collapsed',
    style: {
      fontFamily: 'var(--btn-sm-family)',
      fontSize: 'var(--btn-sm-size)',
      lineHeight: 'var(--btn-sm-leading)',
      fontWeight: 'var(--btn-sm-weight)',
    },
    tokens: [
      { token: '--btn-sm-family',  value: 'Asta Sans' },
      { token: '--btn-sm-size',    value: '12px' },
      { token: '--btn-sm-leading', value: '16px' },
      { token: '--btn-sm-weight',  value: '600' },
    ],
  },
  {
    name: 'btn-lg',
    description: 'ButtonPrompt — expanded',
    style: {
      fontFamily: 'var(--btn-lg-family)',
      fontSize: 'var(--btn-lg-size)',
      lineHeight: 'var(--btn-lg-leading)',
      fontWeight: 'var(--btn-lg-weight)',
    },
    tokens: [
      { token: '--btn-lg-family',  value: 'Asta Sans' },
      { token: '--btn-lg-size',    value: '14px' },
      { token: '--btn-lg-leading', value: '18px' },
      { token: '--btn-lg-weight',  value: '600' },
    ],
  },
]

export default function TypographySection() {
  return (
    <section id="typography" className={styles.section}>
      <h2 className={styles.sectionTitle}>Typography</h2>

      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Font family</h3>
        <div className={styles.typeFamily}>
          <div>
            <span className={styles.tokenName}>--font-prompt</span>
            <p style={{ fontFamily: 'var(--font-prompt)', marginTop: 4 }}>
              Tell me more about yourself
            </p>
          </div>
        </div>
      </div>

      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Font sizes</h3>
        <div className={styles.typeScale}>
          <div className={styles.typeRow}>
            <div className={styles.typeMeta}>
              <span className={styles.tokenName}>--text-xs</span>
              <span className={styles.tokenValue}>12px</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', lineHeight: 'var(--leading-tight)' }}>
              Ag — xs
            </p>
          </div>
          <div className={styles.typeRow}>
            <div className={styles.typeMeta}>
              <span className={styles.tokenName}>--text-sm</span>
              <span className={styles.tokenValue}>14px</span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-tight)' }}>
              Ag — sm
            </p>
          </div>
        </div>
      </div>

      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Font weight</h3>
        <div className={styles.typeScale}>
          <div className={styles.typeRow}>
            <div className={styles.typeMeta}>
              <span className={styles.tokenName}>--weight-semibold</span>
              <span className={styles.tokenValue}>600</span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
              semibold
            </p>
          </div>
        </div>
      </div>

      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>Text styles</h3>
        <div className={styles.typeScale}>
          {TEXT_STYLES.map(ts => (
            <div key={ts.name} className={styles.textStyleRow}>
              <div className={styles.textStyleMeta}>
                <span className={styles.textStyleName}>{ts.name}</span>
                <span className={styles.tokenValue}>{ts.description}</span>
                <div className={styles.textStyleTokens}>
                  {ts.tokens.map(t => (
                    <span key={t.token} className={styles.tokenName}>
                      {t.token}: {t.value}
                    </span>
                  ))}
                </div>
              </div>
              <p style={ts.style}>
                Tell me more about yourself
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
