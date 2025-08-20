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
  makeCard({id:"card1"})
  let card1 = document.getElementById("card1")
  let tool = boot.Tooltip({title:'str', content:'str'})
  root.render(tool)
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
function makeCard(data: Record<string, string>): void {
  boot.Card({
    "id": (data.id || "card"+(Math.random()*(1000*document.getElementsByClassName("bootstrap.card").length)).toString()),
    "children": [
      <img src='...' alt='...' className='bootstrap.card-img-top'></img>,
      <div className='bootstrap.card-body'>
        <h5 className='bootstrap.card-title'>${data.title || "this"}</h5>
        <p className='bootstrap.card-text'>${data.text || "is a"}</p>
        <a href='#' className='btn btn-primary'>${data.bntext || 'placeholder'}</a>
      </div>
    ]
  })
}




setInterval(renderApp, 1000/60);