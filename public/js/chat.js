const socket = io();
// DOM Elements
const messageForm = document.querySelector('#message-form');
const messageFormInput = messageForm.querySelector('input');
const messageFormButton = messageForm.querySelector('button');
const locationButton = document.querySelector('#location');
const messages = document.querySelector('#messages');

// DOM Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });
const autoscroll = () => {
	// Messages height
	const newMessage = messages.lastElementChild,
		newMessageStyles = getComputedStyle(newMessage),
		newMessageMargin = parseInt(newMessageStyles.marginBottom),
		newMessageHeight = newMessage.offsetHeight + newMessageMargin;
	// Visible Height
	const visibleHeight = messages.offsetHeight;
	// Height of messages container
	const contentHeight = messages.scrollHeight;
	// isScrolled?
	const scrollOffset = messages.scrollTop + visibleHeight;
	if (contentHeight - newMessageHeight <= scrollOffset) {
		messages.scrollTop = messages.scrollHeight;
	}
};

socket.on('message', (message) => {
	console.log(message);
	const html = Mustache.render(messageTemplate, {
		username  : message.username,
		message   : message.text,
		createdAt : moment(message.createdAt).format('hh:mm a')
	});
	messages.insertAdjacentHTML('beforeend', html);
	autoscroll();
});

socket.on('location', (url) => {
	console.log(url);
	const html = Mustache.render(locationTemplate, {
		username  : url.username,
		url       : url.url,
		createdAt : moment(url.createdAt).format('hh:mm a')
	});
	messages.insertAdjacentHTML('beforeend', html);
	autoscroll();
});

socket.on('roomData', ({ room, users }) => {
	const html = Mustache.render(sidebarTemplate, { room, users });
	document.querySelector('#sidebar').innerHTML = html;
});

messageForm.addEventListener('submit', (e) => {
	e.preventDefault();
	messageFormButton.setAttribute('disabled', 'disabled');
	const message = e.target.elements.message.value;
	socket.emit('sendMessage', message, (error) => {
		messageFormButton.removeAttribute('disabled');
		messageFormInput.value = '';
		messageFormInput.focus();
		if (error) {
			return console.log(error);
		}
		console.log('Message delivered');
	});
});

locationButton.addEventListener('click', () => {
	locationButton.setAttribute('disabled', 'disabled');
	if (!navigator.geolocation) {
		return alert('Geolocation is not supported by your browser');
	}
	navigator.geolocation.getCurrentPosition((position) => {
		socket.emit(
			'sendLocation',
			{
				latitude  : position.coords.latitude,
				longitude : position.coords.longitude
			},
			() => {
				locationButton.removeAttribute('disabled');
				messageFormInput.focus();
				console.log('Location shared');
			}
		);
	});
});

socket.emit('join', { username, room }, (error) => {
	if (error) {
		location.href = '/';
		alert(error);
	}
});
