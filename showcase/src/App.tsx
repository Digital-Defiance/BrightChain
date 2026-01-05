import { useEffect, useState } from 'react';
import './App.css';
import About from './components/About';
import Components from './components/Components';
import Demo from './components/Demo';
import Hero from './components/Hero';

function App() {
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

export default App;
