const { spawn } = require("child_process");
const path = require("path");

const BASE = path.join(__dirname, "../assets/sounds");

const sounds = {
  bg: path.join(BASE, "bg.wav"),
  spin: path.join(BASE, "spin.wav"),
  win: path.join(BASE, "win.wav")
};

let current = null;

function play(rtmpUrl, file, loop = false) {
  stop();

  current = spawn(
    "ffmpeg",
    [
      ...(loop ? ["-stream_loop", "-1"] : []),
      "-re",
      "-i",
      file,
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-f",
      "flv",
      rtmpUrl
    ],
    { stdio: "ignore" }
  );
}

function stop() {
  if (current) {
    current.kill("SIGKILL");
    current = null;
  }
}

module.exports = {
  play,
  stop,
  sounds
};
