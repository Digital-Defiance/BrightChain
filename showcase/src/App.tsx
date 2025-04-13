import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import About from './components/About';
import Components from './components/Components';
import Demo from './components/Demo';
import Hero from './components/Hero';
import { SimpleSoupDemo } from './components/SimpleSoupDemo';

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
        <Route path="/soup" element={<SimpleSoupDemo />} />
      </Routes>
    </Router>
  );
}

export default App;
