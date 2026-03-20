import { useState, useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import styles from './ButtonPrompt.module.css'

const CHAR_INTERVAL_MS = 40  // collapse erase speed
const WRITE_MS    = 20   // phase 1: type all chars as glitches
const CORRECT_MS  = 200  // phase 2: correct glitches one by one

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

    // Phase 1 — write all chars fast as glitches (prefix then suffix)
    // Phase 2 — correct glitches slowly left to right
    const totalLen = fullPrefix.length + fullSuffix.length
    if (totalLen === 0) return

    const prefixGlitches = Array.from(fullPrefix, nextGlitchChar)
    const suffixGlitches = Array.from(fullSuffix, nextGlitchChar)

    let phase2Id: ReturnType<typeof setInterval>
    let writePos = 0

    const phase1Id = setInterval(() => {
      writePos++
      setDisplayedPrefix(prefixGlitches.slice(0, Math.min(writePos, fullPrefix.length)).join(''))
      setDisplayedSuffix(suffixGlitches.slice(0, Math.max(0, writePos - fullPrefix.length)).join(''))

      if (writePos >= totalLen) {
        clearInterval(phase1Id)
        let correctPos = 0
        phase2Id = setInterval(() => {
          correctPos++
          const pc = Math.min(correctPos, fullPrefix.length)
          const sc = Math.max(0, correctPos - fullPrefix.length)
          setDisplayedPrefix(fullPrefix.slice(0, pc) + prefixGlitches.slice(pc).join(''))
          setDisplayedSuffix(fullSuffix.slice(0, sc) + suffixGlitches.slice(sc).join(''))
          if (correctPos >= totalLen) clearInterval(phase2Id)
        }, CORRECT_MS)
      }
    }, WRITE_MS)

    return () => { clearInterval(phase1Id); clearInterval(phase2Id) }
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
