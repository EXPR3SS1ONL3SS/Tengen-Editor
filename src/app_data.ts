import * as mega from './modules/mega.ts'
import { EventEmitter } from 'events'
import {log} from 'console'
let emitter = new EventEmitter()
let file_max_time = 1000 * 60 * 60 * 24 * 31 * 6



const storage = await new mega.Storage({
    "email": "computersciencegeek4l@gmail.com",
    "password": "rezjun-hadji0-rigmAp"
}).ready

function save(data: Record<any,any>) {
    storage.upload({
        name: username+'_data.json' as string,
    }, Buffer.from(JSON.stringify(userData)), (err, file)=>{
        if (err) {
            console.log(err)
        } else {
                log('uploaded data to MEGA')
            }
    })
}

for (const value of Object.values(storage.files)) {
    if (!value.label.includes('_data.json')) continue
    // have to read first, sadly..
    const down = value.download({
        handleRetries: (t,e,c) => {
            if (t > 3) {
                c(e)
            } else {
                setTimeout(c, 125 * Math.pow(2, t))
            }
        }
    });down.on('data', (data: Buffer) => {
        let parse: Record<any, any> = JSON.parse(data.toString())
        if (!parse.last_used) return // im actually not sure why this would be.. just incase though!
        if (parse.last_used < (Date.now() - file_max_time)) {
            let attempts: number = 0
            value.delete(true, (error, data) => {
                if (error) {
                    return
                } else {
                    log('successfully deleted old udata file: ' + value.label)
                }
            })
        }
    })
}
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
    } else {
        userData = udata_base
        userData.username = user; userData.password = pass;
        // make file prematurely (theyre using for the first time, probably, or havent used in a long time)
        const file = storage.upload({
            "name": username+'_data.json',
        }, Buffer.from(JSON.stringify(userData)), (error, file) => {
            if (error) {
                log('Couldn\'t create udata file (username: ' + username + 'error: ' + error + ')')
            } else {
                log(`user ${username} udata file created: ${file}`)
            }
        })
    }
})


while (!username && !password && !userData) {
    if (username && username) {
        emitter.emit('login', username, password)
        while(!userData) continue;
        setInterval(()=>{save(userData)}, (1e3*6e2)*2e0)
        break
    }
}

