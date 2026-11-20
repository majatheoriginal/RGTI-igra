import { vec3, vec4 } from "gl-matrix";
import { Mesh } from "./components/Mesh.ts";
import { Transform, TransformType } from "./components/Transform.ts";
import { BasicMaterial } from "./data/Material.ts";
import { Primitive } from "./data/Primitive.ts";
import { Entity } from "./Entity.ts";

/**
 * Creates a flat square plane lying on the XZ axes (facing up).
 * @param size side length of the plane
 * @param texture image to cover the plane with
 * @param tiles how many times the texture repeats across the plane
 * @param height y position of the plane
 */
export function createPlane(size: number, texture: ImageBitmap, tiles: number, height: number) {
    const h = size / 2;

    // 11 numbers per vertex: position (3), normal (3), uv (2), tangent (3)
    const vertices = new Float32Array([
        -h, 0, -h,    0, 1, 0,    0,     0,        1, 0, 0,
         h, 0, -h,    0, 1, 0,    tiles, 0,        1, 0, 0,
        -h, 0,  h,    0, 1, 0,    0,     tiles,    1, 0, 0,
         h, 0,  h,    0, 1, 0,    tiles, tiles,    1, 0, 0,
    ]);
    const indices = new Uint32Array([
        0, 2, 1,
        1, 2, 3,
    ]);

    const material = new BasicMaterial(texture, vec4.fromValues(1, 1, 1, 1));
    const mesh = new Mesh();
    mesh.addPrimitive(new Primitive(vertices, indices, material));

    const transform = new Transform(TransformType.Free);
    transform.location = vec3.fromValues(0, height, 0);

    const plane = new Entity();
    plane.name = "Ground";
    plane.addComponent(mesh);
    plane.addComponent(transform);
    return plane;
}