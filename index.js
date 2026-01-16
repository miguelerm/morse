const morseMap = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  Ñ: "--.--",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
};

const accentMap = {
  á: "A",
  é: "E",
  í: "I",
  ó: "O",
  ú: "U",
  ü: "U",
  Á: "A",
  É: "E",
  Í: "I",
  Ó: "O",
  Ú: "U",
  Ü: "U",
};

const inputText = document.getElementById("inputText");
const tilesContainer = document.getElementById("tilesContainer");

document.getElementById("btnTranslate").onclick = translate;
document.getElementById("btnClear").onclick = () => {
  inputText.value = "";
  tilesContainer.innerHTML = "";
};

document.getElementById("btnDarkMode").onclick = () => {
  document.body.classList.toggle("dark");
};

function normalize(ch) {
  if (accentMap[ch]) return accentMap[ch];
  return ch.toUpperCase();
}

function translate() {
  tilesContainer.innerHTML = "";
  const text = inputText.value;

  for (const ch of text) {
    if (ch === " ") {
      const gap = document.createElement("div");
      gap.className = "space-gap";
      tilesContainer.appendChild(gap);
      continue;
    }

    const n = normalize(ch);
    if (!morseMap[n]) continue;

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = morseMap[n]
      .replace(/\./g, "·")
      .replace(/-/g, "—\u200A")
      .trim();

    const label = document.createElement("span");
    label.className = "tile-letter-label";
    label.textContent = n;

    tile.appendChild(label);
    tilesContainer.appendChild(tile);
  }
}

/* 🔊 Reproductor de Morse */

let morseAudioCtx = null;
let morseStopFlag = false;
const btnPlay = document.getElementById("btnPlay");

btnPlay.onclick = () => {
  if (btnPlay.dataset.state === "playing") {
    morseStopFlag = true;
    if (morseAudioCtx && morseAudioCtx.state !== "closed") {
      morseAudioCtx.close();
      morseAudioCtx = null;
    }
    btnPlay.textContent = "Escuchar Morse";
    btnPlay.classList.remove("btn-stop");
    btnPlay.classList.add("btn-play");
    btnPlay.dataset.state = "idle";
    return;
  }
  btnPlay.textContent = "Detener";
  btnPlay.classList.remove("btn-play");
  btnPlay.classList.add("btn-stop");
  btnPlay.dataset.state = "playing";
  morseStopFlag = false;
  const text = inputText.value;
  playMorse(text, () => {
    btnPlay.textContent = "Escuchar Morse";
    btnPlay.classList.remove("btn-stop");
    btnPlay.classList.add("btn-play");
    btnPlay.dataset.state = "idle";
  });
};


function playMorse(text, onEnd) {
  if (morseAudioCtx && morseAudioCtx.state !== "closed") {
    morseAudioCtx.close();
    morseAudioCtx = null;
  }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  morseAudioCtx = ctx;
  const dot = 0.1;
  const dash = dot * 3;
  const freq = 600;

  let t = ctx.currentTime;
  let totalDuration = 0;

  // Precompute events for async playback
  const events = [];
  for (const ch of text) {
    if (ch === " ") {
      totalDuration += dot * 7;
      continue;
    }
    const n = normalize(ch);
    const code = morseMap[n];
    if (!code) continue;
    for (const s of code) {
      events.push({ type: s, start: totalDuration });
      totalDuration += (s === "." ? dot : dash) + dot;
    }
    totalDuration += dot * 2;
  }

  let stopped = false;
  function stopPlayback() {
    if (ctx && ctx.state !== "closed") ctx.close();
    morseAudioCtx = null;
    stopped = true;
    if (typeof onEnd === "function") onEnd();
  }

  // Async playback to allow interruption
  (async function() {
    for (const [i, ev] of events.entries()) {
      if (morseStopFlag) {
        stopPlayback();
        return;
      }
      const now = ctx.currentTime;
      const wait = ev.start - (now - t);
      if (wait > 0) await new Promise(res => setTimeout(res, wait * 1000));
      if (morseStopFlag) {
        stopPlayback();
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const dur = ev.type === "." ? dot : dash;
      gain.gain.setValueAtTime(1, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
      await new Promise(res => setTimeout(res, dur * 1000));
    }
    stopPlayback();
  })();
}
