import * as Vue from "vue";

var app = Vue.createApp({
    data: {

    },
    methods: {
        loadGame(start=true) {
            
        }
    }
})


var date = Date.now(), diff = 0; player = {};

var el = {
    setup: [],
    update: {}
}

el.update.main = () => {
    tmp.el.luck.innerHTML = (
        <stat-display id="player_luck">
            Luck = x<span class={'resource_display'}>${player.luck.format()}</span>
        </stat-display>
    )
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