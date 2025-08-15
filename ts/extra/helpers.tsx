import * as React from 'react';
import * as rDomClient from 'react-dom/client'
import * as boot from 'react-bootstrap'

class hovertip {
    public el;
    constructor(Element: React.ReactElement) {
        this.el = Element
    }
    public render(root:rDomClient.Root) {
        root.render(this.el)
    }
    public onHover(leaveFunc: Function, enterFunc: Function) {

    }
}

function addTooltip(el: React.ReactElement) {
    class jig {}
}

type func = (...args: any[]) => any

let myFunc: func = function(param: number) {
    return false
}