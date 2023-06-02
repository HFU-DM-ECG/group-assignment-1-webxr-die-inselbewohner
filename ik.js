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
const showControllers = false;

//Arm objects
let armR, armL;
let armScale = 0.2;
//Joints
let jointsR = [];
let jointsL = [];
const jointLengths = [.9, .85, 0];

//Roots = shoulder positions
let rootROffset = new THREE.Vector3(.12, -.15, .05);
let rootLOffset = new THREE.Vector3(-.12, -.15, .05);
let rootR = new THREE.Vector3(0, 0, 0);
let rootL = new THREE.Vector3(0, 0, 0);

setup();

function setup() {
    //Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1;

    //VR
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.xr.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", onWindowResize)
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));
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

    //First person control
    controls = new OrbitControls(camera, renderer.domElement);

    //Load arms
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("armL.glb", (glb) => {
        armL = glb.scene;
        armL.scale.set(1, 1, 1);
        armL.position.set(0, 0, 0);

        gltfLoader.load("armR.glb", (glb) => {
            armR = glb.scene;
            armR.scale.set(1, 1, 1);
            armR.position.set(0, 0, 0);
            onInitialized();
        });
    });

}

function onInitialized() {
    createJoints(armR, jointsR);
    createJoints(armL, jointsL);
    
    //Slider for controlling the arm size
    let armScaleSlider = document.getElementById("arm_scale");
    resizeArm(armScaleSlider.value);
    armScaleSlider.addEventListener("change", (event) => resizeArm(event.target.value));

    let offsetShoulderSlider = document.getElementById("shoulder_offset");
    offsetShoulders(offsetShoulderSlider.value);
    offsetShoulderSlider.addEventListener("change", (event) => offsetShoulders(event.target.value));
    
    renderer.setAnimationLoop(animate);
}

//Offsets shoulders on the x axis
function offsetShoulders(offset) {
    offset = parseFloat(offset);
    rootLOffset.x = -offset;
    rootROffset.x = offset;
}

function resizeArm(scale) {
    scale = parseFloat(scale);
    for (let i = 0; i < 3; i++) {
        jointsR[i].jointObject.scale.set(scale, scale, scale);
        jointsL[i].jointObject.scale.set(scale, scale, scale);
    }
}

//Reacts to resize event, doesn't work in VR
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    renderer.setSize(width, height);

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
}

//Called every frame
function animate() {
    updateRootPositions();
    updateJoints(jointsR, rootR, controllers[0]);
    updateJoints(jointsL, rootL, controllers[1]);

    //Only use orbit controls when xr is not active
    controls.enabled = !renderer.xr.isPresenting;
    renderer.render(scene, camera);
}

//Update root position so arms are always offset relative to the camera
function updateRootPositions() {
    let cameraPos;
    if (renderer.xr.isPresenting) {
        cameraPos = renderer.xr.getCamera().cameras[0].position;
    } else {
        cameraPos = camera.position;
    }
    rootR.addVectors(cameraPos, rootROffset);
    rootL.addVectors(cameraPos, rootLOffset);
}


//Create joints from arm object and add them to an array and to the scene
function createJoints(armObject, jointsArray) {
    //armObject.children contains the joints in the right order (Shoulder, Elbow, Wrist)
    //children[0] can be used because the child gets removed from its former parent when it is appended to another object
    for (let i = 0; i < 3; i++) {
        //scale arm to simulate real arm length
        armObject.children[0].scale.set(armScale, armScale, armScale);
        let joint = new Joint(jointLengths[i], armObject.children[0]);
        jointsArray.push(joint);
        scene.add(joint.jointObject);
    }
}

//Apply simplified inverse kinematics to set position and rotation of the joints
function updateJoints(joints, root, targetController) {
    //Set last joint (wrist) to target controllers position and rotation
    const targetPosition = targetController.position;
    const targetRotation = targetController.rotation;
    joints[joints.length - 1].setPosition(targetController.position.x, targetPosition.y, targetPosition.z);
    joints[joints.length - 1].jointObject.rotation.set(targetRotation.x, targetRotation.y, targetRotation.z);

    //Update position and rotation of joints
    //Rotate each joint towards the next joint then set the position so they connect
    for (let i = joints.length - 2; i >= 0; i--) {
        //Update rotation
        joints[i].lookAt(joints[i + 1].getPosition());

        //Update position
        const pos = joints[i + 1].getPosition();
        joints[i].setEndPosition(pos.x, pos.y, pos.z);
    }

    //Get the offset from where the shoulder joint should be to where it is
    let offset = new THREE.Vector3();
    offset.subVectors(joints[0].getPosition(), root);

    //Offset all joints by the calculated offset so the shoulder is always at the set root position
    for (let i = 0; i < joints.length; i++) {
        let newPos = new THREE.Vector3();
        newPos.subVectors(joints[i].getPosition(), offset);
        joints[i].setPosition(newPos.x, newPos.y, newPos.z);
    }
}


//build two controllers and add them to the scene
function buildControllers() {
    const controllerModelFactory = new XRControllerModelFactory();
    const controllers = [];

    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        controller.userData.selectPressed = false;
        controller.userData.selectPressedPrev = false;
        scene.add(controller);
        controllers.push(controller);

        const grip = renderer.xr.getControllerGrip(i);
        grip.add(controllerModelFactory.createControllerModel(grip));
        if (showControllers)
            scene.add(grip);
    }
    return controllers;
}