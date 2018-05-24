const Service = require('./service.js'),
	TAG = '[CameraService]';

class CameraService extends Service {
	constructor (data, driverClass) {
		super(data);

		this.type = 'camera';

		this.setSettings(data.settings || {});

		this.driver = new driverClass(this.id);
		this.subscribeToDriver();
	}

	subscribeToDriver () {}

	setSettings (settings) {
		this.settings.resolution_w = settings.resolution_w || 640;
		this.settings.resolution_h = settings.resolution_h || 480;
		this.settings.rotation = settings.rotation || 0;
	}

	getPreviewImage () {
		this.driver.getPreview();
	}

	streamLive () {
		this.driver.streamLive();
	}

	stopStream () {
		this.driver.stopStream();
	}

	serialize () {
		return {
			...Service.prototype.serialize.apply(this, arguments),
			os_device_path: this.os_device_path
		};
	}

	dbSerialize () {
		return this.serialize();
	}

	clientSerialize () {
		return this.serialize();
	}
}

module.exports = CameraService;
