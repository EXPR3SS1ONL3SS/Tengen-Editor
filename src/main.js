var date = Date.now(), diff = 0; player = {};

var el = {
    setup: [],
    update: {}
}

el.update.main = () => {
    tmp.el.luck.innerHTML = player.luck.format()
}

function calc(dt) {
    player.luck = player.luck.add(1)
}

function loop() {
    diff = Date.now() - player.last_played;
    // updateHTML()
    calc(diff/1000)
    updateHTML(); updateTemp();
    player.last_played = Date.now()
}

function setupHTML() {
    let all = document.getElementsByName("*")
    if (!tmp.update[0]) {
        resetTemp()
    }
    for (const a=0;a<all.length;a++) {
        tmp.el[all[a].id] = all[a]
    }

    for (const i=0;i<el.setup.length;i++)
    {
        el.setup[i]()
    }
}

function updateHTML() {
   for (const [_, value] in el.update) {
    value()
   }
}