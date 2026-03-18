import { Icon } from '../../../components'
import type { IconName } from '../../../components'
import styles from './sections.module.css'
import iconStyles from './IconsSection.module.css'

const ICONS: { name: IconName; label: string }[] = [
  { name: 'plus', label: 'Plus' },
]

export default function IconsSection() {
  return (
    <section id="icons" className={styles.section}>
      <h2 className={styles.sectionTitle}>Icons</h2>
      <div className={styles.tokenGroup}>
        <h3 className={styles.groupTitle}>24px</h3>
        <div className={iconStyles.grid}>
          {ICONS.map(({ name, label }) => (
            <div key={name} className={iconStyles.tile}>
              <div className={iconStyles.preview}>
                <Icon name={name} size={24} />
              </div>
              <span className={styles.tokenName}>Icon / {label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
