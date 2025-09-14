// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const basicAuth = require('express-basic-auth');

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
        // Aggregate votes for each contestant
        const votes = await Vote.find();
        const counts = {};

        // You should seed the contestants in DB or hardcode them here
        // For demo, use the same contestants as in your frontend
        const allContestants = [
            // Sciences
            { id: 'sci-mr-1', name: 'Jack Laho', faculty: 'Sciences', course: 'BSCS-3', gender: 'mr' },
            { id: 'sci-ms-1', name: 'Calessah Mukekit', faculty: 'Sciences', course: 'BFTE-3', gender: 'ms' },
            // Engineering
            { id: 'eng-mr-1', name: 'Moses Nathan', faculty: 'Engineering', course: 'BEME-4', gender: 'mr' },
            { id: 'eng-ms-1', name: 'Joy Iwais', faculty: 'Engineering', course: 'BEEL-4', gender: 'ms' },
            // Built Environment
            { id: 'env-mr-1', name: 'Darius Yeou', faculty: 'Built Environment', course: 'BACM-3', gender: 'mr' },
            { id: 'env-ms-1', name: 'Linda Oa', faculty: 'Built Environment', course: 'BPST-1', gender: 'ms' },
            // Humanities
            { id: 'hum-mr-1', name: 'Craig Posa', faculty: 'Humanities', course: 'BACD-2', gender: 'mr' },
            { id: 'hum-ms-1', name: 'Abigail Kaisi Uia', faculty: 'Humanities', course: 'BBAE-3', gender: 'ms' },
            // Natural Resources
            { id: 'res-mr-1', name: 'Joel Toi', faculty: 'Natural Resources', course: 'BSCF-3', gender: 'mr' },
            { id: 'res-ms-1', name: 'Georgina Roy', faculty: 'Natural Resources', course: 'BSAG-3', gender: 'ms' }
        ];

        // Initialize counts
        allContestants.forEach(c => counts[c.id] = { ...c, votes: 0 });

        // Count votes
        votes.forEach(vote => {
            if (counts[vote.mrId]) counts[vote.mrId].votes += 1;
            if (counts[vote.msId]) counts[vote.msId].votes += 1;
        });

        // Return as array, sorted by votes
        const results = Object.values(counts).sort((a, b) => b.votes - a.votes);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// --- Admin panel ---
app.use('/admin', basicAuth({
    users: { 'admin': 'yourpassword' },
    challenge: true
}));
app.use('/admin', express.static('frontend'));

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
