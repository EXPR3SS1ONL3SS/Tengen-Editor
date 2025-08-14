import * as react from 'react'; import * as rDom from 'react-dom';
import { createRoot } from 'react-dom/client';
class App extends react.Component {
  render() {
    return react.createElement('div', null, 'Hello, World!');
  }
}
const container = document.getElementById('tengen-editor-root');
if (container) {
    const root = createRoot(container);
    root.render(<App/>);
}