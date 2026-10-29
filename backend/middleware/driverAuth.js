// Simple driver session auth middleware
// Checks req.session.driverId, loads driver, attaches to req.driver
// NOTE: For production, use a persistent session store (e.g., connect-mongo) and stronger security settings.
const Driver = require('../Model/Driver');

module.exports = async function driverAuth(req, res, next) {
  try {
    if (!req.session || !req.session.driverId) {
      return res.status(401).json({ error: 'Unauthorized. Please login as driver.' });
    }
    const driver = await Driver.findById(req.session.driverId);
    if (!driver) {
      return res.status(401).json({ error: 'Session invalid. Driver not found.' });
    }
    req.driver = driver;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Auth check failed', details: err.message });
  }
}
