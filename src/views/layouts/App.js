import React from 'react';
import PropTypes from 'prop-types';
import {Redirect, Switch} from 'react-router-dom';
import LoginScreen from './LoginScreen.js';
import PrivateRoute from '../components/PrivateRoute.js';
import AppToolbar from '../components/AppToolbar.js';
import Dashboard from '../components/Dashboard.js';
import Settings from '../components/Settings.js';
import Logout from '../components/Logout.js';
import ConsoleInterface from '../components/ConsoleInterface.js';
import {connect} from 'react-redux';
import {isAuthenticated} from '../../state/ducks/session/selectors.js';
import {hasInitialFetchCompleted} from '../../state/ducks/devices-list/selectors.js';
import {hot} from 'react-hot-loader';
import './App.css';

export const App = (props) => {
	if (!props.isLoggedIn) {
		return (
			<div styleName="app">
				<div styleName="contentCentered">
					<LoginScreen />
				</div>
			</div>
		);
	}

	return (
		<div styleName="app">
			<div styleName="toolbar">
				<AppToolbar />
			</div>
			<div styleName="content">
				{props.isLoading
					? <div>Loading</div>
					: <Switch>
						<PrivateRoute exact path="/" render={() => <Redirect to="/dashboard" />} />
						<PrivateRoute path="/login" render={() => <Redirect to="/dashboard" />} />
						<PrivateRoute path="/register" render={() => <Redirect to="/dashboard" />} />
						<PrivateRoute path="/logout" component={Logout} />
						<PrivateRoute path="/dashboard" component={Dashboard} />
						<PrivateRoute path="/settings" component={Settings} />
					</Switch>}
			</div>
			<ConsoleInterface />
		</div>
	);
};

App.propTypes = {
	isLoggedIn: PropTypes.bool,
	isLoading: PropTypes.bool
};

const mapStateToProps = (state) => ({
		isLoggedIn: isAuthenticated(state.session),
		isLoading: state.session.loading || (isAuthenticated(state.session) && !hasInitialFetchCompleted(state.devicesList))
	}),
	connectedApp = connect(
		mapStateToProps,
		null,
		null,
		{pure: false}
	)(App);

export default hot(module)(connectedApp); // Wrap component for hot module reloading.
