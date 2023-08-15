let videoElement;
let canvasElement;
let model;
let streaming = false;
let cameraStarted = false;
let animationFrameId;
let targetClasses;
let confidence;
let maxDetections;
let showBoundingBoxInfo = true;
let showVideo = true;
let currentFacingMode = 'environment'; // Alustetaan etukamera (environment) aktiiviseksi

async function main() {

    const settingsToggleButton = document.getElementById('settings-toggle-button');
    settingsToggleButton.addEventListener('click', toggleSettings);

    videoElement = document.getElementById('camera');
    canvasElement = document.getElementById('output-canvas');
    model = await cocoSsd.load();

    const toggleButton = document.getElementById('toggle-button');
    const startButton = document.getElementById('start-stop-button');

    toggleButton.addEventListener('click', toggleStreaming);
    startButton.addEventListener('click', toggleCamera);

	const switchCameraButton = document.getElementById('switch-camera-button');
	switchCameraButton.addEventListener('click', toggleCameraFacingMode);

    const classesInput = document.getElementById('classes');
    
	const confidenceInput = document.getElementById("confidence");
	const confidenceValue = document.getElementById("confidence-value");
	
	const maxDetectionsInput = document.getElementById("max-detections");
	const maxDetectionsValue = document.getElementById("max-detections-value");

    const showBboxCheckbox = document.getElementById('show-bbox');
    const toggleVideoCheckbox = document.getElementById('toggle-video');

    classesInput.addEventListener('change', updateTargetClasses);
    confidenceInput.addEventListener('change', updateConfidence);
    maxDetectionsInput.addEventListener('change', updateMaxDetections);
    showBboxCheckbox.addEventListener('change', updateShowBoundingBoxInfo);
    toggleVideoCheckbox.addEventListener('change', updateShowVideo);
	
	confidenceInput.addEventListener("input", function() {
		confidenceValue.textContent = confidenceInput.value;
	});
	
	maxDetectionsInput.addEventListener("input", function() {
		maxDetectionsValue.textContent = maxDetectionsInput.value;
	});

	updateCameraStatusText();
    updateTargetClasses();
    updateConfidence();
    updateMaxDetections();
    updateShowBoundingBoxInfo();
    updateShowVideo();

	// Kutsu loadSettings funktiota lataustapahtumassa
	window.addEventListener("load", loadSettings);
}

async function toggleCameraFacingMode() {
    const constraints = { video: { facingMode: currentFacingMode === 'user' ? 'environment' : 'user' } };
    stopCamera();
    startCamera(constraints);
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    updateCameraStatusText();
	stopStreaming();
	updateToggleButton();
}

function updateCameraStatusText() {
    const statusText = currentFacingMode === 'user' ? 'Vaihda kamera' : 'Vaihda kamera';
	const switchCameraButton = document.getElementById('switch-camera-button');
    switchCameraButton.textContent = statusText;
}

function updateUIVisibility() {
    const settingsContainer = document.getElementById('settings-container');
    const objectInfo = document.getElementById('object-info');
    const canvas = document.getElementById('output-canvas');
    const cameraContainer = document.getElementById('camera-container');
    const buttonsContainer = document.getElementById('buttons-container');

    if (settingsContainer.classList.contains('settings-hidden')) {
        // Asetukset-ikkuna piilotettu
        objectInfo.style.display = showBoundingBoxInfo && streaming ? 'block' : 'none';
        canvas.style.display = streaming ? 'block' : 'none';
		if (cameraStarted && !streaming) {
          cameraContainer.style.display = 'block';
		}
        buttonsContainer.style.display = 'flex';
    } else {
        // Asetukset-ikkuna näytössä
        objectInfo.style.display = 'none';
        canvas.style.display = 'none';
        cameraContainer.style.display = 'none';
        buttonsContainer.style.display = 'none';
    }
}

function toggleSettings() {
    const settingsContainer = document.getElementById('settings-container');
    const settingsToggleButton = document.getElementById('settings-toggle-button');

    if (settingsContainer.classList.contains('settings-hidden')) {
        settingsContainer.classList.remove('settings-hidden');
    } else {
        settingsContainer.classList.add('settings-hidden');
    }
    updateUIVisibility();
}


const closeSettingsButton = document.getElementById('close-settings');
closeSettingsButton.addEventListener('click', closeSettings);

function closeSettings() {
   // const settingsContainer = document.getElementById('settings-container');
   // settingsContainer.classList.add('settings-hidden');
   saveSettings();  
   toggleSettings();
}


function toggleCamera() {
	if (!cameraStarted) {
		startCamera();
		cameraStarted = true;
	} else {
		stopCamera();
		stopStreaming();
		updateToggleButton();
		cameraStarted = false;
	}
	updateStartStopButtonText();
}

function stopCamera() {
	streaming = false;
	const stream = videoElement.srcObject;
	const tracks = stream.getTracks();
	
	tracks.forEach(track => track.stop());
	
	videoElement.srcObject = null;
	document.getElementById('camera-container').style.display = 'block';
	document.getElementById('output-canvas').style.display = 'none';
	document.getElementById('object-info').style.display = 'none';
}

function toggleStreaming() {
	if (!streaming) {
		startStreaming();
	} else {
		stopStreaming();
	}
	updateToggleButton();
}

function updateStartStopButtonText() {
	const startButton = document.getElementById('start-stop-button');
	startButton.textContent = cameraStarted ? 'Sulje kamera' : 'Käynnistä kamera';
	startButton.style.backgroundColor = cameraStarted ? '#dc3545' : 'gray'; // Punainen kun kamera on päällä, vihreä kun ei ole
}

