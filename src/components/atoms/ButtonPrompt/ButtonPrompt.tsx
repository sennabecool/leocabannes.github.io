import { useState, useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import styles from './ButtonPrompt.module.css'

const CHAR_INTERVAL_MS = 40

export interface ButtonPromptProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  prefix?: string
  suffix?: string
  isActive?: boolean
  /** Start expanded. The component manages its own toggle state. */
  defaultExpanded?: boolean
}

export function ButtonPrompt({
  label = 'button',
  prefix,
  suffix,
  isActive = false,
  defaultExpanded = false,
  className,
  onClick,
  ...rest
}: ButtonPromptProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [displayedPrefix, setDisplayedPrefix] = useState(defaultExpanded ? (prefix ?? '') : '')
  const [displayedSuffix, setDisplayedSuffix] = useState(defaultExpanded ? (suffix ?? '') : '')
  const prevExpanded = useRef(defaultExpanded)

  useEffect(() => {
    const wasExpanded = prevExpanded.current
    prevExpanded.current = expanded

    const fullPrefix = prefix ?? ''
    const fullSuffix = suffix ?? ''
    const maxLen = Math.max(fullPrefix.length, fullSuffix.length)

    if (!expanded) {
      if (wasExpanded) {
        // Collapsing — animate out
        if (maxLen === 0) return
        let i = maxLen
        const id = setInterval(() => {
          i--
          setDisplayedPrefix(fullPrefix.slice(0, i))
          setDisplayedSuffix(fullSuffix.slice(0, i))
          if (i <= 0) clearInterval(id)
        }, CHAR_INTERVAL_MS)
        return () => clearInterval(id)
      }
      // Already collapsed (initial mount or prop change) — clear instantly
      setDisplayedPrefix('')
      setDisplayedSuffix('')
      return
    }

    if (wasExpanded) {
      // Already expanded (initial mount with defaultExpanded, or prop change) — show full instantly
      setDisplayedPrefix(fullPrefix)
      setDisplayedSuffix(fullSuffix)
      return
    }

    // Expanding — animate in
    if (maxLen === 0) return
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayedPrefix(fullPrefix.slice(0, i))
      setDisplayedSuffix(fullSuffix.slice(0, i))
      if (i >= maxLen) clearInterval(id)
    }, CHAR_INTERVAL_MS)

    return () => clearInterval(id)
  }, [expanded, prefix, suffix])

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    setExpanded(v => !v)
    onClick?.(e)
  }

  return (
    <button
      className={[
        styles.button,
        expanded ? styles.expanded : '',
        isActive ? styles.active : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      {...rest}
    >
      {prefix && displayedPrefix && (
        <span className={styles.prefixWrap}>
          <span className={styles.prefixInner}>{displayedPrefix}</span>
        </span>
      )}
      <span className={styles.label}>{label}</span>
      {suffix && displayedSuffix && (
        <span className={styles.suffixWrap}>
          <span className={styles.suffixInner}>{displayedSuffix}</span>
        </span>
      )}
    </button>
  )
}
