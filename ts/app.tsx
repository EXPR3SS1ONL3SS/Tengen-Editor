import * as react from 'react'; import * as rDom from 'react-dom';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div style={{width:'30%', height:'30%'}}>
      text
    </div>
  )
}

const container = document.getElementById('tengen-editor-root');
if (container) {
    const root = createRoot(container);
    root.render(<App/>);
}