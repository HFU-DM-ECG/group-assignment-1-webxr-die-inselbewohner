import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

class Joint {
    jointObject; 
    armObject;

    jointEndObject;

    jointSize = .3;
    armSize = 0.2;

    length;

    constructor(length) {
        this.length = length;

        const jointGeometry = new THREE.SphereGeometry(this.jointSize);
        const jointMaterial = new THREE.MeshStandardMaterial( {color: 0xFF00FF });
        this.jointObject = new THREE.Mesh(jointGeometry, jointMaterial);

        const armGeometry = new THREE.CylinderGeometry(this.armSize, this.armSize, length);
        const armMaterial = new THREE.MeshStandardMaterial( {color: 0xFFF});
        this.armObject = new THREE.Mesh(armGeometry, armMaterial);

        //Local
        this.armObject.rotation.x = -Math.PI * 0.5;
        this.armObject.position.setZ(length * 0.5);
       

        const jointEndGeometry = new THREE.BoxGeometry(.1,.1,.1);
        const jointEndMaterial = new THREE.MeshStandardMaterial( {color: 0xFF0000 });
        this.jointEndObject = new THREE.Mesh(jointEndGeometry, jointEndMaterial);
        //this.jointEndObject.visible = false;
        this.jointEndObject.position.setZ(length);


        this.jointObject.add(this.armObject);
        this.jointObject.add(this.jointEndObject);
    }

    setPosition(x, y, z) {
        this.jointObject.position.set(x, y, z);
    }

    setEndPosition(x, y, z) {
        const targetEnd = new THREE.Vector3(x, y, z);
        let rootOffsetFromTarget = new THREE.Vector3();
        rootOffsetFromTarget.subVectors(this.getPosition(), this.getEndPosition());
        let target = new THREE.Vector3();
        target.addVectors(targetEnd, rootOffsetFromTarget);

        this.setPosition(target.x, target.y, target.z);
    }

    getPosition() {
        return this.jointObject.position;
    }

    getEndPosition() {
        let handleVec = new THREE.Vector3();
        this.jointEndObject.getWorldPosition(handleVec);
        handleVec.setZ(0);
        return handleVec;
    }

    lookAt(position) {
        this.jointObject.lookAt(position);
    }
}

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

function createJoints() {
    for (let i = 0; i < jointAmount - 1; i++) {
        let joint = new Joint(jointLength)
        joints.push(joint);
        scene.add(joint.jointObject);
    }

    let lastJoint = new Joint(0);
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



