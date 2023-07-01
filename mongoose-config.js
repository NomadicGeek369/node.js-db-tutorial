const mongoose = require('mongoose');
require('dotenv').config();

mongoose.set('debug', false);
mongoose.connect(`mongodb://${process.env.MONGODB_IP}:${process.env.MONGODB_PORT}/${process.env.MONGODB_NAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: process.env.MONGODB_MAX_POOL,
    serverSelectionTimeoutMS: 10000
});

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.log('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

module.exports = mongoose;
