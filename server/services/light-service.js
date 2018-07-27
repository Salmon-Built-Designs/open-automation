const Service = require('./service.js'),
	GatewayLightDriver = require('./drivers/light-gateway.js'),
	TAG = '[LightService]';

class LightService extends Service {
	constructor (data, onUpdate, gateway_socket) {
		super(data, onUpdate);

		this.type = 'light';

		this.driver = new GatewayLightDriver(this.id, gateway_socket);
		this.subscribeToDriver();
	}

	subscribeToDriver () {}

	action (data) {
		console.log(TAG, 'Recieved action:', data);

		switch (data.property) {
			case 'light_on':
				this.driver.lightOn();
				break;
			case 'light_off':
				this.driver.lightOff();
				break;
			case 'set_brightness':
				this.driver.setBrightness(data.value);
				break;
			case 'set_color':
				this.driver.setColor(data.value);
				break;
			case 'set_light_name':
				this.driver.setLightName(data.value);
				break;
			default:
				break;
		};
	}

	lightOn () {
		return this.driver.lightOn();
	}

	lightOff () {
		return this.driver.lightOff();
	}

	setBrightness (brightness) {
		return this.driver.setBrightness(brightness);
	}

	setColor (color) {
		return this.driver.setColor(color);
	}

	setLightName (name) {
		return this.driver.setLightName(name);
	}

	serialize () {
		return {
			...Service.prototype.serialize.apply(this, arguments)
		};
	}

	dbSerialize () {
		return this.serialize();
	}
}

module.exports = LightService;
