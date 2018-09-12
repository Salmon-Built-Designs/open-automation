// ------------------------------  OPEN-AUTOMATION ----------------------------------- //
// -----------------  https://github.com/physiii/open-automation  -------------------- //
// --------------------------------- website.js -------------------------------------- //

const config = require('../config.json'),
	AccountsManager = require('./accounts/accounts-manager.js'),
	express = require('express'),
	bodyParser = require('body-parser'),
	cookie = require('cookie'),
	fs = require('fs'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	jwt = require('jsonwebtoken'),
	webpack = require('webpack'),
	WebpackDevMiddleware = require('webpack-dev-middleware'),
	WebpackHotMiddleware = require('webpack-hot-middleware'),
	webpack_config_file = require('../webpack.config'),
	is_dev_enabled = config.use_dev || false,
	MILLISECONDS_PER_SECOND = 1000,
	TAG = '[website.js]';

module.exports = function (is_ssl_enabled, jwt_secret) {
	const app = express();
	let logo_file_path = config.logo_path || '/logo.png';

	try {
		fs.accessSync(__dirname + '/../public/' + logo_file_path);
	} catch (error) {
		logo_file_path = false;
	}

	// Set up webpack middleware (for automatic compiling/hot reloading).
	if (is_dev_enabled) {
		const webpack_config = webpack_config_file({
				hot: true, // Used so that in webpack config we know when webpack is running as middleware.
				development: is_dev_enabled,
				production: !is_dev_enabled
			}),
			webpack_compiler = webpack(webpack_config);

		app.use(WebpackDevMiddleware(webpack_compiler, {
			publicPath: webpack_config.output.publicPath,
			logLevel: 'warn'
		}));

		app.use(WebpackHotMiddleware(webpack_compiler));
	}

	// Support json encoded bodies.
	app.use(bodyParser.json());

	// Support encoded bodies.
	app.use(bodyParser.urlencoded({extended: true}));

	app.use(passport.initialize());
	app.use(passport.session());
	passport.serializeUser((user, done) => {
		done(null, user);
	});

	passport.use(new LocalStrategy((username, password, done) => {
		const account = AccountsManager.getAccountByUsername(username);

		if (!account) {
			console.log(TAG, 'Login ' + username + ': account not found.');
			return done(null, false);
		}

		account.isCorrectPassword(password).then((is_correct) => {
			if (!is_correct) {
				console.log(TAG, 'Login ' + username + ': incorrect password.');
				return done(null, false);
			}

			// Password is correct.
			return done(null, account);
		}).catch(() => {
			return done(null, false);
		});
	}));

	app.use('/', express.static(__dirname + '/../public'));

	app.get('/get_ip', (request, response) => {
		let ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

		ip = ip.split(':');
		ip = ip[ip.length - 1];

		response.send(ip);
	});

	app.post('/api/token', (request, response, next) => {
		function verifyAccessToken (access_token, xsrf_token) {
			return new Promise((resolve, reject) => {
				if (!access_token) {
					reject('No access token');
					return;
				}

				jwt.verify(access_token, jwt_secret, {issuer: config.api_token_issuer}, (error, claims) => {
					// Access token is invalid.
					if (error) {
						reject('Invalid access token ' + error.name);
						return;
					}

					// Access token or CSRF token is invalid.
					if (xsrf_token !== claims.xsrf_token) {
						reject('Invalid XSRF token');
						return;
					}

					const account = AccountsManager.getAccountById(claims.sub);

					if (!account) {
						reject('Account not found');
						return;
					}

					// Get the account for the account ID provided by the access token.
					resolve({
						account,
						refresh_token: claims.refresh_token
					});
				});
			});
		}

		function respondWithAccessToken (account) {
			// Generate access token and CSRF token.
			account.generateAccessToken(config.api_token_issuer, jwt_secret).then((tokens) => {
				// Store the access token in a cookie on client. This cookie
				// MUST be set to HttpOnly; and Secure; (if SSL is configured)
				// to protect against certain XSS and MITM attacks.
				response.setHeader('Set-Cookie', 'access_token=' + tokens.access_token + '; path=/; HttpOnly;' + (is_ssl_enabled ? ' Secure;' : ''));

				response.json({
					account: account.clientSerialize(),
					xsrf_token: tokens.xsrf_token,
					access_token_expires: jwt.decode(tokens.access_token).exp * MILLISECONDS_PER_SECOND
				});
			}).catch((error) => {
				console.log(TAG, 'Token signing error.', error);
				response.sendStatus(500);
			});
		}

		if (request.body.grant_type === 'password') {
			// Authenticate user credentials.
			passport.authenticate('local', (error, account) => {
				if (error) {
					return next(error);
				}

				if (!account) {
					return response.sendStatus(401);
				}

				// Login successful.
				request.logIn(account, (error) => {
					if (error) {
						return next(error);
					}

					respondWithAccessToken(account);
				});
			})(request, response, next);
		} else if (request.body.grant_type === 'refresh') {
			const cookies = request.headers.cookie ? cookie.parse(request.headers.cookie) : {};

			verifyAccessToken(cookies.access_token, request.headers['x-xsrf-token']).then(({account, refresh_token}) => {
				account.verifyRefreshToken(refresh_token).then((is_refresh_token_valid) => {
					if (is_refresh_token_valid) {
						respondWithAccessToken(account);
					} else {
						response.sendStatus(401);
					}
				}).catch(() => {
					response.sendStatus(500);
				});
			}).catch((error) => {
				console.log(TAG, 'Error validating access token (' + error + ').');
				response.sendStatus(401);
			});
		} else {
			response.sendStatus(400);
		}
	});

	app.post('/api/logout', (request, response) => {
		// Delete the token cookies from client.
		response.setHeader('Set-Cookie', 'access_token=null; path=/; HttpOnly; expires=Thu, 01 Jan 1970 00:00:00 GMT;');
		response.sendStatus(200);
	});

	app.post('/api/account', (request, response) => {
		const username = request.body.username,
			password = request.body.password;

		AccountsManager.createAccount({username, password}).then((account) => {
			const account_client_serialized = account.clientSerialize();

			console.log(TAG, 'Created account.', account_client_serialized);

			response.status(201).json({account: account_client_serialized});
		}).catch((error) => {
			if (error === 'username') {
				response.sendStatus(409);
				return;
			}

			if(error === 'password') {
				response.sendStatus(422);
				return;
			}

			console.error('Tried to create an account, but there was an error.', error);
			response.sendStatus(500);
		});
	});

	app.get('/js/config.js', (request, response) => {
		response.type('.js').send('window.OpenAutomation = {config: ' + JSON.stringify({
			app_name: config.app_name || 'Open Automation',
			logo_path: logo_file_path
		}) + '};');
	});

	app.get('*', (request, response) => {
		response.sendFile('/index.html', {root: __dirname + '/../public'});
	});

	return app;
};
