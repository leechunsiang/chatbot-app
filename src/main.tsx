import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { Dashboard } from './pages/Dashboard.tsx'

function Router() {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      const newPath = window.location.hash.slice(1) || '/';
      console.log('🔄 Hash changed to:', newPath);
      setCurrentPath(newPath);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  console.log('🚀 Router rendering with path:', currentPath);

  if (currentPath === '/dashboard') {
    console.log('✅ Rendering Dashboard');
    return <Dashboard />;
  }

  console.log('✅ Rendering App');
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
