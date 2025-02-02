import * as THREE from 'https://unpkg.com/three@0.125.1/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.125.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.125.1/examples/jsm/controls/OrbitControls.js';

class CardScene {
	constructor(card) {
		this.card = card;
		this.canvas = card.querySelector('canvas');
		this.modelPath = card.getAttribute('data-model');
		this.modelName = card.getAttribute('data-name');
		this.modelDescription = card.getAttribute('data-description');
		this.modelStats = card.getAttribute('data-stats');

		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
		this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 100);
		this.camera.position.set(0, 1, 3);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.setupControls();

		this.setupLights();
		this.clock = new THREE.Clock();
		this.mixer = null;
		this.model = null;
		this.animations = {}; // store animation actions by name

		this.isLockedIn = false; // state flag

		this.loader = new GLTFLoader();
		this.loadModel();

		this.animate();
		window.addEventListener('resize', () => this.onResize());
	}

	setupControls() {
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.minDistance = 1;
		this.controls.maxDistance = 10;
	}

	setupLights() {
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(2, 2, 2);
		this.scene.add(directionalLight);

		const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
		this.scene.add(ambientLight);
	}

	// helper to fetch an animation action by name (case-insensitive, partial match)
	getAnimationAction(animations, name) {
		const clip = animations.find(clip =>
			clip.name.toLowerCase().includes(name.toLowerCase())
		);
		return clip ? this.mixer.clipAction(clip) : null;
	}

	loadModel() {
		this.loader.load(this.modelPath, (gltf) => {
			// add the model to the scene.
			this.model = gltf.scene;
			this.model.position.set(0, -1.5, 0);
			this.scene.add(this.model);

			this.camera.lookAt(this.model.position);

			this.mixer = new THREE.AnimationMixer(this.model);
			gltf.animations.forEach((clip) => {
				// console.log(`Animation clip: ${clip.name}`);
			});

			this.animations['stand'] = this.getAnimationAction(gltf.animations, 'stand');
			this.animations['punch'] = this.getAnimationAction(gltf.animations, 'punch');
			this.animations['jump']  = this.getAnimationAction(gltf.animations, 'jump');

			if (this.animations['stand']) this.animations['stand'].play();

			this.setupInteractions();
		});
	}

	setupInteractions() {
		// show popup, change animation and camera.
		this.card.addEventListener("mouseenter", () => {
			if (this.isLockedIn) return;
			if (this.animations['stand']) this.animations['stand'].stop();
			if (this.animations['punch']) this.animations['punch'].play();
			this.camera.position.set(0, -1, 2);
			this.showHoverPopups();

			document.querySelectorAll('.card').forEach(card => {
				if (card !== this.card) {
					card.style.opacity = '0.5';
				}
			});
		});

		//hide popup, revert animations and camera.
		this.card.addEventListener("mouseleave", () => {
			if (this.isLockedIn) return;
			if (this.animations['punch']) this.animations['punch'].stop();
			if (this.animations['stand']) this.animations['stand'].play();
			this.camera.position.set(0, 1, 3);
			if (this.animations['jump']) this.animations['jump'].stop();
			this.hideHoverPopups();

			document.querySelectorAll('.card').forEach(card => {
				if (card !== this.card) {
					card.style.opacity = '1';
				}
			});
		});

		// create and set up the lock-in button.
		const cardButton = document.createElement("button");
		cardButton.classList.add("card-button");
		cardButton.textContent = "Ready";
		this.card.appendChild(cardButton);

		// set up the name popup by default.
		const nameDiv = document.createElement("div");
		nameDiv.textContent = this.modelName;
		nameDiv.classList.add("popup-hover-name");
		this.card.appendChild(nameDiv);

		cardButton.addEventListener("click", () => {
		if (this.animations['jump']) this.animations['jump'].play();
		if (this.animations['punch']) this.animations['punch'].stop();
		if (this.animations['stand']) this.animations['stand'].stop();

		if (this.animations['jump'] && this.isLockedIn) {
			this.camera.position.set(0, -1, 2);
			this.animations['jump'].stop();
			this.animations['punch'].play();
		}

		this.camera.position.set(0, -1, 2);
		this.isLockedIn = !this.isLockedIn;
		cardButton.textContent = this.isLockedIn ? "Unready" : "Ready";
		cardButton.style.backgroundColor = this.isLockedIn ? "#000" : "#990a41";
			// console.log(`Locked in: ${this.isLockedIn}`);
		});
	}

	showHoverPopups() {
		const popupDiv = document.createElement("div");
		popupDiv.classList.add("popup-container");
		this.card.appendChild(popupDiv);

		// name
		const nameDiv = document.createElement("div");
		nameDiv.textContent = this.modelName;
		nameDiv.classList.add("popup-hover-name");
		popupDiv.appendChild(nameDiv);

		// stats
		const statsDiv = document.createElement("div");
		statsDiv.classList.add("popup-hover-stats");
		const statsList = document.createElement("ul");

		this.modelStats.split(",").forEach(stat => {
			const [key, value] = stat.split(":").map(item => item.trim());
			const statItem = document.createElement("li");

			// create spans for keys and values
			const statKeySpan = document.createElement("span");
			statKeySpan.classList.add("stat-key");
			statKeySpan.textContent = `${key}: `;

			const statValueSpan = document.createElement("span");
			statValueSpan.classList.add("stat-value");
			statValueSpan.textContent = value;

			statItem.appendChild(statKeySpan);
			statItem.appendChild(statValueSpan);
			statsList.appendChild(statItem);
		});

		statsDiv.appendChild(statsList);
		popupDiv.appendChild(statsDiv);

		// desc
		const descriptionDiv = document.createElement("div");
		descriptionDiv.textContent = this.modelDescription;
		descriptionDiv.classList.add("popup-hover-description");
		popupDiv.appendChild(descriptionDiv);

		// desc - lore
		const loreButton = document.createElement("button");
		loreButton.textContent = "Show Lore";
		loreButton.classList.add("lore-button");
		popupDiv.appendChild(loreButton);

		// toggle   
		loreButton.addEventListener("click", () => {
			const isVisible = descriptionDiv.style.display === "block";
			descriptionDiv.style.display = isVisible ? "none" : "block";
			loreButton.textContent = isVisible ? "Show Lore" : "Hide Lore";
		});
	}


	hideHoverPopups() {
		const popupDiv = this.card.querySelector(".popup-container");
		if (popupDiv) popupDiv.remove();
	}

	animate() {
		requestAnimationFrame(() => this.animate());
		this.controls.update();
		const delta = this.clock.getDelta();
		if (this.mixer) this.mixer.update(delta);
		this.renderer.render(this.scene, this.camera);
	}

	onResize() {
		this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
	}
}

// initialize a CardScene for every .card element
	document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll('.card').forEach(card => {
		new CardScene(card);
	});
});
