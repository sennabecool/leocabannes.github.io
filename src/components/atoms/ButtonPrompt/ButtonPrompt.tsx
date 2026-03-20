import { useState, useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import styles from './ButtonPrompt.module.css'

const ERASE_MS          = 20  // collapse erase speed (per char)
const WRITE_MS          = 20  // write head tick speed (per char)
const CORRECT_MS        = 80  // correct head tick speed (per char)

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
        }, ERASE_MS)
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

    // Single interval: write head and correct head advance together,
    // correct trails CORRECT_DELAY chars behind write.
    const totalLen = fullPrefix.length + fullSuffix.length
    if (totalLen === 0) return

    const prefixGlitches = Array.from(fullPrefix, nextGlitchChar)
    const suffixGlitches = Array.from(fullSuffix, nextGlitchChar)

    function buildDisplay(real: string, glitches: string[], from: number, to: number) {
      return real.slice(0, from) + glitches.slice(from, to).join('')
    }

    let writePos = 0
    let correctPos = 0

    function render() {
      const cp = Math.min(correctPos, totalLen)
      const wp = Math.min(writePos, totalLen)
      setDisplayedPrefix(buildDisplay(fullPrefix, prefixGlitches,
        Math.min(cp, fullPrefix.length), Math.min(wp, fullPrefix.length)))
      setDisplayedSuffix(buildDisplay(fullSuffix, suffixGlitches,
        Math.max(0, cp - fullPrefix.length), Math.max(0, wp - fullPrefix.length)))
    }

    const writeId = setInterval(() => {
      if (writePos < totalLen) { writePos++; render() }
      else clearInterval(writeId)
    }, WRITE_MS)

    const correctId = setInterval(() => {
      if (correctPos < totalLen) { correctPos++; render() }
      else clearInterval(correctId)
    }, CORRECT_MS)

    return () => { clearInterval(writeId); clearInterval(correctId) }
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
