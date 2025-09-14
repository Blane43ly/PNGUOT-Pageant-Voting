// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

// Vote schema
const voteSchema = new mongoose.Schema({
    voterId: { type: String, required: true, unique: true },
    mrId: String,
    msId: String
});
const Vote = mongoose.model('Vote', voteSchema);

// Contestant schema
const contestantSchema = new mongoose.Schema({
    id: String,
    name: String,
    faculty: String,
    course: String,
    gender: String // 'mr' or 'ms'
});
const Contestant = mongoose.model('Contestant', contestantSchema);

// Contestants data
const contestants = JSON.parse(fs.readFileSync(path.join(__dirname, 'contestants.json')));

// --- API Endpoints ---

// Cast a vote
app.post('/api/vote', async (req, res) => {
    const { voterId, mrId, msId } = req.body;
    if (!voterId || !mrId || !msId) {
        return res.status(400).json({ success: false, error: 'Missing fields' });
    }
    try {
        // Prevent double voting
        const existing = await Vote.findOne({ voterId });
        if (existing) {
            return res.status(400).json({ success: false, error: 'You have already voted.' });
        }
        await Vote.create({ voterId, mrId, msId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get results
app.get('/api/results', async (req, res) => {
    try {
        const votes = await Vote.find();
        const counts = {};
        contestants.forEach(c => counts[c.id] = { ...c, votes: 0 });

        votes.forEach(vote => {
            if (counts[vote.mrId]) counts[vote.mrId].votes += 1;
            if (counts[vote.msId]) counts[vote.msId].votes += 1;
        });

        res.json(Object.values(counts));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// Get contestants
app.get('/api/contestants', (req, res) => {
    res.json(contestants);
});

// --- Admin panel ---
app.use('/admin', basicAuth({
    users: { 'admin': 'yourpassword' },
    challenge: true
}));
app.use('/admin', express.static('frontend'));

// --- Home route ---
app.get('/', (req, res) => {
  res.send('Pageant Voting API is running!');
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
