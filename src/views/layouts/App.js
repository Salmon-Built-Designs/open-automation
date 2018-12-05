import React from 'react';
import PropTypes from 'prop-types';
import {Redirect, Switch} from 'react-router-dom';
import Route from '../components/Route.js';
import LoginScreen from './LoginScreen.js';
import PrivateRoute from '../components/PrivateRoute.js';
import AppToolbar from '../components/AppToolbar.js';
import DashboardScreen from '../components/DashboardScreen.js';
import RoomsScreen from '../components/RoomsScreen.js';
import SettingsScreen from '../components/SettingsScreen.js';
import TabBar from '../components/TabBar.js';
import DashboardIcon from '../icons/DashboardIcon.js';
import DoorIcon from '../icons/DoorIcon.js';
import SettingsIcon from '../icons/SettingsIcon.js';
import Logout from '../components/Logout.js';
import ConsoleInterface from '../components/ConsoleInterface.js';
import {connect} from 'react-redux';
import {isAuthenticated, isLoading} from '../../state/ducks/session/selectors.js';
import {fetchDevices} from '../../state/ducks/devices-list/operations.js';
import {hasInitialFetchCompleted} from '../../state/ducks/devices-list/selectors.js';
import {fetchRooms} from '../../state/ducks/rooms-list/operations.js';
import {getCurrentContextPath, getContextCurrentFullPath} from '../../state/ducks/navigation/selectors.js';
import {compose} from 'redux';
import {hot} from 'react-hot-loader';
import './App.css';

export class App extends React.Component {
	componentDidMount () {
		this.fetch();
	}

	componentDidUpdate () {
		this.fetch();
	}

	fetch () {
		if (!this.props.isAuthenticated || this.didInitialFetch) {
			return;
		}

		this.props.fetchDevices();
		this.props.fetchRooms();
		this.didInitialFetch = true;
	}

	render () {
		const renderLoginScreen = (routeProps) => (
			<div styleName="content">
				<LoginScreen location={routeProps.location} />
			</div>
		);

		return (
			<div styleName="app">
				<Switch>
					<Route path="/login" render={renderLoginScreen} />
					<Route path="/register" render={renderLoginScreen} />
					<PrivateRoute render={() => (
						<React.Fragment>
							<div styleName="toolbar">
								<AppToolbar />
							</div>
							<div styleName="content">
								{this.props.isLoading
									? <div>Loading</div>
									: <Switch>
										<Route path="/logout" component={Logout} />
										<DashboardScreen path="/dashboard" />
										<RoomsScreen path="/rooms" />
										<SettingsScreen path="/settings" />
										<Route render={() => <Redirect to="/dashboard" />} />
									</Switch>}
							</div>
							{!this.props.isLoading && <div styleName="tabBar">
								<TabBar buttons={[
									{
										label: 'Dashboard',
										icon: <DashboardIcon size={24} />,
										to: this.props.getTabPath('/dashboard'),
										isActive: this.props.activeTabPath === '/dashboard'
									},
									{
										label: 'Rooms',
										icon: <DoorIcon size={24} />,
										to: this.props.getTabPath('/rooms'),
										isActive: this.props.activeTabPath === '/rooms'
									},
									{
										label: 'Settings',
										icon: <SettingsIcon size={24} />,
										to: this.props.getTabPath('/settings'),
										isActive: this.props.activeTabPath === '/settings'
									}
								]} />
							</div>}
							<ConsoleInterface />
						</React.Fragment>
					)} />
				</Switch>
			</div>
		);
	}
}

App.propTypes = {
	isAuthenticated: PropTypes.bool,
	isLoading: PropTypes.bool,
	activeTabPath: PropTypes.string,
	getTabPath: PropTypes.func.isRequired,
	fetchDevices: PropTypes.func.isRequired,
	fetchRooms: PropTypes.func.isRequired
};

const mapStateToProps = ({session, navigation, devicesList}) => ({
		isAuthenticated: !isLoading(session) && isAuthenticated(session),
		isLoading: isLoading(session) || (isAuthenticated(session) && !hasInitialFetchCompleted(devicesList)),
		activeTabPath: getCurrentContextPath(navigation),
		getTabPath: (defaultTabPath) => getContextCurrentFullPath(navigation, defaultTabPath) || defaultTabPath
	}),
	mapDispatchToProps = (dispatch) => ({
		fetchDevices: () => dispatch(fetchDevices()),
		fetchRooms: () => dispatch(fetchRooms())
	});

export default compose(
	connect(mapStateToProps, mapDispatchToProps, null),
	hot(module) // Hot module reloading
)(App);
