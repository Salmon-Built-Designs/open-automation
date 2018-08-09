const Service = require('./service.js'),
	TAG = '[ThermostatService]';

class ThermostatService extends Service {
	action (data) {
		switch (data.property) {
			case 'target_temp':
				return this.setTemp(data.value);
			case 'mode':
				return this.setThermostatMode(data.value);
			case 'hold_mode':
				return this.setHoldMode(data.value);
			case 'fan_mode':
				return this.setFanMode(data.value);
		}
	}

	setThermostatMode (mode) {
		return new Promise((resolve, reject) => {
			this.deviceEmit('mode/set', {mode}, (error, data) => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			});
		});
	}

	setTemp (temp) {
		return new Promise((resolve, reject) => {
			this.deviceEmit('temp/set', {temp}, (error, data) => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			});
		});
	}

	setHoldMode (mode) {
		return new Promise((resolve, reject) => {
			this.deviceEmit('holdMode/set', {mode}, (error, data) => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			});
		});
	}

	setFanMode (mode) {
		return new Promise((resolve, reject) => {
			this.deviceEmit('fanMode/set', {mode}, (error, data) => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			});
		});
	}
}

ThermostatService.type = 'thermostat';
ThermostatService.friendly_type = 'Thermostat';
ThermostatService.indefinite_article = 'A';

module.exports = ThermostatService;
