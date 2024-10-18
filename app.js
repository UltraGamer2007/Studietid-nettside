const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database('./studietidBrukere.db', (err) => {
    if (err) {
        console.error('Feil ved tilkobling til SQLite:', err.message);
    } else {
        console.log('Tilkoblet SQLite-databasen: studietidBrukere');
    }
});


db.run(`CREATE TABLE IF NOT EXISTS brukere (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brukernavn TEXT NOT NULL,
    passord TEXT NOT NULL,
    leder INTEGER NOT NULL
)`);

const staticPath = path.join(__dirname, './public');
const app = express();


app.use(express.static(staticPath));
app.use(express.urlencoded({ extended: false }));


app.get("/", (req, res) => {
    res.sendFile(staticPath + "/index.html");
});


app.post('/login', (req, res) => {
    const { brukernavn, passord } = req.body;

    
    db.get('SELECT * FROM brukere WHERE brukernavn = ? AND passord = ?', [brukernavn, passord], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Serverfeil');
        } else if (row) {
           
            console.log('Innlogging vellykket for:', brukernavn);
            res.redirect('/StudietidElev.html'); 
        } else {
           
            console.log('Feil brukernavn eller passord');
            res.status(401).send('Feil brukernavn eller passord');
        }
    });
});


app.post('/opprett_bruker', (req, res) => {
    const { brukernavn, passord, leder } = req.body;
    const erLeder = leder === 'on' ? 1 : 0;

   
    db.run('INSERT INTO brukere (brukernavn, passord, leder) VALUES (?, ?, ?)', [brukernavn, passord, erLeder], (err) => {
        if (err) {
            console.error('Feil ved innsetting i databasen:', err.message);
            res.status(500).send('Serverfeil ved lagring av bruker');
        } else {
            console.log('Ny bruker lagt til:', brukernavn);
            res.redirect('/'); 
        }
    });
});

// Start serveren
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
