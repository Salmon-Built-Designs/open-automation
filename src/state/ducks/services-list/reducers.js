import Immutable from 'immutable';
import createService from './models/service.js';
import * as types from './types';
import * as devicesListTypes from '../devices-list/types';
import * as sessionTypes from '../session/types';

const initialState = Immutable.Map({
		services: Immutable.Map(),
		loading: false,
		fetched: false, // Whether first fetch has completed.
		error: false
	}),
	recordingsInitialState = Immutable.Map({
		recordings: Immutable.OrderedMap(),
		loading: false,
		error: false
	}),
	reducer = (state = initialState, action) => {
		switch (action.type) {
			case devicesListTypes.FETCH_DEVICES:
				return state.set('loading', true);
			case devicesListTypes.FETCH_DEVICES_SUCCESS:
				return state.merge({
					loading: false,
					fetched: true,
					error: false,
					services: mapFromArray(action.payload.devices, (device) => mapFromArray(device.services, (service) => {
						const currentServiceState = state.getIn(['services', service.id]);

						return createService({
							...service,
							device_id: device.id,
							state: {
								...service.state,
								connected: device.state.connected &&
									(Object.prototype.hasOwnProperty.call(service.state, 'connected')
										? service.state.connected
										: true)
							},
							recordingsList: recordingsReducer(
								currentServiceState && currentServiceState.recordingsList,
								{
									...action,
									payload: {recordings: service.recordings}
								}
							)
						});
					})).flatten(1) // Flatten the devices collection to get a list of just services.
				});
			case devicesListTypes.FETCH_DEVICES_ERROR:
				return state.merge({
					loading: false,
					error: action.payload.error.message
				});
			case types.SET_SETTINGS:
				return state.mergeIn(
					['services', action.payload.serviceId],
					{
						settings: action.payload.settings,
						error: null
					}
				);
			case types.SET_SETTINGS_ERROR:
				return state.mergeIn(
					['services', action.payload.serviceId],
					{
						settings: action.payload.originalSettings,
						error: action.payload.error.message
					}
				);
			case types.FETCH_CAMERA_RECORDINGS:
			case types.FETCH_CAMERA_RECORDINGS_SUCCESS:
			case types.FETCH_CAMERA_RECORDINGS_ERROR:
			case types.STREAM_CAMERA_RECORDING:
				return state.setIn(
					['services', action.payload.cameraId, 'recordingsList'],
					recordingsReducer(
						state.getIn(['services', action.payload.cameraId, 'recordingsList']),
						action
					)
				);
			case types.STREAM_CAMERA_LIVE:
				return state.setIn(
					['services', action.payload.cameraId, 'streaming_token'],
					action.payload.streamToken
				);
			case sessionTypes.LOGOUT:
				return initialState;
			default:
				return state;
		}
	},
	recordingsReducer = (state = recordingsInitialState, action) => {
		switch (action.type) {
			case devicesListTypes.FETCH_DEVICES_SUCCESS:
				return state.set('recordings', action.payload.recordings
					? orderedMapFromArray(action.payload.recordings)
					: state.get('recordings'));
			case types.FETCH_CAMERA_RECORDINGS:
				return state.set('loading', true);
			case types.FETCH_CAMERA_RECORDINGS_SUCCESS:
				return state.merge({
					loading: false,
					error: false,
					recordings: orderedMapFromArray(action.payload.recordings)
				});
			case types.FETCH_CAMERA_RECORDINGS_ERROR:
				return state.merge({
					loading: false,
					error: action.payload.error.message
				});
			case types.STREAM_CAMERA_RECORDING:
				return state.setIn(
					['recordings', action.payload.recordingId, 'streaming_token'],
					action.payload.streamToken
				);
			default:
				return state;
		}
	};

function mapFromArray (array = [], mapper, mapClass = Immutable.Map) {
	return mapClass(array.map((item) => [
		item.id,
		typeof mapper === 'function' ? mapper(item) : item
	]));
}

function orderedMapFromArray (array, mapper) {
	return mapFromArray(array, mapper, Immutable.OrderedMap);
}

export default reducer;
