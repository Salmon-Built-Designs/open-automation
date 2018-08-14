import io from 'socket.io-client';
import axios from 'axios';

const listeners = [],
	relaySocketQueue = [],
	SOCKET_CONNECT_TIMEOUT = 20000,
	ONE_HOUR_IN_MILLISECONDS = 3600000,
	GENERIC_LOGIN_ERROR = 'An error occurred while trying to log in.';

class Api {
	connect () {
		const accessTokenExpires = localStorage.getItem('access_token_expires');

		return new Promise((resolve, reject) => {
			Api.openSocket().then(() => {
				// Refresh the access token before it expires.
				if (accessTokenExpires) {
					this.setRefreshTokenTimeout(accessTokenExpires);
				}

				resolve();
			}).catch((error) => {
				console.error(error); // eslint-disable-line no-console
				reject(new Error(error));
			});
		});
	}

	on (event, callback) {
		listeners.push({event, callback});

		if (this.relaySocket && this.relaySocket.connected) {
			this.relaySocket.on(event, callback);
		}
	}

	getDevices () {
		return Api.apiCall('devices/get');
	}

	addDevice (device) {
		return Api.apiCall('device/add', {device});
	}

	removeDevice (deviceID) {
		return Api.apiCall('device/remove', {device_id: deviceID});
	}

	// Gateway Service

	getGatewayDevicesToAdd (gatewayServiceId) {
		return Api.apiCall('gateway/devices-to-add/get', {service_id: gatewayServiceId});
	}

	gatewayCommand (gatewayServiceId, command, token) {
		return Api.apiCall('gateway/command', {service_id: gatewayServiceId, command, command_token: token});
	}

	// Camera Service

	cameraStartLiveStream (cameraServiceId) {
		return Api.apiCall('camera/stream/live', {service_id: cameraServiceId});
	}

	cameraStopLiveStream (cameraServiceId) {
		return Api.apiCall('camera/stream/stop', {service_id: cameraServiceId});
	}

	cameraGetRecordings (cameraServiceId) {
		return Api.apiCall('camera/recordings/get', {service_id: cameraServiceId});
	}

	cameraStartRecordingStream (cameraServiceId, recordingId) {
		return Api.apiCall('camera/recording/stream', {service_id: cameraServiceId, recording_id: recordingId});
	}

	cameraStopRecordingStream (cameraServiceId, recordingId) {
		return Api.apiCall('camera/recording/stream/stop', {service_id: cameraServiceId, recording_id: recordingId});
	}

	// Lock Service

	lockSetLocked (lockServiceId, locked) {
		return Api.apiCall('lock/locked/set', {service_id: lockServiceId, locked});
	}

	lockSetRelockDelay (lockServiceId, relockDelay) {
		return Api.apiCall('lock/relock-delay/set', {service_id: lockServiceId, relock_delay: relockDelay});
	}

	// Session API

	getAccessToken (grant_type = 'refresh', username, password) {
		return new Promise((resolve, reject) => {
			axios.post('/api/token', {grant_type, username, password}, {headers: {'x-xsrf-token': localStorage.getItem('xsrf_token')}}).then((response) => {
				// Store the CSRF token.
				localStorage.setItem('xsrf_token', response.data.xsrf_token);

				// Store the time the access token expires. We'll schedule the
				// access token to be refreshed before it expires. Using
				// localStorage for this so it works across page loads.
				localStorage.setItem('access_token_expires', response.data.access_token_expires);

				// Connect to Socket.io API.
				this.connect().then(() => {
					resolve(response.data.account);
				}).catch((error) => {
					console.error(error); // eslint-disable-line no-console
					reject(error);
				});
			}).catch((error) => {
				const unauthorizedErrorCode = 401;
				let errorMessage = GENERIC_LOGIN_ERROR;

				if (error.response && error.response.status === unauthorizedErrorCode) {
					errorMessage = 'Username or password is incorrect.';
				}

				reject(new Error(errorMessage));
			});
		});
	}

