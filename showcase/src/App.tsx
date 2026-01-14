import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import About from './components/About';
import Blog from './components/Blog';
import BlogPost from './components/BlogPost';
import BlogEditor from './components/BlogEditor';
import Components from './components/Components';
import Demo from './components/Demo';
import Hero from './components/Hero';
import { BrightChainSoupDemo } from './components/BrightChainSoupDemo';
import { CompatibilityWarning } from './components/CompatibilityWarning';
import { DemoNavigation } from './components/DemoNavigation';
import { ScrollIndicator } from './components/ScrollIndicator';
import { AccessibilityProvider } from './components/AccessibilityProvider';
import { EducationalModeProvider } from './components/EducationalModeProvider';
import { SkipLink } from './components/SkipLink';

function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app" id="main-content">
      <Hero scrollY={scrollY} />
      <Components />
      <Demo />
      <About />
      <ScrollIndicator targetId="home" showProgress={true} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AccessibilityProvider>
        <EducationalModeProvider>
          <SkipLink />
          <CompatibilityWarning />
          <DemoNavigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/new" element={<BlogEditor />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/demo" element={<BrightChainSoupDemo />} />
          </Routes>
        </EducationalModeProvider>
      </AccessibilityProvider>
    </Router>
  );
}

export default App;
