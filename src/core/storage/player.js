function isPrimitiveNotObjMatchesType(value, type="any") {
    return (
        typeof value === "string" |
        typeof value === "number" |
        typeof value === "boolean" |
        typeof value === "symbol" |
        typeof value === "bigint" |
        typeof value === "function" |
        typeof value === "undefined"
        && typeof value !== "object"
        && (type !== "any" ? true : typeof value === type)
    )
}

const DataTemplate = {
    get(k,t="any",r=false){
        if (k) {
            if (r) {
                let nest = this[k]
                if (nest && isPrimitiveNotObjMatchesType(nest)) {
                    return nest
                } else if (nest && !isPrimitiveNotObjMatchesType(nest)) {
                    for (const [k,v] in Object.entries(nest)) {
                        
                    }
                }
            }
            return this[k]??undefined
        } else {
            return this
        }
    },
    set(k,r=false) {
        if (r) {

        }
    }
}





window.player = DataTemplate