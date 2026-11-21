import { quat, vec3 } from "gl-matrix"
import { Transform } from "./components/Transform.ts"
import type { Entity } from "./Entity.ts"

export class FirstPersonController {
    yaw = 0                 // levo / desno
    pitch = 0               // gor/doll
    moveSpeed = 5          // kolk hitro
    mouseSensitivity = 0.002

     
    jumpSpeed = 1.8       //  hitrost skoka 
    gravity = 9         // pospešek navzdol (== gravitacija)
   // private spaceWasPressed = false
    private velocityY = 0
    private verticalOffset=0  //kolk dodatne višine dobimo s skokom

    private keys = new Set<string>()
    private transform: Transform
    private normalHeight = 1.5  //višina oli ko stoji
    private crouchHeight  = 0.9  // ko počepne


    constructor(cameraEntity: Entity, canvas: HTMLCanvasElement) {
        const t = cameraEntity.getComponent(Transform);
        if (!t) throw Error("Camera entity needs a Transform!")
        this.transform = t

        // Click the canvas to capture the mouse (Esc releases it)
        canvas.addEventListener("click", () => canvas.requestPointerLock())

        window.addEventListener("keydown", (e) => this.keys.add(e.code))
        window.addEventListener("keyup", (e) => this.keys.delete(e.code))

        document.addEventListener("mousemove", (e) => {
            if (document.pointerLockElement !== canvas) return;
            this.yaw -= e.movementX * this.mouseSensitivity
            this.pitch -= e.movementY * this.mouseSensitivity
            const limit = Math.PI / 2 - 0.01;   // can't flip upside down
            this.pitch = Math.max(-limit, Math.min(limit, this.pitch))
        });
    }

    update(dt: number) { //dt: delta time cas ki je minil od prejsnje slike
        const sin = Math.sin(this.yaw)
        const cos = Math.cos(this.yaw)
        const forward = vec3.fromValues(-sin, 0, -cos)  // flat, ignores looking up/down
        const right = vec3.fromValues(cos, 0, -sin)

        const dir = vec3.create();
        if (this.keys.has("KeyW")) vec3.add(dir, dir, forward)
        if (this.keys.has("KeyS")) vec3.sub(dir, dir, forward)
        if (this.keys.has("KeyD")) vec3.add(dir, dir, right)
        if (this.keys.has("KeyA")) vec3.sub(dir, dir, right)


        const pos = vec3.clone(this.transform.location);  // pos[0] = levo/desno pos[1] = gor/dol pos[2] = naprej / nazaj

        /*Ko skočiš, ji daš pozitivno vrednost (jumpSpeed), torej greš navzgor pos[1]
        Vsako sličico težnost hitrost zmanjša .
        Hitrost sčasoma pade na 0 (vrh skoka) in postane negativna, zato začneš padati.
        Višino spremeniš glede na hitrost.
        */

        //premikanje
        if (vec3.length(dir) > 0) {
            vec3.normalize(dir, dir)
            vec3.scaleAndAdd(pos, pos, dir, this.moveSpeed * dt);
        }
        
    // ---- PPOČEP  ---  //
        let targetHeight = this.normalHeight
        
        if (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")) {
            targetHeight = this.crouchHeight
        }
        //da se smoothly spremeni pozicija
        pos[1] += (targetHeight - pos[1]) * Math.min(dt * 8, 1);


   // -- SKOK .. //
        if (this.verticalOffset === 0 && this.keys.has("Space")) {
        this.velocityY = this.jumpSpeed
        }
        //GRAVITACIJA
        this.velocityY -= this.gravity * dt
        this.verticalOffset += this.velocityY * dt

        //pristanke
        if (this.verticalOffset <= 0){
            this.verticalOffset =0
            this.velocityY =0
        }
        //dodamo to višino skoka
        pos[1] += this.verticalOffset

        

        // Rotation = yaw around Y, then pitch around X
        const qYaw = quat.setAxisAngle(quat.create(), [0, 1, 0], this.yaw)
        const qPitch = quat.setAxisAngle(quat.create(), [1, 0, 0], this.pitch)
        const rot = quat.multiply(quat.create(), qYaw, qPitch)

        // IMPORTANT: assign through the setter. Changing the old vec3 in place
        // would NOT mark the transform as dirty, so nothing would move.
        this.transform.location = pos;
        this.transform.rotation = rot;
    }
}