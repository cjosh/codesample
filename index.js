const sqlite3 = require('sqlite3').verbose();
const extractMetadata = require('musicmetadata');
const path = require('path');
const fs = require('fs');
let stmt;
let music = "music.db";
const musicdb = new sqlite3.Database(music);
const basedir = __dirname;

const attemptMatch = (song) => {
    extractMetadata(fs.createReadStream(song), {
        duration: true,
    }, (err, metadata) => {
        if (err) {
            console.log(err);
        }
        const size = fs.statSync(song)['size'];
        musicdb.get("SELECT * FROM MUSIC WHERE size = ?", size, function(err2, row) {
            if(err2) {
                console.log(err2);
            }
            if(row && Math.abs((metadata.duration - row.duration)) <= 1) {
                musicdb.serialize(() => {
                    stmt = musicdb.prepare("UPDATE music SET location = ? WHERE id = ?");
                    stmt.run([song, 1]);
                });
                console.log('song already exists in database');
                process.exit()
            } else {
                const title = metadata.title || null;
                const artist = metadata.artist && metadata.artist[0] || null;
                const albumartist = metadata.albumartist && metadata.albumartist[0] || null;
                const album = metadata.album || null;
                const year = metadata.year || null;
                const trackno = metadata.track && metadata.track.no || null;
                const trackof = metadata.track && metadata.track.of || null;
                const genre = metadata.genre && metadata.genre[0] || null;
                const duration = metadata.duration || null;
                musicdb.serialize(() => {
                    stmt = musicdb.prepare("INSERT INTO MUSIC(size, title, artist, albumartist, album, year, trackno, trackof, genre, duration, location) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
                    stmt.run(size, title, artist, albumartist, album, year, trackno, trackof, genre, duration, song);
                    console.log('new song added to database', song);
                });
            }
        });
    });
}

if (process.argv && process.argv[2]) {
    musicdb.run("CREATE TABLE if not exists music (id INTEGER PRIMARY KEY, size INTEGER, title TEXT, artist TEXT, albumartist TEXT, album TEXT, year INTEGER, trackno INTEGER, trackof INTEGER, genre TEXT, duration INTEGER, location TEXT)");
    attemptMatch(path.join(basedir, process.argv[2]));
} else {
    console.log('please specify a music file name (ex: song.mp3)');
    process.exit()
}