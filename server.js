const koa = require('koa');
const _ = require('koa-route');
const mm = require('musicmetadata');
const request = require('request');
const sqlite = require('sqlite3');
const allora = require('allora');

const app = koa();

app.use(require("koa-logger")())

app.use(require('koa-cors')());

var db = allora(new sqlite.Database('songs.db'));

app.use(require('koa-session')(app));

app.use(require('koa-static')(__dirname));

app.use(_.get("/init", function *() {
  yield db.run(`CREATE TABLE songs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    metadata TEXT NOT NULL
  )`);
  yield db.run(`CREATE TABLE users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL DEFAULT "Anon",
    token VARCHAR(255) NOT NULL
  )`);
  yield db.run(`CREATE TABLE votes(
    user_id INTEGER REFERENCES users(id),
    song_id INTEGER REFERENCES songs(id)
  )`);
  this.body = "DONE";
}));

// Login
app.use(function *(next) {
  if (this.cookies.get("id")) {
    this.user = yield pify(db.get)("SELECT * FROM users WHERE id = ?", [this.cookies.get('id')]);
    yield next();
  } else {
    this.status = 403;
  }
});

app.use(_.post("/songs", function *() {
  const songs = yield pify(db.all)("SELECT songs.*, COUNT(votes.user_id) AS vote_count, MAX(votes.user_id = ?) AS has_voted FROM songs LEFT JOIN votes ON votes.song_id = songs.id GROUP BY songs.id", [this.cookies.get('id')]);
  this.body = JSON.stringify(songs);
}));

app.listen(process.env.PORT || 9998)
