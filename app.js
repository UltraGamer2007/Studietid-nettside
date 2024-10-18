const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Koble til SQLite-databasen 'studietidBrukere'
const db = new sqlite3.Database('./studietidBrukere.db', (err) => {
    if (err) {
        console.error('Feil ved tilkobling til SQLite:', err.message);
    } else {
        console.log('Tilkoblet SQLite-databasen: studietidBrukere');
    }
});

// Opprett tabellen hvis den ikke finnes
db.run(`CREATE TABLE IF NOT EXISTS brukere (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brukernavn TEXT NOT NULL,
    passord TEXT NOT NULL,
    leder INTEGER NOT NULL
)`);

const staticPath = path.join(__dirname, './public');
const app = express();

// Middleware for statiske filer og URL-dekoding
app.use(express.static(staticPath));
app.use(express.urlencoded({ extended: false }));

// Startside (Logg inn siden)
app.get("/", (req, res) => {
    res.sendFile(staticPath + "/index.html");
});

// Håndter innlogging
app.post('/login', (req, res) => {
    const { brukernavn, passord } = req.body;

    // Søk etter brukeren i databasen
    db.get('SELECT * FROM brukere WHERE brukernavn = ? AND passord = ?', [brukernavn, passord], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Serverfeil');
        } else if (row) {
            // Hvis brukernavn og passord er riktig
            console.log('Innlogging vellykket for:', brukernavn);
            res.redirect('/StudietidElev.html'); // Omdirigerer til StudietidElev.html
        } else {
            // Hvis brukernavn eller passord er feil
            console.log('Feil brukernavn eller passord');
            res.status(401).send('Feil brukernavn eller passord');
        }
    });
});

// Håndter forespørsel om opprettelse av brukernavn og passord
app.post('/opprett_bruker', (req, res) => {
    const { brukernavn, passord, leder } = req.body;
    const erLeder = leder === 'on' ? 1 : 0; // Konverter checkbox-verdi til 1 eller 0

    // Sett inn i databasen
    db.run('INSERT INTO brukere (brukernavn, passord, leder) VALUES (?, ?, ?)', [brukernavn, passord, erLeder], (err) => {
        if (err) {
            console.error('Feil ved innsetting i databasen:', err.message);
            res.status(500).send('Serverfeil ved lagring av bruker');
        } else {
            console.log('Ny bruker lagt til:', brukernavn);
            res.redirect('/'); // Returner til hovedsiden etter innsendelse
        }
    });
});

// Start serveren
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
