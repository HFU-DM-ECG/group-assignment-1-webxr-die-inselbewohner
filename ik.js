import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import { Joint } from "./joint.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

//Setup
let scene, camera, renderer;
let controls;
let controllers;
let armR, armL;
let shoulderR, shoulderL, shoulderContainer;
const shoulderROffset = new THREE.Vector3(1, -.3, 0);
const shoulderLOffset = new THREE.Vector3(-1, -.3, 0);

//Joints
let jointsR = [];
let jointsL = [];
const jointLengths = [.9, .85, 0];

let pointer = { x: 0, y: 0 };
const backgroundLayer = 1;
const raycaster = new THREE.Raycaster();
raycaster.layers.set(backgroundLayer);

function setup() {
    //Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    //VR
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.xr.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);
    let vrButton = VRButton.createButton(renderer)
    document.body.appendChild(vrButton);
    controllers = buildControllers();

    //Lights
	const ambientLight = new THREE.AmbientLight(0x606060, 2);
	scene.add(ambientLight);

	const pointLight = new THREE.PointLight(0x404040, 2, 50);
	pointLight.position.setZ(3);
	scene.add(pointLight);

    //Grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    //Orbit control
    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    //Load arms
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("armL.glb", (glb) => {
        armL = glb.scene;
        armL.scale.set(1, 1, 1);
        armL.position.set(0, 0, 0);
       
        gltfLoader.load("armR.glb", (glb) => {
            armR = glb.scene;
            armR.scale.set(2, 2, 2);
            armR.position.set(0, 0, 0);
            onInitialized();
        });
    });
   
}

function onInitialized() {
    createJoints();
    createShoulders();
    renderer.setAnimationLoop(animate);
    window.addEventListener('pointermove', onPointerMove);
}

function createShoulders() {
    shoulderContainer = new THREE.Mesh();
    
    shoulderR = new THREE.Mesh();
    shoulderL = new THREE.Mesh();

    let shoulderPosR = new THREE.Vector3();
    let shoulderPosL = new THREE.Vector3();

    shoulderPosR.addVectors(shoulderContainer.position, shoulderROffset);
    shoulderPosL.addVectors(shoulderContainer.position, shoulderLOffset);

    shoulderR.position.set(shoulderPosR.x, shoulderPosR.y, shoulderPosR.z);
    shoulderL.position.set(shoulderPosL.x, shoulderPosL.y, shoulderPosL.z);

    shoulderContainer.add(shoulderR);
    shoulderContainer.add(shoulderL);

    scene.add(shoulderContainer);
}

function updateShoulders() {
    shoulderContainer.position.set(camera.position.x, camera.position.y, camera.position.z);

    shoulderContainer.rotation.y = camera.rotation.y;
}


//Create joints and add them to an array and to the scene
function createJoints() {
    for (let i = 0; i < 3; i++) {
        let jointR = new Joint(jointLengths[i], armR.children[0]);
        let jointL = new Joint(jointLengths[i], armL.children[0]);
        jointsL.push(jointL)
        jointsR.push(jointR);
        scene.add(jointR.jointObject);
        scene.add(jointL.jointObject);
    }
}

function onPointerMove(event) {
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

//Called every frame
function animate(time) {
    requestAnimationFrame(animate);

    updateShoulders();

    updateJoints(jointsR, shoulderR, controllers[0]);
    updateJoints(jointsL, shoulderL, controllers[1]);

    controls.update();
    renderer.render(scene, camera);
}

function updateJoints(joints, root, targetController) {
    //Set last joint to target controllers position and rotation
    const targetPosition = targetController.position;
    const targetRotation = targetController.rotation;
    joints[joints.length - 1].setPosition(targetController.position.x, targetPosition.y, targetPosition.z);
    joints[joints.length -1].jointObject.rotation.set(targetRotation.x, targetRotation.y, targetRotation.z);

    //Update position and rotation of joints
    for (let i = joints.length - 2; i >= 0; i--) {
        //Update rotation
        joints[i].lookAt(joints[i + 1].getPosition());

        //Update position
        const pos = joints[i + 1].getPosition();
        joints[i].setEndPosition(pos.x, pos.y, pos.z);
    }

    //Offset joints so the shoulder (root joint) is pinned to a set position
    let rootWorldPos = new THREE.Vector3();
    root.getWorldPosition(rootWorldPos); 

    let offset = new THREE.Vector3();
    offset.subVectors(joints[0].getPosition(), rootWorldPos);

    for (let i = 0; i < joints.length; i++) {
        let newPos = new THREE.Vector3();
        newPos.subVectors(joints[i].getPosition(), offset);
        joints[i].setPosition(newPos.x, newPos.y, newPos.z);
    }
}


// src: https://codingxr.com/articles/getting-started-with-webxr-and-threejs/
function buildControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);

    const line = new THREE.Line(geometry);
    line.scale.z = 10;

    const controllers = [];

    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        controller.add(line.clone());
        controller.userData.selectPressed = false;
        controller.userData.selectPressedPrev = false;
        scene.add(controller);
        controllers.push(controller);

        const grip = renderer.xr.getControllerGrip(i);
        grip.add(controllerModelFactory.createControllerModel(grip));
        scene.add(grip);
    }

    return controllers;
}

setup();



