const ws = new WebSocket('ws://192.168.0.150:8999');
let chart;

const sensorDropdown = document.createElement('select');
sensorDropdown.id = 'sensor-dropdown';

const button = document.createElement('button');
button.innerText = 'Get Sensor Readings';

const startTimePicker = document.createElement('input');
startTimePicker.type = 'datetime-local';
startTimePicker.id = 'start-time';

const endTimePicker = document.createElement('input');
endTimePicker.type = 'datetime-local';
endTimePicker.id = 'end-time';

const controlsWrapper = document.createElement('div');
controlsWrapper.id = 'controls-wrapper';
controlsWrapper.style.width = '100%';
controlsWrapper.appendChild(sensorDropdown);
controlsWrapper.appendChild(startTimePicker);
controlsWrapper.appendChild(endTimePicker);
controlsWrapper.appendChild(button);

const chartCanvas = document.createElement('canvas');
chartCanvas.id = 'chart';

const mainWrapper = document.getElementById('main-wrapper');
mainWrapper.appendChild(controlsWrapper);
mainWrapper.appendChild(chartCanvas);

ws.addEventListener('open', (event) => {
	ws.send(JSON.stringify({
		'client': '8999',
		'operation': 'connecting',
		'data': {}
	}));

	// Request sensor IDs on client load
	ws.send(JSON.stringify({
		'client': '8999',
		'operation': 'getSensors',
		'data': {}
	}));
});

ws.onmessage = message => {
	const data = JSON.parse(message.data);

	if (data.operation === 'sendSensors') {
		populateSensorDropdown(data.sensorIDs);
	} else if (data.operation === 'sendSensorReadings') {
		updateChart(data.sensorData);
	}

	//console.log(data);
}

button.addEventListener('click', () => {
	const selectedSensorId = document.getElementById('sensor-dropdown').value;
	const startTime = document.getElementById('start-time').value + ':00.000Z';
	const endTime = document.getElementById('end-time').value + ':00.000Z';

	ws.send(JSON.stringify({
		'client' : '8999',
		'operation' : 'getSensorReadings',
		'command': {
			'sensorId': selectedSensorId,
			'startTime': startTime,
			'endTime': endTime
		}
	}));
});

function populateSensorDropdown(sensorIDs) {
	const sensorDropdown = document.getElementById('sensor-dropdown');
	sensorIDs.forEach(sensorID => {
		const option = document.createElement('option');
		option.value = sensorID.sensorId;
		option.innerText = sensorID.sensorId;
		sensorDropdown.appendChild(option);
	});
}

function updateChart(sensorData) {
    const labels = sensorData.map(data => new Date(data.timestamp).toLocaleString());
    const tempData = sensorData.map(data => data.temp);
    const humData = sensorData.map(data => data.hum);
    const coData = sensorData.map(data => data.co);
    const lpgData = sensorData.map(data => data.lpg);
    const smokeData = sensorData.map(data => data.smoke);

    if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        scales: {
            x: {
                type: 'time',
                time: {
                    parser: 'date-fns',
                    tooltipFormat: 'PP',
                    unit: 'day'
                },
            },
        },
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperature',
                    data: tempData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                    yAxisID: 'y1'
                },
                {
                    label: 'Humidity',
                    data: humData,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    yAxisID: 'y2'
                },
                {
                    label: 'CO',
                    data: coData,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: false,
                    yAxisID: 'y3'
                },
                {
                    label: 'LPG',
                    data: lpgData,
                    borderColor: 'rgb(255, 205, 86)',
                    backgroundColor: 'rgba(255, 205, 86, 0.2)',
                    fill: false,
                    yAxisID: 'y4'
                },
                {
                    label: 'Smoke',
                    data: smokeData,
                    borderColor: 'rgb(153, 102, 255)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: false,
                    yAxisID: 'y5'
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y1: {
                    title: {
                        display: true,
                        text: 'Temperature'
                    }
                },
                y2: {
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Humidity'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                y3: {
                    title: {
                        display: true,
                        text: 'CO'
                    }
                },
                y4: {
                    title: {
                        display: true,
                        text: 'LPG'
                    }
                },
                y5: {
                    title: {
                        display: true,
                        text: 'Smoke'
                    }
                }
            }
        }        
    });
}


