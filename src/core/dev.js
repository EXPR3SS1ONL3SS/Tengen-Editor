import C from './constants'

window.a = function(condition, message) {
    if (!condition) {
        new Exception(message, 2)
    }
}

class Exception {
    constructor(message, level, ...args) {
        let f = (level >= 2 ? console.error : level === 1 ? console.warn: console.log)
        f(message, ...args)
    }
}
window.Exception = Exception

class UnmadeException extends Exception {
    constructor(level, ...args) {
        super("this doesnt exist yet!", level||1, ...args)
    }
}

window.UnmadeException = UnmadeException
window.dev_speed = 1