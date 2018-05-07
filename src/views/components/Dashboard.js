import React from 'react';
import PropTypes from 'prop-types';
import {Route} from 'react-router-dom';
import DeviceCard from './DeviceCard.js';
import CameraRecordings from './CameraRecordings.js';
import {connect} from 'react-redux';
import {devicesWithoutGateways} from '../../state/ducks/devices-list/selectors.js';
import '../styles/layouts/_cardGrid.scss';

export const Dashboard = (props) => {
	const cameraRecordingsBasePath = props.match.path + '/recordings';

	return (
		<div>
			<Route exact path={props.match.path} render={() => (
				<div className="oa-l-cardGrid">
					{props.devices.map((device, index) => (
						<div key={index} className="oa-l-cardGrid--card">
							<DeviceCard device={device} parentPath={props.match.path} />
						</div>
					))}
				</div>
			)} />
			<Route path={cameraRecordingsBasePath + '/:cameraId/:year?/:month?/:date?/:recordingId?'} render={(routeProps) => (
				<CameraRecordings {...routeProps} basePath={cameraRecordingsBasePath} />
			)} />
		</div>
	);
};

Dashboard.propTypes = {
	devices: PropTypes.oneOfType([
		PropTypes.array,
		PropTypes.object // TODO: Immutable List
	]),
	match: PropTypes.object
};

const mapStateToProps = (state) => ({
	devices: devicesWithoutGateways(state.devicesList)
});

export default connect(mapStateToProps)(Dashboard);
