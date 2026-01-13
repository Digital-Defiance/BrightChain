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
import { SimpleSoupDemo } from './components/SimpleSoupDemo';
import { BrightChainSoupDemo } from './components/BrightChainSoupDemo';
import { MinimalBrightChainDemo } from './components/MinimalBrightChainDemo';

function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app">
      <Hero scrollY={scrollY} />
      <Components />
      <Demo />
      <About />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/new" element={<BlogEditor />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/demo" element={<BrightChainSoupDemo />} />
      </Routes>
    </Router>
  );
}

export default App;
