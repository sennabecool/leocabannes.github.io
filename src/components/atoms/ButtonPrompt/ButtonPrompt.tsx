import type { ButtonHTMLAttributes } from 'react'
import styles from './ButtonPrompt.module.css'

type ButtonPromptSize = 'sm' | 'big'

export interface ButtonPromptProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonPromptSize
  label?: string
  /** Big size only */
  prefix?: string
  /** Big size only */
  suffix?: string
  isActive?: boolean
}

export function ButtonPrompt({
  size = 'sm',
  label = 'button',
  prefix,
  suffix,
  isActive = false,
  className,
  ...rest
}: ButtonPromptProps) {
  return (
    <button
      className={[
        styles.button,
        styles[size],
        isActive ? styles.active : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {size === 'big' && prefix && (
        <span className={styles.accent}>{prefix}</span>
      )}
      <span className={styles.label}>{label}</span>
      {size === 'big' && suffix && (
        <span className={styles.accent}>{suffix}</span>
      )}
    </button>
  )
}
