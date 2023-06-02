import * as THREE from 'three';
   
export class Joint {
    //Object representing the joint
    jointObject; 
    //Helper object
    jointEndObject;
    //Length of the joint
    length;

    constructor(length, jointObject) {
        this.length = length;
        this.jointObject = jointObject;

        //Helper object to get the world position at the end of the joint
        this.jointEndObject = new THREE.Mesh();
        this.jointEndObject.visible = false;
        this.jointEndObject.position.setZ(length);

        //Set joint as parent of connection and helper object
        this.jointObject.add(this.jointEndObject);
    }

    setPosition(x, y, z) {
        this.jointObject.position.set(x, y, z);
    }

    //Sets position of the joint so that its Endobject is at the specified position
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

    //Returns the world position of the Joints Endobject
    getEndPosition() {
        let endPosition = new THREE.Vector3();
        this.jointEndObject.getWorldPosition(endPosition);
        return endPosition;
    }

    lookAt(position) {
        this.jointObject.lookAt(position);
    }
}