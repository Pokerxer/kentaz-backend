const AvailabilitySettings = require('../models/AvailabilitySettings');
const Booking = require('../models/Booking');

const DEFAULT_SLOTS = {
  therapy: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
  podcast: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
};

function dayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function dayEnd(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// GET /api/admin/availability/:serviceType
exports.getSettings = async (req, res) => {
  try {
    const { serviceType } = req.params;
    let settings = await AvailabilitySettings.findOne({ serviceType });
    if (!settings) {
      settings = await AvailabilitySettings.create({
        serviceType,
        workingDays: [1, 2, 3, 4, 5],
        timeSlots: DEFAULT_SLOTS[serviceType] || [],
        slotDuration: 60,
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/availability/:serviceType
exports.updateSettings = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { workingDays, timeSlots, slotDuration } = req.body;
    const update = {};
    if (workingDays !== undefined) update.workingDays = workingDays;
    if (timeSlots !== undefined) update.timeSlots = timeSlots;
    if (slotDuration !== undefined) update.slotDuration = slotDuration;
    const settings = await AvailabilitySettings.findOneAndUpdate(
      { serviceType },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/availability/:serviceType/block-date
exports.blockDate = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { date, reason } = req.body;
    const d = dayStart(date);
    // Remove any existing entry for this date first to avoid dupes
    await AvailabilitySettings.updateOne({ serviceType }, { $pull: { blockedDates: { date: { $gte: dayStart(d), $lte: dayEnd(d) } } } });
    const settings = await AvailabilitySettings.findOneAndUpdate(
      { serviceType },
      { $push: { blockedDates: { date: d, reason: reason || '' } } },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/availability/:serviceType/block-date
exports.unblockDate = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { date } = req.body;
    const d = dayStart(date);
    const settings = await AvailabilitySettings.findOneAndUpdate(
      { serviceType },
      { $pull: { blockedDates: { date: { $gte: d, $lte: dayEnd(d) } } } },
      { new: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/availability/:serviceType/block-slot
exports.blockSlot = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { date, time, reason } = req.body;
    const d = dayStart(date);
    // Remove existing entry for same date+time
    await AvailabilitySettings.updateOne(
      { serviceType },
      { $pull: { blockedSlots: { date: { $gte: d, $lte: dayEnd(d) }, time } } }
    );
    const settings = await AvailabilitySettings.findOneAndUpdate(
      { serviceType },
      { $push: { blockedSlots: { date: d, time, reason: reason || '' } } },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/availability/:serviceType/block-slot
exports.unblockSlot = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { date, time } = req.body;
    const d = dayStart(date);
    const settings = await AvailabilitySettings.findOneAndUpdate(
      { serviceType },
      { $pull: { blockedSlots: { date: { $gte: d, $lte: dayEnd(d) }, time } } },
      { new: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/availability/:serviceType/calendar?month=YYYY-MM
exports.getCalendar = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month param required (YYYY-MM)' });
    const [year, mon] = month.split('-').map(Number);
    const startOfMonth = new Date(year, mon - 1, 1);
    const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999);

    let [settings, bookings] = await Promise.all([
      AvailabilitySettings.findOne({ serviceType }),
      Booking.find({
        serviceType,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $ne: 'cancelled' },
      }).select('date timeSlot status user').populate('user', 'name email'),
    ]);

    if (!settings) {
      settings = await AvailabilitySettings.create({
        serviceType,
        workingDays: [1, 2, 3, 4, 5],
        timeSlots: DEFAULT_SLOTS[serviceType] || [],
        slotDuration: 60,
      });
    }

    res.json({ settings, bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
