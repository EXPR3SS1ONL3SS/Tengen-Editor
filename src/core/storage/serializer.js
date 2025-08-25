import {C} from "../constants.js"
export const serializer = {
    normalize(data) {
        if (typeof data !== "object") data = this.toObject(data);
        for (const [k, v] of Object.entries(data)) {
            if (typeof v !== "object")
            {
                data[k] = serializer.normalize(data[k])
            } else
            {
                if (v !== NaN && v !== undefined && v !== Infinity && v !== C.dINF)
                {
                    continue;
                }
                data[k] = new Decimal(0)
            }
        }
        return data
    },
    deserialize(save) {
        a(typeof save !== "string", "save must be a string")
        save = this.normalize(save)
    },
    serialize(data) {
        a(typeof data !== "object", "data must be an object")
        data = this.normalize(data)
        data = btoa(JSON.stringify(data))
        if (data.search("Infinity") || data.search("NaN") || data.search("undefined")) {
            return "{}"
        }
        return data
    },
    toObject(save) {
        return JSON.parse(atob(save))
    }
}