import * as mega from './modules/mega'
import * as fs from 'fs'
import { EventEmitter } from 'events'
import { devNull } from 'os'
let emitter = new EventEmitter()



const udata_base = {
    username: '',
    password: '',
    theme_data: {
        uintcf: {
            background: '#305d8dff',
            files: 'Default'
        },
        font: {
            face: 'JetBrains Mono',
            size: 13.3,
        }
    },
    editor: {
        data: {
            /** 
             * tabs: ["workspace/.."] -- workspace: workspace name, folder or file path, must end at some point with a valid extension
            */
            tabs: [],
            curtab: 0,
            workspaces: {

            }
        }
    }
    
}

const storage = await new mega.Storage({
    "email": "computersciencegeek4l@gmail.com",
    "password": "rezjun-hadji0-rigmAp"
}).ready
emitter.on('login', (user:string,pass:string)=> {
    const file = storage.files[user+'_data.json'] ? storage.files[user+'_data.json'] : null
    if (file) {
        const downloaded = file.download({
            "handleRetries": (tries, error, cb) => {
                if (tries > 5) {
                    cb(error)
                } else {
                    setTimeout(cb, 125 * Math.pow(2, tries))
                }
            }
        })
        downloaded.on('data', (data: Buffer) => {
            let parse: Record<any, any> = JSON.parse(data.toString())
            let matching: boolean = (parse.password ? (parse.password === pass ? true : false) : false)
            if (matching) userData = parse
        })
    }
})


while (!username && !password) {
    if (username && password) {
        emitter.emit('login', username, password)
        break
    }
}