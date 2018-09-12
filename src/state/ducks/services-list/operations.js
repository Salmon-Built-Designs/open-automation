import * as actions from './actions';
import Api from '../../../api.js';

const cameraStartStream = (cameraServiceId) => (dispatch) => {
		Api.cameraStartLiveStream(cameraServiceId).then((data) => {
			dispatch(actions.cameraStreamLive(cameraServiceId, data.stream_token));
		});
	},
	cameraStopStream = (cameraServiceId) => () => {
		Api.cameraStopLiveStream(cameraServiceId);
	},
	cameraFetchRecordings = (cameraServiceId) => (dispatch) => {
		dispatch(actions.cameraFetchRecordings(cameraServiceId));

		Api.cameraGetRecordings(cameraServiceId).then((data) => {
			dispatch(actions.cameraFetchRecordingsSuccess(cameraServiceId, data.recordings));
		}).catch((error) => {
			dispatch(actions.cameraFetchRecordingsError(cameraServiceId, error));
		});
	},
	cameraStartRecordingStream = (recording) => (dispatch) => {
		Api.cameraStartRecordingStream(recording.camera_id, recording.id).then((data) => {
			dispatch(actions.cameraStreamRecording(recording.camera_id, recording.id, data.stream_token));
		});
	},
	cameraStopRecordingStream = (recording) => () => {
		Api.cameraStopRecordingStream(recording.camera_id, recording.id);
	},
	lockLock = (lockServiceId) => () => {
		Api.lockSetLocked(lockServiceId, true);
	},
	lockUnlock = (lockServiceId) => () => {
		Api.lockSetLocked(lockServiceId, false);
	},
	lockSetRelockDelay = (lockServiceId, relockDelay) => () => {
		Api.lockSetRelockDelay(lockServiceId, relockDelay);
	},
	thermostatSetTemp = (thermostatServiceId, temp) => () => {
		Api.thermostatSetTemp(thermostatServiceId, temp);
	},
	thermostatSetMode = (thermostatServiceId, mode) => () => {
		Api.thermostatSetMode(thermostatServiceId, mode);
	},
	thermostatRemoveHold = (thermostatServiceId) => () => {
		Api.thermostatSetHold(thermostatServiceId, 'off');
	},
	thermostatSetHold = (thermostatServiceId) => () => {
		Api.thermostatSetHold(thermostatServiceId, 'on');
	},
	thermostatFanOn = (thermostatServiceId) => () => {
		Api.thermostatSetFan(thermostatServiceId, 'on');
	},
	thermostatFanAuto = (thermostatServiceId) => () => {
		Api.thermostatSetFan(thermostatServiceId, 'auto');
	};


export {
	cameraStartStream,
	cameraStopStream,
	cameraFetchRecordings,
	cameraStartRecordingStream,
	cameraStopRecordingStream,
	lockLock,
	lockUnlock,
	lockSetRelockDelay,
	thermostatSetTemp,
	thermostatSetMode,
	thermostatRemoveHold,
	thermostatSetHold,
	thermostatFanOn,
	thermostatFanAuto
};
