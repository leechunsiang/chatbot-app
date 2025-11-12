import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { BackgroundBoxesDemo } from '../components/ui/background-boxes-demo';

const root = document.getElementById('demo-root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <div className="min-h-screen w-full bg-slate-950 p-8 flex flex-col gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Background Boxes Demo - Test Page</h1>
          <p className="text-slate-400">
            This is an isolated test page for the BackgroundBoxesDemo component
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <BackgroundBoxesDemo />
        </div>

        <div className="text-center text-sm text-slate-500">
          Access this page at: <code className="bg-slate-800 px-2 py-1 rounded">http://localhost:5173/background-demo.html</code>
        </div>
      </div>
    </StrictMode>
  );
}
