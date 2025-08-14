import * as react from 'react'; import * as rDom from 'react-dom';
import * as client from 'react-dom/client'

class App extends react.Component {
  render() {
      return (
      <div style={{width:'30%', height:'30%', color:'black'}}>
        text
      </div>
      );
  }
}

const container = document.getElementById('tengen-editor-root');
if (container) {
    const root = client.hydrateRoot(container, <App/>);
    root.render(<App/>);
}