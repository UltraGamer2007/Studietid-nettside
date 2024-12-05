const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

// Initialize express app
const app = express();
const port = 3000;

// Set up SQLite3 database
const db = new sqlite3.Database('./studietidbrukere.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create tables if they do not exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS brukere (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brukernavn TEXT NOT NULL UNIQUE,
            passord TEXT NOT NULL,
            er_leder INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS aktivitet (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brukernavn TEXT NOT NULL,
            fag TEXT NOT NULL,
            rom TEXT NOT NULL,
            tidspunkt DATETIME DEFAULT CURRENT_TIMESTAMP,
            status REAL DEFAULT 0,
            FOREIGN KEY (brukernavn) REFERENCES brukere(brukernavn)
        )
    `);
});

// Middleware to parse POST request data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files (HTML, CSS, JS)

// Serve index page (Login)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve "Opprett Bruker" page
app.get('/OpprettBruker.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'OpprettBruker.html'));
});

// Serve studietid for elev
app.get('/studietidelev.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'studietidelev.html'));
});

// Serve studietid for leder
app.get('/studietidleder.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'studietidleder.html'));
});

// Handle login
app.post('/login', (req, res) => {
    const { brukernavn, passord } = req.body;

    const query = `SELECT * FROM brukere WHERE brukernavn = ? AND passord = ?`;
    db.get(query, [brukernavn, passord], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).send('Database error');
        }
        if (row) {
            if (row.er_leder === 1) {
                res.redirect('/studietidleder.html');
            } else {
                res.redirect('/studietidelev.html');
            }
        } else {
            res.status(401).send('Feil brukernavn eller passord');
        }
    });
});

// Handle user registration
app.post('/opprett_bruker', (req, res) => {
    const { brukernavn, passord, leder } = req.body;
    const erLeder = leder ? 1 : 0;

    const query = `INSERT INTO brukere (brukernavn, passord, er_leder) VALUES (?, ?, ?)`;
    db.run(query, [brukernavn, passord, erLeder], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).send('Feil ved registrering.');
        }
        res.redirect('/');  // Redirect to login page after successful registration
    });
});

// Handle registration of study time (aktivitet)
app.post('/registrer_studietid', (req, res) => {
    const { brukernavn, fag, rom } = req.body;

    // Log data to troubleshoot issues
    console.log('Received Study Time Registration:', req.body);

    if (!brukernavn || !fag || !rom) {
        return res.status(400).send('Alle feltene må fylles ut.');
    }

    const insertQuery = `
        INSERT INTO aktivitet (brukernavn, fag, rom, status) VALUES (?, ?, ?, ?)
    `;
    const status = 0;  // Standard status for ny studietid (under godkjenning)
    db.run(insertQuery, [brukernavn, fag, rom, status], function (err) {
        if (err) {
            console.error('Feil ved registrering av studietid:', err.message);
            return res.status(500).send('Feil ved registrering.');
        }
        res.redirect('/studietidelev.html');  // Redirect to page with study time registration view
    });
});

// Fetch all study times (aktivitet) for a specific user
app.get('/hent_studietid', (req, res) => {
    const brukernavn = req.query.brukernavn; // Get username from query parameters

    const query = `SELECT * FROM aktivitet WHERE brukernavn = ? ORDER BY tidspunkt DESC`;
    db.all(query, [brukernavn], (err, rows) => {
        if (err) {
            console.error('Feil ved henting av studietid:', err.message);
            return res.status(500).send('Feil ved henting av studietid.');
        }
        res.json(rows); // Return as JSON data to be used in frontend
    });
});

// Fetch all study times (aktivitet) for approval (for leader)
app.get('/hent_studietid_for_godkjenning', (req, res) => {
    const query = `SELECT * FROM aktivitet WHERE status = 0 ORDER BY tidspunkt DESC`;
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Feil ved henting av studietid for godkjenning:', err.message);
            return res.status(500).send('Feil ved henting av studietid for godkjenning.');
        }
        res.json(rows); // Return as JSON data to be used in frontend
    });
});

// Handle study time approval for leder
app.post('/godkjenn_studietid', (req, res) => {
    const { aktivitetId } = req.body;

    const updateQuery = `
        UPDATE aktivitet SET status = 1 WHERE id = ?
    `;
    db.run(updateQuery, [aktivitetId], function (err) {
        if (err) {
            console.error('Feil ved godkjenning av studietid:', err.message);
            return res.status(500).send('Feil ved godkjenning.');
        }
        res.send('Studietid godkjent.');
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
