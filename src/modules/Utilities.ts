

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

class xN {
    public m; public e;
    private constructor(m:number,e:number) {
        this.m = m;
        this.e = e;
        return this
    };
    public static correct(bnum: xN, mode:number=0): xN {
        let man: number = 0;
        let exp: number = 0;


        if (mode === 0) { // simple correction, less accurate
            while (man >= 10)
            {
                let l10man = Math.log10(man)
                man = l10man; exp += Math.floor(l10man);
            }
        }


        return new this(man, exp)
    };
    public static new(input: String|Number|object|xN): xN {
        switch (typeof input)
        {
            case "string":
                if (!input.includes("e")) return new this(0,0);
                let splits: Array<string> = input.split("e")
                let man: number = 0; let exp1: number = 0; let exp2: number = 0;
                switch (splits.length)
                {
                    case 2:
                        man = Number(splits[1])
                        exp1 = Number(splits[2])
                        if (exp1 > 1e308) return new this(0,0);
                        return xN.correct(new this(man, exp1))
                    case 3:
                        man = Number(splits[1])
                        exp1 = Number(splits[2])
                        exp2 = Number(splits[3])
                        if (exp2 > 308) return new this(0, 0);
                        return xN.correct(new this(man, Number(exp1+"e"+exp2)))
                    default:
                        return new this(0,0)
                }
            case "number": //easiest
                let expf: number = Math.floor(Math.log10(input))
                let nman: number = input / (10 ** expf)
                return xN.correct(new this(nman, expf))
            case "object":
                if (input instanceof Array) {
                    return xN.correct(new this(Number(input[0]), Number(input[1])))
                } else if (input instanceof xN) {
                    return xN.correct(new this(input.m, input.e))
                } else {
                    return new this(0,0)
                }
            default:
                return new this(0, 0);
        }
        if (true)
        {

        } else if (typeof input === "string")
        {

        } else if (input instanceof Array)
        {

        } else if (input instanceof xN)
        {

        }
    }
}
let myBnum = xN.correct(xN.new(12837))
console.log(myBnum)

export {
    __SignalBase as Signal,
    xN as Bnum,
}