	refreshAccessToken () {
		this.isRefreshingAccessToken = true;

		return new Promise((resolve, reject) => {
			this.getAccessToken().then(() => {
				let apiCall;

				this.isRefreshingAccessToken = false;

				// Execute any API calls that queued while access token was
				// being refreshed.
				while (relaySocketQueue.length > 0) {
					apiCall = relaySocketQueue.shift();

					Api.apiCall(apiCall.event, apiCall.payload).then(apiCall.resolve).catch(apiCall.reject);
				}
			}).catch((error) => {
				this.isRefreshingAccessToken = false;
				reject(error);
			});
		});
	}

	setRefreshTokenTimeout (accessTokenExpires) {
		const millisecondsUntilExpiry = accessTokenExpires - Date.now();

		clearTimeout(this.refreshAccessTokenTimeout);

		this.refreshAccessTokenTimeout = setTimeout(
			() => this.refreshAccessToken(),
			// Refresh the access token now if it expires in less than an hour.
			// Otherwise, refresh in an hour.
			millisecondsUntilExpiry < ONE_HOUR_IN_MILLISECONDS
				? 0
				: ONE_HOUR_IN_MILLISECONDS
		);
	}

	login (username, password) {
		return new Promise((resolve, reject) => {
			this.getAccessToken('password', username, password).then(resolve).catch(reject);
		});
	}

	logout () {
		return new Promise((resolve, reject) => {
			axios.post('/api/logout', null).then(() => {
				Api.closeSocket().then(resolve);
				localStorage.removeItem('access_token_expires');
			}).catch(() => {
				reject(new Error('An error occurred while trying to log out.'));
			});
		});
	}

	createAccount (accountData) {
		return new Promise((resolve, reject) => {
			axios.post('/api/account', {
				username: accountData.username,
				password: accountData.password
			}).then((response) => {
				resolve(response.data.account);
			}).catch((error) => {
				const conflictErrorCode = 409;

				let errorMessage = 'An error occurred while trying to create the account.';

				if (error.response && error.response.status === conflictErrorCode) {
					errorMessage = 'An account already exists for that email address.';
				}

				reject(new Error(errorMessage));
			});
		});
	}

	static openSocket () {
		return new Promise((resolve, reject) => {
			this.closeSocket();

			api.relaySocket = io('/client-api', {
				transportOptions: {
					polling: {
						extraHeaders: {
							'x-xsrf-token': localStorage.getItem('xsrf_token')
						}
					}
				}
			});

			// Set a time limit for attempting to open the socket.
			const timeout = setTimeout(() => {
				reject(new Error('Timeout'));
			}, SOCKET_CONNECT_TIMEOUT);

			api.relaySocket.on('connect', () => {
				clearTimeout(timeout);
				resolve();
			});

			// Set up listeners on new socket connection.
			listeners.forEach(({event, callback}) => {
				api.relaySocket.on(event, callback);
			});
		});
	}

	static closeSocket () {
		return new Promise((resolve) => {
			if (!api.relaySocket || !api.relaySocket.connected) {
				resolve();

				return;
			}

			api.relaySocket.on('disconnect', resolve);
			api.relaySocket.close();
		});
	}

	static apiCall (event, payload = {}) {
		return new Promise((resolve, reject) => {
			if (api.isRefreshingAccessToken) {
				relaySocketQueue.push({event, payload, resolve, reject});

				return;
			}

			if (!api.relaySocket || !api.relaySocket.connected) {
				reject(new Error('Relay socket not connected.'));

				return;
			}

			api.relaySocket.emit(event, payload, (error, data) => {
				if (error) {
					console.error('API error: ' + event, error, data); // TODO: Only log for dev build.
					reject(new Error(error));

					return;
				}

				console.log('API response: ' + event, data); // TODO: Only log for dev build.
				resolve(data);
			});
		});
	}
}

const api = new Api();

export default api;
