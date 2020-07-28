const user = require('./utils/user');

const express = require('express'),
	path = require('path'),
	http = require('http'),
	Filter = require('bad-words'),
	socketio = require('socket.io'),
	app = express(),
	server = http.createServer(app),
	io = socketio(server),
	{ generateMessage, generateLocationMessage } = require('./utils/messages'),
	{ addUser, removeUser, getUser, getUsersInRoom } = require('./utils/user'),
	port = process.env.PORT || 3000,
	publicPath = path.join(__dirname, '../public');

app.use(express.static(publicPath));

io.on('connection', (socket) => {
	console.log('New Websocket Connection');

	socket.on('join', ({ username, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, username, room });
		if (error) {
			return callback(error);
		}

		socket.join(user.room);
		socket.emit('message', generateMessage('Admin', 'Welcome!'));
		socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`));
		io.to(user.room).emit('roomData', {
			room  : user.room,
			users : getUsersInRoom(user.room)
		});
		callback();
	});

	socket.on('sendMessage', (message, callback) => {
		const user = getUser(socket.id);

		const filter = new Filter();
		if (filter.isProfane(message)) {
			socket.emit('message', generateMessage('Profane content'));
			return callback('Profanity is not allowed');
		}
		io.to(user.room).emit('message', generateMessage(user.username, message));
		callback();
	});
	socket.on('sendLocation', (coords, callback) => {
		const user = getUser(socket.id);

		io
			.to(user.room)
			.emit(
				'location',
				generateLocationMessage(
					user.username,
					`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
				)
			);
		callback();
	});
	socket.on('disconnect', () => {
		const user = removeUser(socket.id);
		if (user) {
			io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`));
			io.to(user.room).emit('roomData', {
				room  : user.room,
				users : getUsersInRoom(user.room)
			});
		}
	});
});

app.get('/next', (req, res) => {
	res.send('Help');
});
server.listen(port, () => {
	console.log('Server is up on ' + port);
});
