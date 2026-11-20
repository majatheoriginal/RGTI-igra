import { vec3, vec4 } from "gl-matrix";
import { RenderState } from "./RenderState.ts";
import { updateBuffers } from "./systems/BufferUpdateSystem.ts";
import { prepareRendering } from "./systems/PrepareRenderSystem.ts";
import { render } from "./systems/RenderSystem.ts";
import { computeTransforms } from "./systems/TransformSystem.ts";
import { createBuffers } from "./systems/BufferInitSystem.ts";
import { GLTFParser } from "./parsers/GLTFParser.ts";
import { Camera } from "./components/Camera.ts";
import { Transform, TransformType } from "./components/Transform.ts";
import { Entity } from "./Entity.ts";
import { FirstPersonController } from "./FirstPersonController.ts";
import { createPlane } from "./createPlane.ts";
import { Game } from "./Game.ts";
import { createTempTexture } from "./Utils.ts";


// ------ Load the prison cell ------ //

const gltfParser = new GLTFParser();
const gltfContent = await fetch("data/Prison_cell2.gltf").then((r) => r.text());
gltfParser.setJson(gltfContent, 'data/');
const scene = await gltfParser.parseScene(0);
if (!scene) {
    throw Error("Could not get GLTF scene!");
}

// The model is huge and far from the origin, so move it to the origin and shrink it.
// Change ROOM_SCALE to make the room bigger or smaller.
const ROOM_SCALE = 0.06;
const room = scene.getEntityByName("Box001");
if (!room) {
    throw Error("Could not find the room entity (Box001)!");
}
const roomTransform = room.getComponent(Transform)!;
roomTransform.location = vec3.fromValues(0, 0, 0);
roomTransform.scale = vec3.fromValues(ROOM_SCALE, ROOM_SCALE, ROOM_SCALE);


// ------ Ground plane to walk on ------ //

// A 1-pixel gray texture. Change the numbers (red, green, blue, alpha; 0 to 1) for a different gray.
const groundImage = await createTempTexture(vec4.fromValues(0.5, 0.5, 0.5, 1));
// 60x60 plane, slightly above the room's own floor
scene.addEntity(createPlane(60, groundImage, 1, 0.02));

// ŽLICA

// naloži model žlice v ločen parser
const spoonParser = new GLTFParser();
spoonParser.setJson(await fetch("data/spoon.gltf").then((r) => r.text()), "data/");
const spoonScene = await spoonParser.parseScene(0);
if (!spoonScene) throw Error("Could not load the spoon!");
for (const e of spoonScene.entities) {
    scene.addEntity(e);
}
const spoon = spoonScene.entities.find((e) => e.parent === null)!;
const spoonTransform = spoon.getComponent(Transform)!;
spoonTransform.location = vec3.fromValues(1.85, 0.25, 0.55);
spoonTransform.scale = vec3.fromValues(0.1, 0.1, 0.1);   // velikost 

//SPOON interaction
let spoonPickup = false;
let interactPressed = false;

window.addEventListener("keydown", (e) => {
    if (e.code === "KeyE" && !e.repeat){
        interactPressed = true
    }
})


// ------ Player camera (first person: the camera IS the player) ------ //

const playerCamera = new Entity();
playerCamera.name = "PlayerCamera";
const camTransform = new Transform(TransformType.Free);
camTransform.location = vec3.fromValues(0.13, 1.6, 0.6);   // x, y (up = eye height), z
playerCamera.addComponent(camTransform);
playerCamera.addComponent(new Camera(16 / 9, 1.0, 0.05, 200)); // aspect, fov, near, far
scene.addEntity(playerCamera);


// ------ Initalize GPU/Rendering specific interfaces ------ //

if (!navigator.gpu) {
    throw Error("WebGPU not supported in this browser!");
}
const gpuAdapter = await navigator.gpu.requestAdapter();
if (!gpuAdapter) {
    throw Error("Could not get WebGPU adapter!");
}
const gpuDevice = await gpuAdapter.requestDevice();
gpuDevice.addEventListener('uncapturederror', (e) => console.error(e.error.message));
gpuDevice.lost.then((v) => {
    console.error(`GPU device lost: ${v.message} (${v.reason})`);
});

const canvas = document.querySelector('canvas');
if (!canvas) {
    throw Error("Could not find a canvas!");
}
const renderState = new RenderState(gpuDevice, canvas);

// Controller: WASD + mouse (click the canvas first, Esc to release)
const controller = new FirstPersonController(playerCamera, canvas);
controller.moveSpeed = 1.5;   // the room is small, so walk slower

// Spoon, dig spot and key (see Game.ts). Must be created BEFORE createBuffers.
const game = new Game()


// ------ Create and write all buffers ------ //

createBuffers(renderState, scene);


// ------ Prepare pipelines ------ //

await prepareRendering(renderState, scene);


// ------ Events ------ //

function resize() {
    if (!canvas) {
        return;
    }
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    if (width === 0 || height === 0) {
        width = 1;
        height = 1;
    }

    let aspect = width / height;

    // Update the camera
    const cameraEntities = scene?.getEntitiesByComponent(Camera) ?? [];
    for (const cameraEntity of cameraEntities) {
        const camera = cameraEntity.getComponent(Camera)!;
        camera.aspect = aspect;
    }
    // Update the rendering textures
    renderState.updateRenderTextureSizes(width, height);
}

window.addEventListener('resize', (_) => resize());
resize();


// ------ Start game loop ------ //

let lastTime = performance.now();
function update(timestamp: number) {
    if (!scene) {
        return;
    }

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    controller.update(dt);
    game.update(dt);

    if (interactPressed && !spoonPickup){  //preveri če smo pritisnili E  && preveri da žliča še ni pobrana 
        const playerPosition = playerCamera.getComponent(Transform)!.location;  //pridobi lokacijo kamere
        const spoonPosition = spoon.getComponent(Transform)!.location;  //in žlice
        const distance = vec3.distance(playerPosition, spoonPosition);  //izračuna razdaljo
        console.log("Distance to spoon:", distance);

        if (distance < 2.0) {  //če smo dost blizu
            spoonPickup = true;
            console.log("Spoon picked up!");
        }
    }




    computeTransforms(scene);
    updateBuffers(renderState, scene);

    render(renderState, scene);

    requestAnimationFrame(update);
}

requestAnimationFrame(update);