function updateToggleButton() {
	const toggleButton = document.getElementById('toggle-button');
	toggleButton.textContent = streaming ? 'Lopeta tunnistus' : 'Tunnista';
	toggleButton.style.backgroundColor = streaming ? '#dc3545' : 'gray'; // Punainen kun tunnistus on päällä, sininen kun ei ole
}

function startStreaming() {
	streaming = true;
	document.getElementById('camera-container').style.display = 'none';
	document.getElementById('output-canvas').style.display = 'block';

	const objectInfo = document.getElementById('object-info');

	if (showBoundingBoxInfo) {
	  	objectInfo.classList.add('object-info-hidden');		
	  	document.getElementById('object-info').style.display = 'block';
	}
	else {
		objectInfo.classList.remove('object-info-hidden');
		document.getElementById('object-info').style.display = 'none';
	}
	detectObjects();
}

function stopStreaming() {
	streaming = false;
	cancelAnimationFrame(animationFrameId);
	document.getElementById('camera-container').style.display = 'block';
	document.getElementById('output-canvas').style.display = 'none';
	document.getElementById('object-info').style.display = 'none';
	const context = canvasElement.getContext('2d');
	context.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

function startCamera() {
	const constraints = { video: { facingMode: currentFacingMode } };
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then((stream) => {
			videoElement.srcObject = stream;
			videoElement.onloadedmetadata = () => {
				canvasElement.width = videoElement.videoWidth;
				canvasElement.height = videoElement.videoHeight;
				videoElement.play();
				showVideo = true;
				updateShowVideo();
			};
		})
		.catch((error) => {
			console.error('Kameran käyttö epäonnistui:', error);
		});
}


function updateTargetClasses() {
	const classesInput = document.getElementById('classes');
	const inputText = classesInput.value.toLowerCase().trim();
	if (inputText === 'kaikki') {
		targetClasses = null; // Tunnista kaikki luokat
	} else {
		targetClasses = inputText.split(',').map(cls => cls.trim());
	}
}

function updateConfidence() {
	confidence = parseFloat(document.getElementById('confidence').value);
}

function updateMaxDetections() {
	maxDetections = parseInt(document.getElementById('max-detections').value);
}

function updateShowBoundingBoxInfo() {
	showBoundingBoxInfo = document.getElementById('show-bbox').checked;
}

function updateShowVideo() {
	showVideo = document.getElementById('toggle-video').checked;
	if (!showVideo) {
		const context = canvasElement.getContext('2d');
		context.clearRect(0, 0, canvasElement.width, canvasElement.height);
	}
}


async function detectObjects() {
	if (!streaming) {
		return;
	}

	const context = canvasElement.getContext('2d');
	context.clearRect(0, 0, canvasElement.width, canvasElement.height);

	let detectionsCount = 0;
	const objectInfoDiv = document.getElementById('object-info');
	objectInfoDiv.innerHTML = '';

	const predictions = await model.detect(videoElement);

	if (showVideo) {
		context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
	}

	predictions.forEach((prediction, index) => {
		if ((!targetClasses || targetClasses.includes(prediction.class)) && prediction.score >= confidence && detectionsCount < maxDetections) {
			if (showVideo) {
				context.beginPath();
				context.rect(...prediction.bbox);
				context.lineWidth = 2;
				context.strokeStyle = 'red';
				context.fillStyle = 'red';
				context.stroke();
				context.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%) - ID: ${index}`, prediction.bbox[0], prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10);
			}

			if (showBoundingBoxInfo) {
				const x = Math.round(prediction.bbox[0]);
				const y = Math.round(prediction.bbox[1]);
				const width = Math.round(prediction.bbox[2]);
				const height = Math.round(prediction.bbox[3]);
				const infoText = `${prediction.class} - ID: ${index}, Luottamus: ${Math.round(prediction.score * 100)}%, Bounding Box: (${x}, ${y}), (${x + width}, ${y + height})`;
				const infoParagraph = document.createElement('p');
				infoParagraph.textContent = infoText;
				objectInfoDiv.appendChild(infoParagraph);
			}

			detectionsCount++;
		}
	});

	animationFrameId = requestAnimationFrame(detectObjects);
}



// Tallennetaan asetustiedot
function saveSettings() {
    const classesInput = document.getElementById("classes");
    const confidenceInput = document.getElementById("confidence");
    const maxDetectionsInput = document.getElementById("max-detections");
    const showBboxInput = document.getElementById("show-bbox");
    const toggleVideoInput = document.getElementById("toggle-video");

    const settings = {
        classes: classesInput.value,
        confidence: confidenceInput.value,
        maxDetections: maxDetectionsInput.value,
        showBbox: showBboxInput.checked,
        toggleVideo: toggleVideoInput.checked,
    };

    localStorage.setItem("settings", JSON.stringify(settings));
}

// Ladataan tallennetut asetustiedot
function loadSettings() {

	const settings = JSON.parse(localStorage.getItem("settings"));

    if (settings) {
		const classesInput = document.getElementById("classes");
		const confidenceInput = document.getElementById("confidence");
		const maxDetectionsInput = document.getElementById("max-detections");
		const showBboxInput = document.getElementById("show-bbox");
		const toggleVideoInput = document.getElementById("toggle-video");

		classesInput.value = settings.classes;
		confidenceInput.value = settings.confidence; 
		maxDetectionsInput.value = settings.maxDetections;
		showBboxInput.checked = settings.showBbox;
		toggleVideoInput.checked = settings.toggleVideo;

	}
}

main();
