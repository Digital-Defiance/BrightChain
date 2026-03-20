import { useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import About from './components/About';
import { AccessibilityProvider } from './components/AccessibilityProvider';
import { AnimatedBrightChainDemo } from './components/AnimatedBrightChainDemo';
import Blog from './components/Blog';
import BlogEditor from './components/BlogEditor';
import BlogPost from './components/BlogPost';
import { BrightChainSoupDemo } from './components/BrightChainSoupDemo';
import { CompatibilityWarning } from './components/CompatibilityWarning';
import Components from './components/Components';
import Demo from './components/Demo';
import { DemoNavigation } from './components/DemoNavigation';
import { EducationalModeProvider } from './components/EducationalModeProvider';
import FAQ from './components/FAQ';
import Hero from './components/Hero';
import { LedgerDemo } from './components/LedgerDemo';
import { ScrollIndicator } from './components/ScrollIndicator';
import { SkipLink } from './components/SkipLink';
import { ShowcaseI18nProvider } from './i18n/ShowcaseI18nContext';

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
      <ShowcaseI18nProvider>
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
              <Route path="/animation" element={<AnimatedBrightChainDemo />} />
              <Route path="/ledger" element={<LedgerDemo />} />
              <Route path="/faq" element={<FAQ />} />
            </Routes>
          </EducationalModeProvider>
        </AccessibilityProvider>
      </ShowcaseI18nProvider>
    </Router>
  );
}

export default App;
