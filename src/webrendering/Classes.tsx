import * as t from 'three'
import * as fiber from '@react-three/fiber'
import * as zod from 'zod'

interface ITween {

};class Tween implements ITween {
    
};type TweenOptions={
    Time: number,
    EasingMode: string,
    EasingDir: string,
    properties: Record<string, any>,
    repeats: number,
    reversing?: boolean
}

class Vect2 {
    public X; public Y;
    constructor(...args: any[]) {
        if (args.length === 1) { //prob an array
            this.X = args[0][0]
        }
    }
}; class Vect3 {

}



