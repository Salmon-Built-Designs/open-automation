import React from 'react';
import PropTypes from 'prop-types';
import {Switch, Redirect, withRouter} from 'react-router-dom';
import {Route} from './Route.js';
import Button from './Button.js';
import SettingsScreenContainer from './SettingsScreenContainer.js';
import ServiceHeader from './ServiceHeader.js';
import DeviceRoomField from './DeviceRoomField.js';
import ServiceSettingsScreen from './ServiceSettingsScreen.js';
import './ServiceDetails.css';

export class ServiceDetails extends React.Component {
	render () {
		return (
			<Switch>
				<Route exact path={this.props.match.url} render={() => (
					<SettingsScreenContainer section={true}>
						{this.props.service.error && <p>The device settings could not be updated because of an error.</p>}
						<header styleName="header">
							{this.props.shouldShowSettingsButton && <Button to={this.props.match.url + ServiceDetails.settingsPath}>Settings</Button>}
						</header>
						{this.props.children}
					</SettingsScreenContainer>
				)} />
				<ServiceSettingsScreen service={this.props.service} path={this.props.match.path + ServiceDetails.settingsPath} />
				<Route render={() => <Redirect to={this.props.match.url} />} />
			</Switch>
		);
	}
}

ServiceDetails.settingsPath = '/service-settings';

ServiceDetails.propTypes = {
	service: PropTypes.object.isRequired,
	children: PropTypes.node,
	shouldShowSettingsButton: PropTypes.bool,
	shouldShowRoomField: PropTypes.bool,
	match: PropTypes.object
};

export default withRouter(ServiceDetails);
