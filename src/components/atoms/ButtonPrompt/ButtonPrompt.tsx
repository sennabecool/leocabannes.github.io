import { useState, useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import styles from './ButtonPrompt.module.css'

const CHAR_INTERVAL_MS = 40

const LEET: Record<string, string> = {
  a: '4', e: '3', i: '1', o: '0', s: '5',
  t: '7', l: '1', b: '8', g: '9', z: '2',
}
const GLITCH_POOL = '#%&*?@!'

function nextGlitchChar(char: string): string {
  const leet = LEET[char.toLowerCase()]
  if (leet && Math.random() > 0.3) return leet
  return GLITCH_POOL[Math.floor(Math.random() * GLITCH_POOL.length)]
}

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

    if (!expanded) {
      if (wasExpanded) {
        // Collapsing — erase prefix and suffix simultaneously
        const maxLen = Math.max(fullPrefix.length, fullSuffix.length)
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
      // Already collapsed — clear instantly
      setDisplayedPrefix('')
      setDisplayedSuffix('')
      return
    }

    if (wasExpanded) {
      // Already expanded — show full instantly
      setDisplayedPrefix(fullPrefix)
      setDisplayedSuffix(fullSuffix)
      return
    }

    // Expanding — type prefix fully then suffix, each char glitches before revealing
    let prefixDone = fullPrefix.length === 0
    let i = 0
    let glitching = true
    const id = setInterval(() => {
      if (!prefixDone) {
        if (glitching) {
          setDisplayedPrefix(fullPrefix.slice(0, i) + nextGlitchChar(fullPrefix[i]))
          glitching = false
        } else {
          i++
          setDisplayedPrefix(fullPrefix.slice(0, i))
          glitching = true
          if (i >= fullPrefix.length) { prefixDone = true; i = 0 }
        }
      } else {
        if (fullSuffix.length === 0) { clearInterval(id); return }
        if (glitching) {
          setDisplayedSuffix(fullSuffix.slice(0, i) + nextGlitchChar(fullSuffix[i]))
          glitching = false
        } else {
          i++
          setDisplayedSuffix(fullSuffix.slice(0, i))
          glitching = true
          if (i >= fullSuffix.length) clearInterval(id)
        }
      }
    }, CHAR_INTERVAL_MS / 2)

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
