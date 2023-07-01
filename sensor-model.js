const mongoose = require('./mongoose-config');

const sensorSchema = new mongoose.Schema({
    sensorId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    // Add other sensor values as needed
    temp: Number,
    hum: Number,
    co: Number,
    lpg: Number,
    smoke: Number,
});

sensorSchema.statics.getAllSensorsData = async function () {
    try {
        const sensors = await this.find({}).exec();
        return sensors;
    } catch (err) {
        console.error(`Error getting sensors: ${err}`);
        throw err;
    }
};

sensorSchema.statics.getAllSensorIDs = async function () {
    try {
        const sensorIDAggregation = [
            {
                $group: {
                    _id: '$sensorId'
                }
            },
            {
                $project: {
                    _id: 0,
                    sensorId: '$_id'
                }
            }
        ];

        const sensorIDs = await this.aggregate(sensorIDAggregation).exec();
        return sensorIDs;
    } catch (err) {
        console.error(`Error getting sensorIDs: ${err}`);
        throw err;
    }
};

sensorSchema.statics.getSensorDataById = async function (sensorId) {
    try {
        const sensorData = await this.find({ sensorId }).exec();
        return sensorData;
    } catch (err) {
        console.error(`Error getting sensor data for sensorId "${sensorId}": ${err}`);
        throw err;
    }
};

sensorSchema.statics.getSensorDataByIdBetweenTimestamps = async function (sensorId, startTime, endTime) {
    try {
        const sensorData = await this.find({
            sensorId,
            timestamp: {
                $gte: new Date(startTime),
                $lte: new Date(endTime),
            },
        }).exec();
        return sensorData;
    } catch (err) {
        console.error(`Error getting sensor data for sensorId "${sensorId}" between timestamps: ${err}`);
        throw err;
    }
};

sensorSchema.statics.saveSensorData = function (sensorsObj) {
    this.create(sensorsObj)
        .then(() => {
            console.error(`Sensor data saved successfully: ${JSON.stringify(sensorsObj)}`);
        })
        .catch((err) => {
            console.error(`Error saving sensor data: ${err}`);
            throw err;
        });

    return Promise.resolve(true);
};

const Sensor = mongoose.model('Sensor', sensorSchema);

module.exports = {
    mongoose,
    Sensor
};
