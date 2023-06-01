import * as THREE from 'three';
   
export class Joint {
    jointObject; 
    jointEndObject;

    length;

    constructor(length, jointObject) {
        this.length = length;
        this.jointObject = jointObject;


        //Helper object to get the world position at the end of the joint
        const jointEndGeometry = new THREE.BoxGeometry(.1,.1,.1);
        const jointEndMaterial = new THREE.MeshStandardMaterial( {color: 0x000000 });
        this.jointEndObject = new THREE.Mesh(jointEndGeometry, jointEndMaterial);
        this.jointEndObject.visible = false;
        this.jointEndObject.position.setZ(length);

        //Set joint as parent of connection and helper object
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
        return handleVec;
    }

    lookAt(position) {
        this.jointObject.lookAt(position);
    }
}