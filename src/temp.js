var tmp = {
    update: [],
    lastSave: "",
    el: {},
}

function resetTemp() {
    var keep = [tmp.update, tmp.lastSave, tmp.el]
    tmp = {
        luckGain: D(1)
    }
    tmp.update = keep[0]; tmp.lastSave = keep[1]; tmp.el = keep[2];

}

function updateTemp() {

    for (const i=0;i<tmp.update.length;i++) {
        tmp.update[i]();
    }

}