import { Routes, Route } from 'react-router-dom'
import PageLayout from '@templates/PageLayout'
import Home from '@pages/Home'
import Projects from '@pages/Projects'
import About from '@pages/About'
import Contact from '@pages/Contact'
import DesignSystem from '@pages/DesignSystem'

export default function App() {
  return (
    <Routes>
      <Route element={<PageLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
      <Route path="/design-system" element={<DesignSystem />} />
    </Routes>
  )
}
