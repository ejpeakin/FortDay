// =====================================================================
//  Team voice chat (online Duos, Trios and Squads with friends from your room).
//  Each player opens a voice link through the same PeerJS service the online games use, tells their teammates
//  its id through the game's own messages (the host passes it only to the same team), and teammates call each
//  other straight away: browser to browser, audio only. Bots can't talk, so it only starts with human teammates.
//  Push to talk (hold T by default) or open mic, chosen in Settings. The microphone is only asked for when you
//  first talk, and it is let go the moment the match ends.
// =====================================================================
const VOICE_MODES = [['ptt', 'Push to talk'], ['open', 'Open mic'], ['off', 'Off']];
const Voice = {
  peer: null, pid: '', local: null, silent: null, mic: null, micAsk: null, ctx: null,
  pids: new Map(), calls: new Map(), annT: 0, talking: false, note: '', denied: false,
  mode() { const m = Profile.d.voice; return VOICE_MODES.some(v => v[0] === m) ? m : 'ptt'; },
  mates() { return player ? actors.filter(a => a !== player && a.friend && a.team === player.team) : []; },
  wanted() { return Net.inMatch && Match.state === 'play' && isTeamMode(Match.mode) && this.mode() !== 'off' && this.mates().length > 0; },
  init() {
    const box = $('voiceSeg'); if (!box) return;
    box.innerHTML = VOICE_MODES.map(([k, n]) => `<button type="button" data-voice="${k}">${n}</button>`).join('');
    box.addEventListener('click', e => { const b = e.target.closest('[data-voice]'); if (!b) return; Profile.d.voice = b.dataset.voice; Profile.save(); this.renderSettings(); if (this.mode() === 'off') this.stop(); });
    $('voiceVol').value = Profile.d.voiceVol ?? 1; $('voiceVol').addEventListener('input', e => { Profile.d.voiceVol = +e.target.value; Profile.save(); for (const c of this.calls.values()) if (c.el) c.el.volume = Profile.d.voiceVol; });
    this.renderSettings();
  },
  renderSettings() {
    const box = $('voiceSeg'); if (!box) return;
    for (const b of box.children) b.classList.toggle('on', b.dataset.voice === this.mode());
    $('voiceKey').textContent = Keys.of('talk');
  },
  // ---- the link to the voice service and the audio we send (silence until you talk)
  ac() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return this.ctx; },
  localStream() {
    if (this.local) return this.local;
    const ctx = this.ac(); if (!ctx) return null;
    const dst = ctx.createMediaStreamDestination(); this.silent = dst.stream.getAudioTracks()[0];
    this.local = new MediaStream([this.silent]); return this.local;
  },
  start() {
    if (this.peer || typeof Peer !== 'function') return;
    let peer; try { peer = new Peer(undefined, P2P.opts()); } catch (e) { this.note = 'Voice is not available on this browser.'; return; }
    this.peer = peer;
    peer.on('open', id => { if (this.peer !== peer) return; this.pid = id; this.annT = 0; });
    peer.on('call', call => {
      const id = call.metadata && call.metadata.id, a = this.mates().find(m => m.id === id);
      if (!a || !this.localStream()) { try { call.close(); } catch (e) { /* gone */ } return; }
      call.answer(this.local); this.hook(id, call);
    });
    peer.on('error', e => { if (this.peer !== peer) return; if (e && e.type === 'peer-unavailable') return; this.note = 'Voice could not connect.'; });
    peer.on('disconnected', () => { if (this.peer === peer && !peer.destroyed) try { peer.reconnect(); } catch (e) { /* calls already made carry on */ } });
  },
  stop() {
    for (const c of this.calls.values()) this.drop(c);
    this.calls.clear(); this.pids.clear();
    if (this.peer) { try { this.peer.destroy(); } catch (e) { /* already gone */ } }
    this.peer = null; this.pid = ''; this.talking = false;
    if (this.mic) { this.mic.stop(); this.mic = null; }   // let go of the microphone
    this.micAsk = null; this.render();
  },
  drop(c) { try { c.call.close(); } catch (e) { /* gone */ } if (c.el) { c.el.pause(); c.el.srcObject = null; } if (c.src) try { c.src.disconnect(); } catch (e) { /* gone */ } },
  // a teammate told us their voice id (only ever from our own team, checked again here)
  got(id, pid) {
    pid = String(pid || ''); if (!/^[\w-]{4,64}$/.test(pid)) return;
    if (!this.mates().some(m => m.id === id)) return;
    if (this.pids.get(id) !== pid) { this.pids.set(id, pid); const c = this.calls.get(id); if (c) { this.drop(c); this.calls.delete(id); } }
  },
  call(a, pid) { if (!this.peer || !this.localStream()) return; const call = this.peer.call(pid, this.local, { metadata: { id: player.id } }); if (call) this.hook(a.id, call); },
  hook(id, call) {
    const c = { call, el: null, an: null, buf: null, lvl: 0, t0: performance.now() }; this.calls.set(id, c);
    if (this.mic) this.sendTrack(c, this.mic);
    call.on('stream', s => {
      if (c.el) return;
      c.el = new Audio(); c.el.autoplay = true; c.el.srcObject = s; c.el.volume = Profile.d.voiceVol ?? 1; c.el.play().catch(() => {});
      const ctx = this.ac(); if (ctx) { try { c.src = ctx.createMediaStreamSource(s); c.an = ctx.createAnalyser(); c.an.fftSize = 256; c.buf = new Uint8Array(c.an.fftSize); c.src.connect(c.an); } catch (e) { c.an = null; } }
    });
    const gone = () => { if (this.calls.get(id) === c) { this.drop(c); this.calls.delete(id); } };
    call.on('close', gone); call.on('error', gone);
  },
  sendTrack(c, track) { const pc = c.call && c.call.peerConnection; if (!pc) return; const s = pc.getSenders().find(x => x.track && x.track.kind === 'audio') || pc.getSenders()[0]; if (s) s.replaceTrack(track).catch(() => {}); },
  // the first time you talk the browser asks for the microphone
  askMic() {
    if (this.mic || this.micAsk || this.denied || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    this.micAsk = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(s => {
      this.micAsk = null; if (!this.peer) { s.getTracks().forEach(t => t.stop()); return; }
      this.mic = s.getAudioTracks()[0]; this.mic.enabled = this.talking;
      for (const c of this.calls.values()) this.sendTrack(c, this.mic);
    }).catch(() => { this.micAsk = null; this.denied = true; this.note = 'Microphone blocked. Allow it in your browser to talk to your team.'; HUD.toast(this.note); });
  },
  level(c) { if (!c.an) return 0; c.an.getByteTimeDomainData(c.buf); let m = 0; for (let i = 0; i < c.buf.length; i += 4) m = Math.max(m, Math.abs(c.buf[i] - 128)); return m / 128; },
  speaking(id) { const c = this.calls.get(id); return !!c && c.lvl > 0.06; },
  linked(id) { const c = this.calls.get(id); return !!c && !!c.el; },
  // ---- every frame of a match
  update(dt) {
    if (!this.wanted()) { if (this.peer || this.mic) this.stop(); $('voiceTag').hidden = true; return; }
    this.start(); if (!this.pid) { this.render(); return; }
    // tell teammates our voice id now and then (the host sends it only to its own team)
    if ((this.annT -= dt) <= 0) {
      const mates = this.mates(), all = mates.every(m => this.linked(m.id)); this.annT = all ? 12 : 2.5;
      const msg = { k: 'vid', id: player.id, pid: this.pid };
      if (Net.isHost) { for (const [cid, a] of Net.humans) if (a.team === player.team) Net.send(cid, msg); } else Net.emit(msg);
    }
    // the teammate with the lower number places the call, so each pair is linked once; a call that never connects is tried again
    for (const a of this.mates()) {
      const pid = this.pids.get(a.id), c = this.calls.get(a.id);
      if (c && !c.el && performance.now() - c.t0 > 12000) { this.drop(c); this.calls.delete(a.id); }
      if (pid && !this.calls.has(a.id) && player.id < a.id) this.call(a, pid);
    }
    const want = this.mode() === 'open' || (this.mode() === 'ptt' && Keys.held('talk', Input.keys) && !Chat.on && !Match.paused);
    if (want) this.askMic();
    this.talking = want && !!this.mic; if (this.mic) this.mic.enabled = this.talking;
    for (const c of this.calls.values()) c.lvl = this.level(c);
    this.render();
  },
  render() {
    const tag = $('voiceTag'); if (!tag) return;
    if (!this.wanted()) { tag.hidden = true; return; }
    const n = this.mates().filter(m => this.linked(m.id)).length, key = Keys.of('talk');
    tag.hidden = false; tag.classList.toggle('live', this.talking);
    const txt = this.talking ? 'Talking to your team' : !this.pid ? 'Voice: connecting…' : n === 0 ? 'Voice: waiting for teammates' : this.mode() === 'open' ? 'Open mic · ' + n + ' teammate' + (n > 1 ? 's' : '') : 'Hold ' + key + ' to talk · ' + n + ' teammate' + (n > 1 ? 's' : '');
    if (tag.textContent !== txt) tag.textContent = txt;
  },
};
