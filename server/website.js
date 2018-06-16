// ------------------------------  OPEN-AUTOMATION ----------------------------------- //
// -----------------  https://github.com/physiii/open-automation  -------------------- //
// --------------------------------- website.js -------------------------------------- //

const database = require('./database.js'),
	config = require('../config.json'),
	utils = require('./utils.js'),
	AccountsManager = require('./accounts/accounts-manager.js'),
	uuid = require('uuid/v4'),
	crypto = require('crypto'),
	express = require('express'),
	socket = require('./socket.js'),
	bodyParser = require('body-parser'),
	cookie = require('cookie'),
	path = require('path'),
	url = require('url'),
	fs = require('fs'),
	https = require('https'),
	http = require('http'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	jwt = require('jsonwebtoken'),
	webpack = require('webpack'),
	WebpackDevMiddleware = require('webpack-dev-middleware'),
	WebpackHotMiddleware = require('webpack-hot-middleware'),
	webpack_config_file = require('../webpack.config'),
	WEBSITE_PORT = config.website_port || 5000,
	WEBSITE_SECURE_PORT = config.website_secure_port || 4443,
	IS_SSL_ENABLED = config.use_ssl || false,
	IS_DEV_ENABLED = config.use_dev || false,
	PASSWORD_HASH_ALGORITHM = 'sha512',
	XSRF_TOKEN_SIZE = 16;

let SSL_KEY, SSL_CERT;

module.exports = {
	start
};

function generateXsrfToken () {
	return new Promise((resolve, reject) => {
		crypto.randomBytes(XSRF_TOKEN_SIZE, (error, token_buffer) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(token_buffer.toString('hex'));
		});
	});
}

function start (app) {
	var port,
		server,
		server_description;

	if (IS_SSL_ENABLED) {
		try {
			SSL_KEY = fs.readFileSync(config.ssl_key_path || (__dirname + '/key.pem'));
			SSL_CERT = fs.readFileSync(config.ssl_cert_path || (__dirname + '/cert.pem'));
		} catch (error) {
			console.error('There was an error when trying to load SSL files.', error);

			return;
		}
	}

	// Set JSON Web Tokens secret.
	const JWT_SECRET = SSL_KEY || uuid();

	// Set up webpack middleware (for automatic compiling/hot reloading).
	if (IS_DEV_ENABLED) {
		var webpack_env = {
			hot: true, // Used so that in webpack config we know when webpack is running as middleware.
			development: IS_DEV_ENABLED,
			production: !IS_DEV_ENABLED
		};
		var webpack_config = webpack_config_file(webpack_env);
		var webpack_compiler = webpack(webpack_config);
		app.use(WebpackDevMiddleware(webpack_compiler, {
			publicPath: webpack_config.output.publicPath,
			logLevel: 'warn'
		}));
		app.use(WebpackHotMiddleware(webpack_compiler));
	}

	app.use(bodyParser.json()); // support json encoded bodies
	app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

	// TODO: Investigate removing allowCrossDomain.
	app.use(function allowCrossDomain (req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

		if ('OPTIONS' == req.method) {
			res.send(200);
		} else {
			next();
		}
	});

	app.use(passport.initialize());
	app.use(passport.session());
	passport.serializeUser((user, done) => {
		done(null, user);
	});

	passport.use(new LocalStrategy((username, password, done) => {
		const account = AccountsManager.getAccountByUsername(username);

		if (!account) {
			console.log('Login ' + username + ': account not found.');
			return done(null, false);
		}

		account.isCorrectPassword(password).then((is_correct) => {
			if (!is_correct) {
				console.log('Login ' + username + ': incorrect password.');
				return done(null, false);
			}

			// Password is correct.
			return done(null, {account});
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

	app.post(
		'/api/login',
		passport.authenticate('local'),
		(request, response) => {
			const account = request.user.account;

			// Generate access token and CSRF token.
			Promise.all([
				account.generateAccessToken(config.api_token_issuer, JWT_SECRET),
				generateXsrfToken()
			]).then(([access_token, xsrf_token]) => {
				// Store the tokens in cookies on client.
				response.setHeader('Set-Cookie', [
					'access_token=' + access_token + '; path=/; HttpOnly;' + (IS_SSL_ENABLED ? ' Secure;' : ''),
					'xsrf_token=' + xsrf_token + '; path=/;'
				]);

				response.json({account: account.clientSerialize()});
			}).catch((error) => {
				console.log('Login ' + account.username + ': token signing error.', error);
				response.sendStatus(500);
			});
		}
	);

	app.post('/api/logout', (request, response) => {
		// Delete the token cookies from client.
		response.setHeader('Set-Cookie', [
			'access_token=null; path=/; HttpOnly; expires=Thu, 01 Jan 1970 00:00:00 GMT;',
			'xsrf_token=null; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;'
		]);
		response.sendStatus(200);
	});

	app.post('/api/account', (request, response) => {
		const username = request.body.username,
			password = request.body.password,
			is_username_taken = AccountsManager.isUsernameInUse(username);

		// Username is already in use.
		if (is_username_taken) {
			response.sendStatus(409);
			return;
		}

		AccountsManager.createAccount({username, password}).then((account) => {
			const account_client_serialized = account.clientSerialize();

			console.log('Created account.', account_client_serialized);
			response.status(201).json({account: account_client_serialized});
		}).catch((error) => {
			console.error('Tried to create an account, but there was an error.', error);
			response.sendStatus(500);
		});
	});

	app.get('/api/account', (request, response) => {
		const cookies = request.headers.cookie ? cookie.parse(request.headers.cookie) : {};

		// There's no access token cookie.
		if (!cookies.access_token) {
			response.sendStatus(401);
			return;
		}

		// Verify access token.
		jwt.verify(cookies.access_token, JWT_SECRET, {issuer: config.api_token_issuer}, (error, claims) => {
			// Access token is invalid.
			if (error) {
				response.sendStatus(401);
				return;
			}

			// Get the account for the account ID provided by the access token.
			const account = AccountsManager.getAccountById(claims.sub);

			// Account for ID wasn't found.
			if (!account) {
				response.sendStatus(404);
				return;
			}

			response.json({account: account.clientSerialize()});
		});
	});

	app.get('*', (request, response) => {
		response.sendFile('/index.html', {root: __dirname + '/../public'});
	});

	// Create server.
	if (IS_SSL_ENABLED) {
		port = WEBSITE_SECURE_PORT;
		server = https.createServer({
			key: SSL_KEY,
			cert: SSL_CERT
		}, app);
		server_description = 'Secure';
	} else {
		port = WEBSITE_PORT;
		server = http.createServer(app);
		server_description = 'Insecure';
	}

	// Start servers.
	server.listen(port, null, () => console.log(server_description + ' server listening on port ' + port));
	socket.start(server, JWT_SECRET);
}
