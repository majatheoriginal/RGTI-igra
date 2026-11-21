import { quat, vec3, vec4 } from "gl-matrix";
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

// --- ŽLICA --- //
    if (interactPressed && !spoonPickup){  //preveri če smo pritisnili E  && preveri da žliča še ni pobrana 
        const playerPosition = playerCamera.getComponent(Transform)!.location;  //pridobi lokacijo kamere
        const spoonPosition = spoon.getComponent(Transform)!.location;  //in žlice
        const distance = vec3.distance(playerPosition, spoonPosition);  //izračuna razdaljo
        const forward = vec3.fromValues(-Math.sin(controller.yaw), 0, -Math.cos(controller.yaw))  //izračuna v kero sme rigralec gleda... glede na yaw ki je obračanje levo in desno
        //izračunamo smer od igralca proti žlici...
        const directionToSpoon = vec3.create();
        vec3.subtract(directionToSpoon, spoonPosition, playerPosition);
        directionToSpoon[1] = 0  //ignorriamo višinsko razlko
        vec3.normalize(directionToSpoon, directionToSpoon);  //v nroamliziran vektor

        const lookingAtSpoon = vec3.dot(forward, directionToSpoon); //dot product.. a gledata v enako smer
        console.log("Distance:", distance);
        console.log("Looking:", lookingAtSpoon);

       if (distance < 0.8 && lookingAtSpoon > 0.8) { //če so dovolj blitu in če gledamo ovolj proti žlici
            spoonPickup = true; //je dvignjena.
            console.log("Spoon picked up!");
            }
        }
        //zdaj moramo žlico pred igralca postavit...
        if (spoonPickup){
            const playerPosition = playerCamera.getComponent(Transform)!.location  //pogledamo trenutni položj playerja
            const playerRotation = playerCamera.getComponent(Transform)!.rotation
            const spoonTransform = spoon.getComponent(Transform)!;
            spoonTransform.rotation = quat.clone(playerRotation);  //nardimo kopjo rotacije 


            //spet pogledamo kam gleda.     //ko je yaw 0 je -math.sin(9) =0... in je forward =[0 ,0 -1].. to pomen da igralec gleda po negativni z osi... torej naprej
            const forward = vec3.fromValues(-Math.sin(controller.yaw), 0, -Math.cos(controller.yaw))   //ko se obrne za 90 stopjinj je potem forwatd = [1 , 0, 0] kar pomeni da gleda proti pozitvni x osi....
            //to računamo zato, da položaj žlice spreminjamo oz izračunamo po trenutni SMERI IGRALCA.. in ko se obrne se tudi vektor sprmenei...
            
            //hočemo da je žlica bolj an desni strani igralca.. da deluje ko da je v roki
            const right = vec3.fromValues(Math.cos(controller.yaw), 0, -Math.sin(controller.yaw)) //izračuna DESNO od tega kamor je player.. torej npr kot smo prej rekli ko je yaw= 0 bi blo zdej kle [1 0 0] in gleda proti pozitivn  x osi(desno).. igralec pa proti negativni z osi(naprej)

            const spoonPosition = vec3.clone(playerPosition) //kopirammo pozicijo igralca
            const forwardOffset = vec3.fromValues( forward[0] * 0.3 , forward[1] * 0.3, forward[2] * 0.3)  //nov vektor v smeri forward sam za pol rajši... //npr [ 0 0 -0.5]
            spoonPosition[0] += forwardOffset[0]
            spoonPosition[1] += forwardOffset[1]       //pozicijo žlice (najrpej pozicija playerja)            //to je pol spoonposition je za 0 desno od playera, za 0 levo in za 0.5 bolj blizu
            spoonPosition[2] += forwardOffset[2]       // smo premaknili za 

            const rightOffset = vec3.fromValues(right[0] * 0.25, right[1] * 0.25, right[2] * 0.25)  //enako kot prej samo da za ta vketor ki gleda v desno
            spoonPosition[0] += rightOffset[0]
            spoonPosition[1] += rightOffset[1]          //žlico smo zdaj premaknili mal obolj v desno... odali npr [0.25 , 0 , 0]
            spoonPosition[2] += rightOffset[2]

            spoonPosition[1] -= 0.4  //damo jo še malo bolj dol
            spoon.getComponent(Transform)!.location = spoonPosition
                //dostopamo do komponente- Transform ki ma podatje o location, rotation , scale... vzamemo lcoation(! je zato da trdimo da obstaja- če ne da napako)
                //spoonPosition je pa nova pozicija ki je bla zračunana in tko NASTAVIMO POZICIJO ŽLICE NA TO NOVO IZRAČUNANO POZICIJO          
            }
            interactPressed = false  //to se da v true ko pritisnimo E, zato po koncu protiska to damo stran.






    computeTransforms(scene);
    updateBuffers(renderState, scene);

    render(renderState, scene);

    requestAnimationFrame(update);
}

requestAnimationFrame(update);