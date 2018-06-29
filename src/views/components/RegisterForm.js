import React from 'react';
import PropTypes from 'prop-types';
import TextField from './TextField.js';
import Actions from './Actions.js';
import Button from './Button.js';
import {Redirect} from 'react-router-dom';
import {connect} from 'react-redux';
import * as session from '../../state/ducks/session';

export class RegisterForm extends React.Component {
	constructor (props) {
		super(props);

		this.state = {
			username: '',
			password: ''
		};

		this.handleUsernameChange = this.handleUsernameChange.bind(this);
		this.handlePasswordChange = this.handlePasswordChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleUsernameChange (event) {
		this.setState({username: event.target.value});
	}

	handlePasswordChange (event) {
		this.setState({password: event.target.value});
	}

	handleSubmit (event) {
		event.preventDefault();
		this.props.register(this.state.username, this.state.password);
	}

	render () {
		if (this.props.isLoggedIn) {
			return <Redirect to="/" />;
		}

		if (this.props.isLoading) {
			return <div>Loading</div>;
		}

		return (
			<form onSubmit={this.handleSubmit}>
				{this.props.error &&
					<p>{this.props.error}</p>}
				<TextField label="Email" value={this.state.username} onChange={this.handleUsernameChange} />
				<TextField label="Password" type="password" value={this.state.password} onChange={this.handlePasswordChange} />
				<Actions>
					<Button type="filled" submitForm={true}>Create Account</Button>
				</Actions>
			</form>
		);
	}
}

RegisterForm.propTypes = {
	isLoggedIn: PropTypes.bool,
	isLoading: PropTypes.bool,
	error: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.bool
	]),
	register: PropTypes.func
};

const mapStateToProps = (state) => ({
		isLoggedIn: session.selectors.isAuthenticated(state.session),
		isLoading: state.session.isFetching,
		error: state.session.error
	}),
	mapDispatchToProps = (dispatch) => ({
		register: (username, password) => {
			dispatch(session.operations.register(username, password));
		}
	});

export default connect(mapStateToProps, mapDispatchToProps)(RegisterForm);
