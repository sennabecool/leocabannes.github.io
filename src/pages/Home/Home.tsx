import styles from './Home.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Home</h1>
        <p className={styles.sub}>Placeholder — Hero and projects will go here.</p>
      </section>
    </div>
  )
}
