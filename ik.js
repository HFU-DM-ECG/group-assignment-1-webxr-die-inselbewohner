import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Joint } from "./joint.js" 

//Setup
let scene, camera, renderer;
let controls;

let plane;

//Time
let prevTime = 0;

//Joint settings
const joints = [];
const jointAmount = 5;
const jointLength = 1;

//Raycaster for target position
let targetPosition = new THREE.Vector3(0, 0, 0);
let pointer = {x: 0, y: 0};
const backgroundLayer = 1;
const raycaster = new THREE.Raycaster();
raycaster.layers.set(backgroundLayer);

function setup() {
    //Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //Light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    //Grid helper
    const gridHelper = new THREE.GridHelper( 10, 10 );
    scene.add( gridHelper );

    //Orbit control
    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    //Events
    window.addEventListener('pointermove', onPointerMove);
}

function createBackgroundPlane() {
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshStandardMaterial();
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    //plane.visible = false;
    plane.layers.enable(backgroundLayer);

    scene.add(plane);
}

function onPointerMove(event) {
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

//Create joints and add them to an array and to the scene
function createJoints() {
    //Create joints except last one
    for (let i = 0; i < jointAmount - 1; i++) {
        //TODO replace with actual geometry
        const jointGeometry = new THREE.SphereGeometry(.3);
        const jointMaterial = new THREE.MeshStandardMaterial( {color: 0xFF00FF });
        const jointMesh = new THREE.Mesh(jointGeometry, jointMaterial);
        
        const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1);
        const armMaterial = new THREE.MeshStandardMaterial( {color: 0xFFF});
        const connectionObject = new THREE.Mesh(armGeometry, armMaterial);

        let joint = new Joint(jointLength, jointMesh, connectionObject);
        joints.push(joint);
        scene.add(joint.jointObject);
    }

    //TODO replace with actual geometry
    const jointGeometry = new THREE.SphereGeometry(.3);
    const jointMaterial = new THREE.MeshStandardMaterial( {color: 0xFF00FF });
    const jointMesh = new THREE.Mesh(jointGeometry, jointMaterial);

    const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0);
    const armMaterial = new THREE.MeshStandardMaterial( {color: 0xFFF});
    const connectionObject = new THREE.Mesh(armGeometry, armMaterial);

    let lastJoint = new Joint(0, jointMesh, connectionObject);

    joints.push(lastJoint);
    scene.add(lastJoint.jointObject);
}


function animate(time) {
    requestAnimationFrame(animate);
    time *= 0.001;
	let deltaTime = time - prevTime;

    update(time, deltaTime);

    //Standard update
    controls.update();
	renderer.render(scene, camera);
	prevTime = time;

}

function update(time, deltaTime) {
    updateTargetPosition();
    updateJoints()
  
}

function updateJoints() {
   
    //Set last joint to target position
    joints[joints.length - 1].setPosition(targetPosition.x, targetPosition.y, targetPosition.z);

    //Update joints
    for(let i = joints.length - 2; i >= 0; i--) {
        //Update rotation
        joints[i].lookAt(joints[i + 1].getPosition());

        //Update position
        const pos = joints[i + 1].getPosition();
        joints[i].setEndPosition(pos.x, pos.y, pos.z);
    }
}

function updateTargetPosition() {
    //Get target position
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        targetPosition = intersects[0].point;
    }
}

setup();
createJoints();
createBackgroundPlane();
animate(0);



