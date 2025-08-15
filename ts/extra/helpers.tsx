import * as React from 'react';
import * as rDomClient from 'react-dom/client'
import * as boot from 'react-bootstrap'
import { log } from 'console';

function tooltip(props: Record<string, any>={
    title: "placeholder",
    content: "placeholder also",
    element: document.getElementById('tengen-editor-root')
}) {
    return (
        <boot.Tooltip onMouseEnter={(e:React.MouseEvent)=>{
            let x:number = e.clientX; let y:number = e.clientY;
            let target = document.elementFromPoint(x,y);
            if (!target) return;
        }}></boot.Tooltip>
    )
}