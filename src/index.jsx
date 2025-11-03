console.log('URL', import.meta.env.VITE_SUPABASE_URL);
console.log('KEY', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tailwind.css';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<App />);