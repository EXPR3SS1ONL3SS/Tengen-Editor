import React, * as react from 'react'; import * as rDom from 'react-dom';
import * as client from 'react-dom/client'
import * as boot from 'react-bootstrap';
const container = document.getElementById('tengen-editor-toot') as HTMLElement;
const root = client.createRoot(container);
const el = {
  elements: {},
  update: [] as Function[],
  setup: [] as Function[],
}

el.setup.push(()=> {
  let card = makeCard({title:"tufts",text:"is","btntext":"gay"})
  root.render(card)
})

function setupApp() {
  for (var func of el.setup) {
    func();
  }
  return true;
}
function renderApp() {
  for (var func of el.update) {
    func();
  }
  return true;
}
function makeCard(data: Record<string, string>) {
  return (
    <div className='card' style={{width: "18rem"}}>
      <img src='...' alt='...' className='card-img-top'></img>
      <div className="card-body">
        <h5 className="card-title">${data.title || "this"}</h5>
        <p className="card-text">${data.text || "is a"}</p>
        <a href="#" className="btn btn-primary">{data.btntext || "placeholder"}</a>
        </div>
    </div>
  )
}



setInterval(renderApp, 1000/60);