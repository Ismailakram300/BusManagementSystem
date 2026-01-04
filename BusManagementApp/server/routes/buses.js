const express = require('express');
const Bus = require('../models/Bus');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { CAMPUS_NAME, getCampusLocation } = require('../config/campus');

const router = express.Router();

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const parseLocation = (location, fallbackName) => {
  if (!location) {
    return null;
  }

  const latitude = toNumber(location.latitude);
  const longitude = toNumber(location.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    name: cleanText(location.name) || fallbackName || 'Unnamed location',
    latitude,
    longitude,
    address: cleanText(location.address)
  };
};

const parseStops = (stops = []) => {
  if (!Array.isArray(stops)) {
    return [];
  }

  return stops
    .map((stop, index) => {
      const latitude = toNumber(stop?.latitude);
      const longitude = toNumber(stop?.longitude);

      if (latitude === null || longitude === null || !stop?.name) {
        return null;
      }

      return {
        name: cleanText(stop.name) || `Stop ${index + 1}`,
        latitude,
        longitude,
        arrivalTime: cleanText(stop.arrivalTime),
        description: cleanText(stop.description),
        order: typeof stop.order === 'number' ? stop.order : index
      };
    })
    .filter(Boolean);
};

const ensureCampusStart = (busLike) => {
  if (!busLike) {
    return busLike;
  }
  if (!busLike.startLocation) {
    busLike.startLocation = getCampusLocation();
  } else if (!busLike.startLocation.name) {
    busLike.startLocation.name = CAMPUS_NAME;
  }
  busLike.startsFromCampus = true;
  return busLike;
};

const sortStops = (stops = []) => [...stops].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

const serializeBus = (busDoc) => {
  if (!busDoc) {
    return null;
  }
  const bus = busDoc.toObject ? busDoc.toObject() : busDoc;
  ensureCampusStart(bus);
  bus.stops = sortStops(bus.stops);
  return bus;
};

const buildRoutePayload = (input = {}, existingRoute = {}) => {
  const endLocationInput = input.endLocation ?? existingRoute.endLocation;
  const endLocation = parseLocation(endLocationInput, cleanText(existingRoute.endLocation?.name) || 'Destination');

  if (!endLocation) {
    throw new Error('INVALID_ROUTE_LOCATIONS');
  }

  return {
    startsFromCampus: true,
    startLocation: getCampusLocation(),
    endLocation
  };
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const buses = await Bus.find().sort({ routeName: 1 });
    return res.json({ buses: buses.map(serializeBus) });
  } catch (error) {
    console.error('Failed to fetch buses', error);
    
    // Handle database connection errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ message: 'Database unavailable. Please try again later.' });
    }
    
    return res.status(500).json({ message: 'Unable to fetch bus list' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    return res.json({ bus: serializeBus(bus) });
  } catch (error) {
    console.error('Failed to fetch bus', error);
    
    // Handle database connection errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ message: 'Database unavailable. Please try again later.' });
    }
    
    return res.status(500).json({ message: 'Unable to fetch bus' });
  }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { routeName, busNumber, driverName, driverPhone, departureTime, status, currentStop } = req.body;

    if (!routeName || !busNumber || !driverName) {
      return res.status(400).json({ message: 'Route name, bus number and driver name are required' });
    }

    let routePayload;
    try {
      routePayload = buildRoutePayload({
        endLocation: req.body.endLocation
      });
    } catch (error) {
      if (error.message === 'INVALID_ROUTE_LOCATIONS') {
        return res.status(400).json({ message: 'Start and end locations with valid coordinates are required' });
      }
      throw error;
    }

    const bus = await Bus.create({
      routeName,
      busNumber,
      driverName,
      driverPhone,
      departureTime,
      status,
      currentStop,
      ...routePayload,
      stops: parseStops(req.body.stops),
      lastUpdated: new Date()
    });

    return res.status(201).json({ bus });
  } catch (error) {
    console.error('Failed to create bus', error);
    
    // Handle database connection errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ message: 'Database unavailable. Please try again later.' });
    }
    
    const statusCode = error.code === 11000 ? 409 : 500;
    const message = error.code === 11000 ? 'Bus number already exists' : 'Unable to create bus';
    return res.status(statusCode).json({ message });
  }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const existingBus = await Bus.findById(req.params.id);
    if (!existingBus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const updates = {
      ...req.body,
      lastUpdated: new Date()
    };

    if ('endLocation' in req.body) {
      delete updates.endLocation;
      try {
        Object.assign(
          updates,
          buildRoutePayload(
            {
              endLocation: req.body.endLocation
            },
            {
              endLocation: existingBus.endLocation
            }
          )
        );
      } catch (error) {
        if (error.message === 'INVALID_ROUTE_LOCATIONS') {
          return res.status(400).json({ message: 'Destination with valid coordinates is required' });
        }
        throw error;
      }
    } else {
      // Ensure campus start persists even if destination isn't updated
      Object.assign(updates, { startLocation: getCampusLocation(), startsFromCampus: true });
    }

    if ('stops' in req.body) {
      delete updates.stops;
      updates.stops = parseStops(req.body.stops);
    }

    const bus = await Bus.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    return res.json({ bus: serializeBus(bus) });
  } catch (error) {
    console.error('Failed to update bus', error);
    
    // Handle database connection errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ message: 'Database unavailable. Please try again later.' });
    }
    
    return res.status(500).json({ message: 'Unable to update bus' });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    return res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Failed to delete bus', error);
    return res.status(500).json({ message: 'Unable to delete bus' });
  }
});

module.exports = router;
