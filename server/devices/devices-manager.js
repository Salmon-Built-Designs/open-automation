const EventEmitter = require('events'),
	crypto = require('crypto'),
	database = require('../database.js'),
	Device = require('./device.js'),
	AccountsManager = require('../accounts/accounts-manager.js'),
	socketEscrow = {},
	devicesList = new Map(),
	DEVICE_TOKEN_SIZE = 256,
	TAG = '[DevicesManager]';

class DevicesManager {
	constructor () {
		this.events = new EventEmitter();

		this.init = this.init.bind(this);
		this.handleDeviceConnection = this.handleDeviceConnection.bind(this);
		this.handleDeviceUpdate = this.handleDeviceUpdate.bind(this);
	}

	init () {
		return this.loadDevicesFromDb();
	}

	on () {
		return this.events.on.apply(this.events, arguments);
	}

	off () {
		return this.events.off.apply(this.events, arguments);
	}

	addDevice (data) {
		let device = this.getDeviceById(data.id, null, true);

		if (device) {
			if (this.verifyAccountAccessToDevice(data.account_id, device)) {
				return device;
			} else {
				return false;
			}
		}

		device = new Device(
			{
				...data,
				account: AccountsManager.getAccountById(data.account_id),
				gateway: this.getServiceById(data.gateway_id, data.account_id)
			},
			this.handleDeviceUpdate,
			data.socket || this.getFromSocketEscrow(data.id, data.token)
		);

		this.removeFromSocketEscrow(data.id, data.token);

		devicesList.set(device.id, device);

		this.handleDeviceUpdate(device);

		return device;
	}

	createDevice (data) {
		return new Promise((resolve, reject) => {
			if (this.doesDeviceExist(data.id)) {
				reject('A device with that ID already exists.');
				return;
			}

			// Check to make sure the device is connected.
			if (!this.isDeviceReadyToAdd(data.id, data.token)) {
				reject('No device with that ID is currently connected or the device already belongs to an account.', data);
				return;
			}

			const device = this.addDevice(data);

			if (!device) {
				console.error(TAG, 'There was an error creating a device.');
				reject('There was an error creating the device.');
				return;
			}

			this.generateDeviceToken().then((token) => {
				device.setToken(token).then(() => {
					resolve(device);
				}).catch((error) => {
					// Since the token wasn't successfully set, delete the
					// device so the user can try again.
					this.deleteDevice(device.id, device.account && device.account.id);
					reject(error);
				});
			}).catch(reject);
		});
	}

	deleteDevice (deviceId, accountId) {
		return new Promise((resolve, reject) => {
			const device = this.getDeviceById(deviceId, accountId);

			if (!device) {
				reject('No device belonging to that account was found with that ID.');
				return;
			}

			database.deleteDevice(deviceId).then(() => {
				device.destroy();
				devicesList.delete(deviceId);

				resolve();
			}).catch(reject);
		});
	}

	handleDeviceConnection (deviceId, deviceToken, socket) {
		const device = this.getDeviceById(deviceId, null, true);

		// If the device doesn't exist, store the socket in escrow to be used
		// when the device is added.
		if (!device) {
			console.log(TAG, 'Unknown device connected.', deviceId);

			this.addToSocketEscrow(deviceId, deviceToken, socket);

			return;
		}

		// Device token is invalid.
		if (!device.verifyToken(deviceToken)) {
			console.log(TAG, 'Closing device socket connection due to invalid device token.', socket.id);

			socket.emit('authentication', {error: 'invalid token'});

			socket.disconnect();

			return;
		}

		console.log(TAG, 'Device connected.', deviceId);

		// Update the socket on the device.
		device.setSocket(socket, deviceToken);
	}

	handleDeviceUpdate (device) {
		const accountDevices = this.getClientSerializedDevices(this.getDevicesByAccountId(device.account_id));

		this.events.emit('devices-update/account/' + device.account_id, {devices: accountDevices});
	}

	doesDeviceExist (deviceId) {
		return Boolean(devicesList.get(deviceId));
	}

	// NOTE: Use skipAccountAccessCheck with caution. Never use for requests
	// originating from the client API.
	getDeviceById (deviceId, accountId, skipAccountAccessCheck) {
		const device = devicesList.get(deviceId);

		// Verify that this account has access to this device.
		if (this.verifyAccountAccessToDevice(accountId, device, skipAccountAccessCheck)) {
			return device;
		}
	}

	// NOTE: Use skipAccountAccessCheck with caution. Never use for requests
	// originating from the client API.
	getDeviceByServiceId (serviceId, accountId, skipAccountAccessCheck) {
		const device = Array.from(devicesList.values()).find((device) => device.services.getServiceById(serviceId));

		// Verify that this account has access to this device.
		if (this.verifyAccountAccessToDevice(accountId, device, skipAccountAccessCheck)) {
			return device;
		}
	}

	getDevicesByAccountId (accountId) {
		return Array.from(devicesList.values()).filter((device) => (device.account && device.account.id) === accountId);
	}

	// NOTE: Use skipAccountAccessCheck with caution. Never use for requests
	// originating from the client API.
	getServiceById (serviceId, accountId, skipAccountAccessCheck) {
		const device = this.getDeviceByServiceId(serviceId, accountId, skipAccountAccessCheck);

		// Verify that this account has access to this device.
		if (this.verifyAccountAccessToDevice(accountId, device, skipAccountAccessCheck)) {
			return device.services.getServiceById(serviceId);
		}
	}

	// NOTE: Use "force" with caution. Never use for requests originating from
	// the client API.
	verifyAccountAccessToDevice (accountId, device, force) {
		return (device && ((device.account && device.account.id) === accountId)) || force;
	}

	generateDeviceToken () {
		return new Promise((resolve, reject) => {
			crypto.randomBytes(DEVICE_TOKEN_SIZE, (error, tokenBuffer) => {
				if (error) {
					reject(error);

					return;
				}

				resolve(tokenBuffer.toString('hex'));
			});
		});
	}

	addToSocketEscrow (deviceId, deviceToken, socket) {
		socketEscrow[deviceId + deviceToken] = socket;
	}

	getFromSocketEscrow (deviceId, deviceToken) {
		return socketEscrow[deviceId + deviceToken];
	}

	removeFromSocketEscrow (deviceId, deviceToken) {
		delete socketEscrow[deviceId + deviceToken];
	}

	isDeviceReadyToAdd (deviceId, deviceToken) {
		const socket = this.getFromSocketEscrow(deviceId, deviceToken);

		return Boolean(socket && socket.connected);
	}

	loadDevicesFromDb () {
		return new Promise((resolve, reject) => {
			database.getDevices().then((devices) => {
				devicesList.clear();

				devices.forEach((device) => {
					this.addDevice(device);
				});

				resolve(devicesList);
			}).catch(reject);
		});
	}

	loadDeviceFromDb (deviceId) {
		return new Promise((resolve, reject) => {
			database.getDevice(deviceId).then((devices) => {
				const device = devices[0];

				if (!device) {
					reject('Device not found.');
					return;
				}

				this.addDevice(device);

				resolve();
			}).catch(reject);
		});
	}

	getClientSerializedDevices (devices = []) {
		return devices.map((device) => device.clientSerialize());
	}
}

module.exports = new DevicesManager();
