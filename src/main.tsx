import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './ottoPremiumSystem.css';
import './ottoReferencePalette.css';
import B1App from './b1/B1App';

// OTTO B1 preview runs without A1 authentication, state-sync or payment endpoints.
// Production features remain disabled until B1-only services are provisioned.
const node=document.getElementById('root');
if(!node)throw new Error('Missing root');
createRoot(node).render(<StrictMode><B1App/></StrictMode>);
