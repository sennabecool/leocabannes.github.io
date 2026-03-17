import { Outlet } from 'react-router-dom'
import styles from './PageLayout.module.css'

export default function PageLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <a href="#/" className={styles.logo}>Portfolio</a>
          <ul className={styles.links}>
            <li><a href="#/projects">Projects</a></li>
            <li><a href="#/about">About</a></li>
            <li><a href="#/contact">Contact</a></li>
          </ul>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>Portfolio — placeholder footer</p>
      </footer>
    </div>
  )
}
