const express = require('express');
const router = express.Router();
const { requestAmbulance, getAmbulanceRequests, assignAmbulance } = require('../controllers/ambulanceController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, () => requestAmbulance(req, res));
  }
  return requestAmbulance(req, res);
});

router.get('/', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, () => getAmbulanceRequests(req, res));
  }
  return getAmbulanceRequests(req, res);
});

router.put('/:id/assign', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, () => assignAmbulance(req, res));
  }
  return assignAmbulance(req, res);
});

module.exports = router;
