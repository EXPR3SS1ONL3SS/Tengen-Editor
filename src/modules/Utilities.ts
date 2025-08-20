

// A really simple signal module, with promises.




interface SignalInterface<T> {
    connections: Record<string, {f:Function}>,
    Connect(Event: string, callback: Function): string|void,
    Fire(Event: string, ...args: any[]): void,
    Destroy(): void,
    jsonify(): string,
};
class __SignalBase<T=void> implements SignalInterface<T> {
    public constructor(){}
    private promises: {resolve:(v:T)=>void}[] = [];
    public connections: Record<string, {f:Function}> = {};
    public Connect(Event: string, callback: (...args: any)=>void) {
        //if (Object.hasOwn(this.connections, Event)) return `ERR: ${Event.toLocaleUpperCase()} ALREADY ASSIGNED`
        this.connections[Event] = {
            "f"(...args: any[]){
                return callback(...args)
            }
        };
    };
    public Fire(Event: string, ...args: any[]) {
        this.connections[Event].f(...args)
    };
    public Wait(Event: string): Promise<T> {
        return new Promise((resolve)=>{
            this.promises.push({resolve})
        })
    };
    private Clean() {
        this.promises = []; this.connections = {};
    };
    public Destroy() {
        this.Clean();
        for (const key of Object.keys(this)){
            this[key] = undefined;
        };
    };
    public jsonify(){return JSON.stringify(this)};
};


export {
    __SignalBase as Signal,
}
