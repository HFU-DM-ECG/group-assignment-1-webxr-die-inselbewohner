import * as THREE from 'three';

//Joint contains 3 objects. 
//Joint: Is the pivot and parent
//Connection: Is just for the visuals
//JointEnd: Helper to get the position at   
export class Joint {
    jointObject; 
    connectionObject;
    jointEndObject;

    length;

    constructor(length, jointObject, connectionObject) {
        this.length = length;
        this.jointObject = jointObject;
        this.connectionObject = connectionObject;

        //Align so joint is at the beginning of the connection
        this.connectionObject.rotation.x = -Math.PI * 0.5;
        this.connectionObject.position.setZ(length * 0.5);
       
        //Helper object to get the world position at the end of the joint
        const jointEndGeometry = new THREE.BoxGeometry(.1,.1,.1);
        const jointEndMaterial = new THREE.MeshStandardMaterial( {color: 0x000000 });
        this.jointEndObject = new THREE.Mesh(jointEndGeometry, jointEndMaterial);
        this.jointEndObject.visible = false;
        this.jointEndObject.position.setZ(length);

        //Set joint as parent of connection and helper object
        this.jointObject.add(this.connectionObject);
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