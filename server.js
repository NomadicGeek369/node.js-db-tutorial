const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const cluster = require('cluster');
const os = require('os');
const globalSensorData = require('./global-sensor-data');
const sensors = require('./sensors.json');
const { Sensor } = require('./sensor-model');
require('dotenv').config();

const app = express();
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/react', express.static(path.join(__dirname, 'public/pages/react_test/build')));

const connectedClients = new Set();
const cores = os.cpus().length;

console.log(`Total CPUs (Logical cores): ${cores}`);
cluster.setupPrimary({ exec: path.join(__dirname, 'sensor.js') });
const workers = new Map();

const sensorsArray = Object.entries(sensors).map(([key, value]) => ({ key, ...value }));
Object.assign(globalSensorData, Object.fromEntries(sensorsArray.map(sensor => [sensor.key, sensor])));

const sensorsPerWorker = Math.ceil(sensorsArray.length / cores);

// Initializing sensors
for (let i = 0; i < cores; i++) {
	const workerSensors = sensorsArray.slice(i * sensorsPerWorker, (i + 1) * sensorsPerWorker);
	if (workerSensors.length === 0) continue;
	
	const worker = cluster.fork();
	worker.send({ update: 'sensor', data: workerSensors[0] });
	
	worker.on('message', (message) => {
		if (message.update === 'sensor') {
			updateSensors(message.data);
		}
	});
	
	workers.set(worker, workerSensors[0].port);
}

cluster.on('exit', (worker) => {
	console.log(`Worker ${worker.process.pid} killed. Starting new one!`);
	
	workers.delete(worker);
	const newWorker = cluster.fork();
	const sensor = sensorsArray.slice((workers.size - 1) * Math.floor(sensorsArray.length / cores), workers.size * Math.floor(sensorsArray.length / cores));
	newWorker.send({ update: 'sensor', data: sensor });
	
	newWorker.on('message', (message) => {
		if (message.update === 'sensor') {
			updateSensors(message.data);
		}
	});
	
	workers.set(newWorker, sensor.port);
});

function updateSensors(updatedSensor) {
	globalSensorData[updatedSensor.key] = updatedSensor;
}

const wss = new WebSocket.Server({ port: process.env.CLIENT_WS_PORT }, () => console.log(`WS Server is listening at ${process.env.CLIENT_WS_PORT}`));

setInterval(() => {
	for (const client of connectedClients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify({ devices: Object.values(globalSensorData) }));
		}
	}
}, process.env.CLIENT_UPDATE_FREQUENCY);

// Cients connected
wss.on('connection', (ws) => {
	connectedClients.add(ws);
	
	ws.on('message', async (data) => {
		if (ws.readyState !== ws.OPEN) return;
		
		try {
			data = JSON.parse(data);
			
			if (data.operation === 'function') {
				const sensorToUpdate = sensorsArray.find(sensor => sensor.key === data.command.recipient);
				console.log('sensorToUpdate', sensorToUpdate);
				if (sensorToUpdate) {
					const targetWorker = [...workers.entries()].find(([, port]) => port === sensorToUpdate.port)?.[0];
					if (targetWorker) {
						targetWorker.send({ update: 'command', data: `${data.command.message.key}=${data.command.message.value}` });
					}
				}
			} else if (data.operation === 'getSensors') {
				try {
					const sensorIDs = await Sensor.getAllSensorIDs();
					console.log(`Retrieved unique sensorIDs: ${JSON.stringify(sensorIDs, null, 2)}`);

					ws.send(JSON.stringify({
						'operation': 'sendSensors',
						'sensorIDs': sensorIDs
					}));
				} catch (err) {
					console.error(`Error getting sensorIDs: ${err}`);
				}
			} else if (data.operation === 'getSensorReadings') {
				try {
					const { sensorId, startTime, endTime } = data.command;
					const sensorData = await Sensor.getSensorDataByIdBetweenTimestamps(sensorId, startTime, endTime);
					console.log(`Retrieved sensor data for sensorId "${sensorId}" between "${startTime}" and "${endTime}": ${JSON.stringify(sensorData, null, 2)}`);

					ws.send(JSON.stringify({
						'operation': 'sendSensorReadings',
						'sensorData': sensorData
					}));
				} catch (err) {
					console.error(`Error getting sensor data: ${err}`);
				}
			}
		} catch (error) {}	
	});
	
	ws.on('close', () => {
		connectedClients.delete(ws);
	});
});

app.get('/client', (_req, res) => { res.sendFile(path.resolve(__dirname, './public/pages/client1/client.html')); });
app.get('/client2', (_req, res) => { res.sendFile(path.resolve(__dirname, './public/pages/client2/client.html')); });
app.get('/react/*', (_req, res) => {res.sendFile(path.resolve(__dirname, './public/pages/react_test/build/index.html')); });
app.listen(process.env.CLIENT_HTTP_PORT, () => { console.log(`HTTP server starting on ${process.env.CLIENT_HTTP_PORT} with process ID ${process.pid}`); });
