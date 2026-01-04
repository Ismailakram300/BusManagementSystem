const mongoose = require('mongoose');
const { getCampusLocation } = require('../config/campus');

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const stopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    arrivalTime: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const busSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      trim: true
    },
    busNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    driverName: {
      type: String,
      required: true,
      trim: true
    },
    driverPhone: {
      type: String,
      trim: true
    },
    departureTime: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['On Time', 'Delayed', 'Cancelled'],
      default: 'On Time'
    },
    currentStop: {
      type: String,
      trim: true
    },
    startsFromCampus: {
      type: Boolean,
      default: true,
      immutable: true
    },
    startLocation: {
      type: locationSchema,
      default: () => getCampusLocation()
    },
    endLocation: locationSchema,
    stops: {
      type: [stopSchema],
      default: []
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bus', busSchema);
