const cleanNumber = (value, fallback = null) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const FALLBACK_LAT = 33.67941436242526;
const FALLBACK_LNG = 73.19485142813129;
const CAMPUS_NAME = process.env.CAMPUS_NAME?.trim() || 'Federal Urdu University of Arts, Sciences & Technology, Islamabad';
const CAMPUS_ADDRESS = process.env.CAMPUS_ADDRESS?.trim() || '';
const DEFAULT_LAT = cleanNumber(process.env.CAMPUS_LAT, FALLBACK_LAT);
const DEFAULT_LNG = cleanNumber(process.env.CAMPUS_LNG, FALLBACK_LNG);

if (!Number.isFinite(Number(process.env.CAMPUS_LAT)) || !Number.isFinite(Number(process.env.CAMPUS_LNG))) {
  console.warn(
    `CAMPUS_LAT/CAMPUS_LNG not set or invalid. Falling back to (${FALLBACK_LAT}, ${FALLBACK_LNG}). Set these env vars for accurate routes.`
  );
}

function getCampusLocation() {
  return {
    name: CAMPUS_NAME,
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    address: CAMPUS_ADDRESS
  };
}

module.exports = {
  CAMPUS_NAME,
  getCampusLocation
};

