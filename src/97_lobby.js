// =====================================================================
//  Lobby: 3D character stage, play options, locker, pass, career
// =====================================================================
// the move each skin shows off with when you equip it (or try it on) in the lobby
const SKIN_SHOW = { rae: 'wave', ranger: 'jacks', moss: 'groove', comet: 'robot', siren: 'robot', toast: 'wave', nightwarden: 'micdrop', tycoon: 'groove',
  stormborn: 'groove', nova: 'airguitar', tripy: 'micdrop', uzi: 'jacks', headliner: 'airguitar', week: 'groove', bruno: 'wave' };
// the lobby stage's colours (sky top to horizon, the two neon arches, light beams, sparkles, screen text)
const LOBBY_PAL = { sky: ['#020207', '#08081a', '#110c26', '#2a0c18', '#6e0f18'], arcA: 0xff2a3a, arcB: 0xe8f0ff, beams: [0xff2a3a, 0xffffff], spark: [0xff3b4a, 0xffffff, 0xff8a8a, 0xbfd6ff], accent: '#ff3b4a', glow: '#ff1a2e', ring: 0xff2a3a };
const Lobby = {
  scene: null, cam: null, rig: null, fake: null, t: 0, tab: 'play', cat: 'outfit', bus: null,
  init() {
    const s = this.scene = new THREE.Scene(); s.background = this.skyTex(); s.fog = new THREE.Fog(0x0c0a1c, 24, 80);
    s.add(new THREE.HemisphereLight(0xb8d4ff, 0x10284f, 0.85));
    const key = new THREE.DirectionalLight(0xffd9b0, 1.05); key.position.set(3, 6, 6); s.add(key);
    const rim = new THREE.DirectionalLight(0x5a9bff, 0.9); rim.position.set(-4, 4, -6); s.add(rim);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.4, 40), lam(0x1c1622)); plat.position.y = -0.2; s.add(plat);
    const ring = this.ring = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.05, 8, 64), basic(0x4fb0ff)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; s.add(ring);
    this.festival(s);
    const isl = new THREE.Group(); const rock = new THREE.Mesh(new THREE.ConeGeometry(7, 9, 7), lam(0x4a5a7a)); rock.rotation.x = Math.PI; rock.position.y = -4.5; isl.add(rock);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1.2, 7), lam(0x4f9a5a)); isl.add(top); isl.position.set(-14, 3, -30); isl.visible = false; s.add(isl); this.isl = isl;   // (the festival stage stands where the island used to float)
    const sp = []; for (let i = 0; i < 400; i++) sp.push(rnd(-60, 60), rnd(-5, 40), rnd(-60, -20));
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 })));
    this.bus = buildBusModel(); this.bus.scale.setScalar(0.5); s.add(this.bus);
    this.car = buildPremiumCar(); this.car.scale.setScalar(0.5); this.car.visible = false; s.add(this.car);
    this.street = buildStreetCar(0xc8202a); this.street.scale.setScalar(0.5); this.street.visible = false; s.add(this.street);
    this.limo = buildLimo(); this.limo.scale.setScalar(0.4); this.limo.visible = false; s.add(this.limo);
    // two party spots beside you: an empty platform with a + to invite, or a friend from your room standing on it
    this.slots = [-1, 1].map(side => {
      const x = side * 2.55, z = -1.15, g = new THREE.Group(); g.position.set(x, 0, z);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.22, 0.3, 32), lam(0x17121c)); p.position.y = -0.15; g.add(p);
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.035, 8, 48), basic(0xe8eaf2)); r.rotation.x = Math.PI / 2; r.position.y = 0.01; g.add(r);
      s.add(g);
      const add = document.createElement('button'); add.type = 'button'; add.className = 'slot-add'; add.title = 'Invite a friend'; add.innerHTML = '<i aria-hidden="true">+</i><span>Invite</span>';
      add.addEventListener('click', () => this.openParty());
      const tag = document.createElement('div'); tag.className = 'slot-tag'; tag.hidden = true;
      $('stageUI').append(add, tag);
      return { x, z, side, g, add, tag, rig: null, key: '', fake: null };
    });
    this.cam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200); this.place();
    this.fake = newActor({ state: 'ground', onGround: true, inv: [{ kind: 'pick' }, makeWeapon('ar', 4), null, null, null, null], slot: 0 });
    this.rebuild();
    this.bindUI(); this.refresh();
  },
  // ---- the season's stage: a sunset sky, neon arches, a big screen with the season's name, sweeping spotlights and sparkles
  skyTex() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    [0, 0.45, 0.72, 0.9, 1].forEach((k, i) => gr.addColorStop(k, LOBBY_PAL.sky[i]));
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
  },
  screenTex() {
    const c = this._scr || (this._scr = document.createElement('canvas')); c.width = 1024; c.height = 320; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 1024, 320); gr.addColorStop(0, '#050307'); gr.addColorStop(1, '#14050a'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 320);
    g.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = 0; y < 320; y += 6) g.fillRect(0, y, 1024, 2);   // LED rows
    g.textAlign = 'center'; g.textBaseline = 'middle'; const sid = Season.id();
    g.font = '900 italic 62px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = LOBBY_PAL.accent; g.fillText('SEASON ' + (sid + 1) + ' · LIVE NOW', 512, 82);
    let fs = 150; const nm = Season.name().toUpperCase(); do { g.font = '900 italic ' + fs + 'px "Barlow Condensed", Impact, sans-serif'; fs -= 8; } while (g.measureText(nm).width > 960 && fs > 60);
    g.shadowColor = LOBBY_PAL.glow; g.shadowBlur = 26; g.fillStyle = '#ffffff'; g.fillText(nm, 512, 205); g.shadowBlur = 0;
    if (this.scrTex) this.scrTex.needsUpdate = true; this.scrSeason = sid; return c;
  },
  festival(s) {
    const F = this.fest = { beams: [], arcs: [], bulbs: null, spark: null }, Z = -9;
    // neon arches over the stage (outer pink, inner cyan) with a row of warm bulbs on the outer one
    for (const [r, col, t] of [[7.6, LOBBY_PAL.arcA, 0.15], [6.7, LOBBY_PAL.arcB, 0.1]]) { const a = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 72, Math.PI), new THREE.MeshBasicMaterial({ color: col })); a.position.set(0, -0.4, Z); s.add(a); F.arcs.push(a); }
    { const P = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI, g = new THREE.SphereGeometry(0.13, 8, 6).translate(Math.cos(a) * 8.05, -0.4 + Math.sin(a) * 8.05, Z + 0.05); P.push([g, 0xffe6a8]); }
      F.bulbs = mergedColored(P); F.bulbs.material = new THREE.MeshBasicMaterial({ vertexColors: true }); s.add(F.bulbs); }
    // truss towers each side, with a light rig on top
    for (const sx of [-1, 1]) {
      const T = [], ox = sx * 9.2, oz = Z + 0.6;   // the whole tower is one mesh
      for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) T.push([new THREE.BoxGeometry(0.08, 9.6, 0.08).translate(ox + dx, 4.4, oz + dz), 0x3a3f52]);
      for (let y = 0.2; y < 9.2; y += 0.9) T.push([new THREE.BoxGeometry(0.78, 0.05, 0.05).rotateZ(0.7 * (Math.round(y / 0.9) % 2 ? 1 : -1)).translate(ox, y, oz + 0.35), 0x4a5066]);
      T.push([new THREE.CylinderGeometry(0.28, 0.36, 0.5, 12).translate(ox, 9.3, oz), 0x1d2030]);
      s.add(mergedColored(T));
      // spotlight beams from the top of each tower, sweeping across the stage
      for (const [k, col] of [[0, LOBBY_PAL.beams[0]], [1, LOBBY_PAL.beams[1]]]) {
        const pivot = new THREE.Group(); pivot.position.set(sx * 9.2, 9.3, Z + 0.6); s.add(pivot);
        const beam = new THREE.Mesh(new THREE.ConeGeometry(1.5, 12, 24, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        beam.position.y = -6; pivot.add(beam); F.beams.push({ pivot, sx, k, ph: Math.random() * 6 });
      }
    }
    // the big screen with the season's name
    this.scrTex = new THREE.CanvasTexture(this.screenTex()); this.scrTex.minFilter = THREE.LinearFilter;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 2.56), new THREE.MeshBasicMaterial({ map: this.scrTex })); scr.position.set(0, 4.62, Z - 0.1); s.add(scr); F.scr = scr;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.86, 0.12), lam(0x141522)); frame.position.set(0, 4.62, Z - 0.2); s.add(frame); F.frame = frame;
    // stage floor behind you, and speaker stacks either side
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.4, 0.6, 48, 1, false, Math.PI * 0.08, Math.PI * 0.84), lam(0x121a2c)); deck.rotation.y = Math.PI; deck.position.set(0, -0.62, Z + 1); s.add(deck);
    { const S = []; for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { S.push([new THREE.BoxGeometry(1.1, 1.25, 0.9).translate(sx * 7.3, 0.3 + i * 1.27, Z + 0.4), 0x16161e]); S.push([new THREE.CircleGeometry(0.36, 18).translate(sx * 7.3, 0.3 + i * 1.27, Z + 0.86), 0x2c2c3a]); } s.add(mergedColored(S)); }   // speaker stacks
    // sparkles drifting up through the light
    const N = 220, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), C = new THREE.Color(), pal = LOBBY_PAL.spark;
    for (let i = 0; i < N; i++) { pos[i * 3] = rnd(-11, 11); pos[i * 3 + 1] = rnd(-0.5, 10); pos[i * 3 + 2] = rnd(-11, 2.5); C.setHex(pal[i % pal.length]); col.set([C.r, C.g, C.b], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    F.spark = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); s.add(F.spark);
  },
  festivalTick(dt) {
    const F = this.fest; if (!F) return;
    if (Season.id() !== this.scrSeason) this.screenTex();
    F.scr.visible = F.frame.visible = innerWidth > 760;   // on phones the screen would sit behind the logo; the season card says it instead
    const on = !Perf.on; for (const b of F.beams) b.pivot.visible = on; F.spark.visible = on;
    if (!on) return;
    const t = this.t;
    for (const b of F.beams) { b.pivot.rotation.z = -b.sx * (0.42 + Math.sin(t * (0.5 + b.k * 0.23) + b.ph) * 0.24); b.pivot.rotation.x = 0.04 + Math.sin(t * 0.37 + b.ph) * 0.1; }   // they sweep across the stage, not into your face
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.05)), 8);   // a little pulse, about 125 beats a minute
    F.arcs[0].material.color.setHex(LOBBY_PAL.arcA).offsetHSL(0, 0, beat * 0.12); F.arcs[1].material.color.setHex(LOBBY_PAL.arcB).offsetHSL(0, 0, beat * 0.1);
    if (this.ring) this.ring.material.color.setHex(LOBBY_PAL.ring).offsetHSL(0, 0, beat * 0.15);
    const p = F.spark.geometry.attributes.position, a = p.array;
    for (let i = 0; i < a.length; i += 3) { a[i + 1] += dt * (0.35 + (i % 7) * 0.06); a[i] += Math.sin(t * 0.8 + i) * dt * 0.08; if (a[i + 1] > 10.5) { a[i + 1] = -0.4; a[i] = rnd(-11, 11); } }
    p.needsUpdate = true;
  },
  lift: 0, camX: 1.3,
  place() {
    const wide = innerWidth > 760, L = this.lift || 0, play = this.tab === 'play';
    if (wide && play) {   // Play: you in the middle of the space left of the panel, with a party spot each side
      const side = (($('lbFoot') && $('lbFoot').offsetWidth) || 400) + 28, wpp = 2 * 8.6 * Math.tan(this.cam.fov * Math.PI / 360) / innerHeight;
      const x = this.camX = side / 2 * wpp; this.cam.position.set(x, 1.55, 8.6); this.cam.lookAt(x, 1.0, 0);
    }
    else if (wide) { this.camX = 1.3; this.cam.position.set(1.3, 1.5 + L, 6.6 + L * 0.8); this.cam.lookAt(1.3, 1.15 + L, 0); }
    else { this.camX = 0; this.cam.position.set(0, 1.2 + L, 11.7 + L); this.cam.lookAt(0, -0.9 + L, 0); }
  },
  openParty() {
    Sfx.init(); const box = Social.me ? $('socBox') : $('partyBox'); box.open = true; box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });   // signed in: pick a friend to invite
    const f = $('mpCode') || $('mpName'); if (f) setTimeout(() => f.focus(), 50);
  },
  // friends from your room stand on the party spots; the name plate and + buttons follow the 3D stage
  stage(dt) {
    const play = this.tab === 'play' && innerWidth > 760, room = typeof Net !== 'undefined' && Net.state === 'room';
    const others = room ? Net.members.filter(m => m.id !== Net.me) : [];
    const v = this._v || (this._v = new THREE.Vector3()), W2 = innerWidth / 2, H2 = innerHeight / 2;
    const at = (el, x, y, z) => { v.set(x, y, z).project(this.cam); const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05; el.style.visibility = on ? '' : 'hidden'; if (on) el.style.transform = 'translate(' + Math.round((v.x + 1) * W2) + 'px,' + Math.round((1 - v.y) * H2) + 'px)'; };
    for (let i = 0; i < this.slots.length; i++) {
      const sl = this.slots[i], m = play ? others[i] : null;
      sl.g.visible = play;
      const key = m ? m.id + JSON.stringify(m.eq || {}) : '';
      if (key !== sl.key) {
        sl.key = key; if (sl.rig) { this.scene.remove(sl.rig.root); sl.rig = null; }
        if (m) { sl.rig = makeRig(Object.assign({}, m.eq || {})); this.scene.add(sl.rig.root); sl.fake = sl.fake || newActor({ state: 'ground', onGround: true, inv: [{ kind: 'pick' }, null, null, null, null, null], slot: 0 }); }
      }
      if (sl.rig) { const f = sl.fake; f.pos.set(sl.x, 0, sl.z); f.pitch = 0; f.yaw = -sl.side * 0.35 + Math.sin(this.t * 0.4 + i * 2) * 0.15; animateRig(sl.rig, f, dt, this.t + i * 1.7); }
      sl.add.hidden = !play || !!m;
      sl.tag.hidden = !m; if (m) { const nm = m.name + (m.id === Net.hostId ? ' · host' : ''); if (sl.tag.textContent !== nm) sl.tag.textContent = nm; }
      if (!sl.add.hidden) at(sl.add, sl.x, 0.95, sl.z);
      if (m) at(sl.tag, sl.x, 2.18, sl.z);
    }
    // the name plate floats over your head on wide screens; on phones it sits at the top of the Play panel instead
    const np = $('namePlate'), narrow = innerWidth <= 760, home = narrow ? $('tab-play') : $('stageUI');
    if (np.parentElement !== home) { if (narrow) home.prepend(np); else home.append(np); np.style.transform = ''; np.style.visibility = ''; }
    np.hidden = this.tab !== 'play';
    if (!np.hidden && !narrow) at(np, 0, 2.15, 0);
  },
  shopSel: { cat: 'car', id: 'midnight' }, rigKey: '',
  lockSel: null,
  viewEq() {
    const eq = Profile.d.eq, sel = this.tab === 'shop' ? this.shopSel : this.tab === 'locker' ? this.lockSel : null;
    return sel && sel.cat !== 'car' && (this.tab === 'shop' || sel.cat === this.cat) ? Object.assign({}, eq, { [sel.cat]: sel.id }) : eq;
  },
  rebuild() {
    const eq = this.viewEq(); this.rigKey = JSON.stringify(eq); if (this.rig) this.scene.remove(this.rig.root); this.rig = makeRig(eq); this.scene.add(this.rig.root);
    const prev = this._outfit; this._outfit = eq.outfit; if (prev && prev !== eq.outfit) this.showOff(eq.outfit);
  },
  // a new skin on: a spin with a hop, a ring and a column of light in its rarity colour, then its signature move
  showOff(id) {
    const it = cosById('outfit', id), col = (RARITY[it.r] || RARITY[0]).hex, em = SKIN_SHOW[id] || 'groove';
    this.show = { t: 0, emote: COS.emote.some(e => e.id === em) ? em : 'groove', yaw0: this.fake.yaw };
    if (this.showFx) { this.scene.remove(this.showFx); this.showFx = null; }
    if (!Perf.on) {
      const g = new THREE.Group(), add = m => { g.add(m); return m; };
      add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1, depthWrite: false }))).rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }))).position.y = 3;
      const N = 60, pos = new Float32Array(N * 3), vel = []; for (let i = 0; i < N; i++) { const a = Math.random() * TAU, r = 0.4 + Math.random() * 0.8; pos.set([Math.cos(a) * r, 0.2 + Math.random() * 0.6, Math.sin(a) * r], i * 3); vel.push([Math.cos(a) * (1 + Math.random() * 2), 2 + Math.random() * 3.5, Math.sin(a) * (1 + Math.random() * 2)]); }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = add(new THREE.Points(pg, new THREE.PointsMaterial({ color: col, size: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); pts.userData.vel = vel;
      g.position.y = 0.02; this.scene.add(g); this.showFx = g;
    }
    Sfx.init(); [523, 659, 784, 1047].forEach((f, i) => Sfx.tone(f, 0.16, 'triangle', 0.07, 0, i * 0.07));
  },
  showTick(dt, f) {
    const S = this.show; if (!S) return; S.t += dt; const t = S.t;
    if (t < 0.9) { const k = t / 0.9, e = 1 - Math.pow(1 - k, 3); f.yaw = S.yaw0 + e * TAU; f.pos.y += Math.sin(k * Math.PI) * 0.35; }   // spin and hop
    else if (t < 3.6) { if (f.emote !== S.emote) f.emoteT = 0; f.emote = S.emote; f.emoteT += dt; }   // then the skin's own move
    else { this.show = null; f.emote = null; }
    const g = this.showFx; if (g) {
      const k = Math.min(1, t / 1.1), ring = g.children[0], beam = g.children[1], pts = g.children[2];
      ring.scale.setScalar(0.6 + k * 1.8); ring.material.opacity = 1 - k; beam.material.opacity = 0.35 * (1 - k); beam.scale.set(1 - k * 0.5, 1, 1 - k * 0.5);
      const p = pts.geometry.attributes.position, v = pts.userData.vel; for (let i = 0; i < v.length; i++) { v[i][1] -= 6 * dt; p.array[i * 3] += v[i][0] * dt; p.array[i * 3 + 1] = Math.max(0.02, p.array[i * 3 + 1] + v[i][1] * dt); p.array[i * 3 + 2] += v[i][2] * dt; }
      p.needsUpdate = true; pts.material.opacity = 1 - Math.min(1, t / 1.6);
      if (t > 1.7) { this.scene.remove(g); this.showFx = null; }
    }
  },
  render(dt) {
    if (Perf.on && !Opening.on) { this.acc = (this.acc || 0) + dt; if (this.acc < 1 / 30) return; dt = this.acc; this.acc = 0; }   // Performance Mode: the lobby draws at 30 fps
    this.t += dt; const f = this.fake, sel = this.shopSel, cat = this.tab === 'locker' ? this.cat : this.tab === 'shop' ? sel.cat : 'outfit';
    const veq = this.viewEq(); if (JSON.stringify(veq) !== this.rigKey) this.rebuild();
    f.state = cat === 'glider' ? 'glide' : 'ground'; f.slot = cat === 'wrap' ? 1 : 0; f.pitch = 0;
    f.yaw = cat === 'backpack' ? Math.PI + Math.sin(this.t * 0.6) * 0.5 : Math.sin(this.t * 0.4) * 0.45 - 0.2;
    if (cat === 'emote') { if (!f.emote) f.emoteT = 0; f.emote = veq.emote; f.emoteT += dt; } else f.emote = null;
    f.pos.set(0, cat === 'glider' ? 0.6 + Math.sin(this.t * 1.5) * 0.1 : 0, 0);
    if (this.show && cat !== 'emote' && cat !== 'glider') this.showTick(dt, f); else if (this.show) { this.show = null; }
    animateRig(this.rig, f, dt, this.t);
    const showCar = cat === 'car';
    const which = this.tab === 'shop' ? sel.id : this.tab === 'locker' && this.lockSel && this.lockSel.cat === 'car' ? this.lockSel.id : Profile.d.eq.car;
    this.car.visible = showCar && which === 'midnight'; this.limo.visible = showCar && which === 'limo'; this.street.visible = showCar && which !== 'midnight' && which !== 'limo'; this.rig.root.visible = !showCar;
    if (showCar) { const m = which === 'midnight' ? this.car : which === 'limo' ? this.limo : this.street; m.rotation.y += dt * 0.45; for (const w of m.userData.wheels) w.rotation.set(0, w.userData.front ? Math.sin(this.t * 0.8) * 0.3 : 0, 0, 'YXZ'); }
    this.rig.glider.position.y = 3.2;
    const lt = cat === 'glider' ? 1.9 : 0; if (Math.abs(this.lift - lt) > 0.01) { this.lift = lerp(this.lift, lt, Math.min(1, dt * 5)); this.place(); }
    this.bus.visible = !Perf.on;   // Performance Mode: a still background (no flying bus or turning island)
    if (!Perf.on) {
      const bt = (this.t * 0.05) % 1; this.bus.position.set(lerp(-50, 50, bt), 4.5 + Math.sin(this.t) * 0.4, -26); this.bus.rotation.y = Math.PI / 2;
      for (const p of this.bus.userData.props) p.rotation.z += dt * 20;
      this.isl.rotation.y += dt * 0.05;
    }
    this.festivalTick(dt);
    Opening.cam(this.cam, dt);
    this.stage(dt);
    renderer.render(this.scene, this.cam);
  },
  // the season card: the season's name, days left, your level and XP, today's bonus and a featured shop item
  seasonCard() {
    if (!$('seasonCard')) return;
    const d = Profile.d, sid = Season.id(), dl = Season.daysLeft(), lv = Profile.tier(), xp = d.seasonXp % XP_PER_LEVEL;
    $('scKicker').textContent = 'Season ' + (sid + 1); $('scName').textContent = Season.name();
    $('scLeft').textContent = dl <= 1 ? 'Last day' : dl + ' days left';
    $('scLvl').textContent = 'Level ' + lv; $('scXp').textContent = xp.toLocaleString() + ' / ' + XP_PER_LEVEL.toLocaleString() + ' XP';
    $('scFill').style.width = (xp / XP_PER_LEVEL * 100).toFixed(1) + '%';
    $('scDaily').innerHTML = (d.lastDaily || 0) >= Profile.today() ? 'Daily bonus <b>+' + DAILY_XP + ' XP collected</b> · come back tomorrow' : 'Open FortDay each day for <b>+' + DAILY_XP + ' XP</b>';
    // one shop item in the spotlight each day
    const pool = COS.outfit.filter(c => c.unlock === 'shop' && !Profile.owns(c) && !(c.limitedSeason != null && sid > c.limitedSeason));
    const f = $('scFeat'); f.hidden = !pool.length;
    if (pool.length) { const it = pool.find(c => c.id === 'nova') || pool[Profile.today() % pool.length]; this.featured = it; f.innerHTML = '<i>FEATURED</i><span></span><em>' + (it.price || 0).toLocaleString() + ' FortBux</em>'; f.querySelector('span').textContent = it.name; }
  },
  // what PLAY will start, in plain words (shown on the button)
  summary() {
    const d = Profile.d, m = MODE_NAME[d.mode] || 'Solo';
    return [m, d.build ? 'Build' : 'No-Build', d.ranked && d.mode !== 'rumble' && Net.state !== 'room' ? 'Ranked' : ''].filter(Boolean).join(' · ');
  },
  // the mode card and the Unranked / Ranked switch next to PLAY
  modeBar() {
    const d = Profile.d, room = typeof Net !== 'undefined' && Net.state === 'room', guest = room && !Net.isHost, br = d.mode !== 'rumble';
    $('modeName').textContent = br ? 'Battle Royale' : 'Storm Rumble';
    $('modeSub').textContent = [(d.mode === 'rumble' ? '16 vs 16' : MODE_NAME[d.mode]) || 'Solo', d.build ? 'Build' : 'No-Build'].join(' · ');
    $('modeBtn').disabled = guest; $('modeBtn').title = guest ? 'The host picks the mode' : 'Change mode';
    const off = !br || room, ranked = !!d.ranked && !off;
    for (const b of $('rankSeg').children) { const on = (b.dataset.ranked === '1') === ranked; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.disabled = off && b.dataset.ranked === '1'; }
    $('rankSeg').title = !br ? 'Storm Rumble is always unranked' : room ? 'Matches with friends are unranked' : '';
    $('lbFoot').classList.toggle('ranked', ranked);
    if (guest && !$('modeMenu').hidden) $('modeMenu').hidden = true;
  },
  bindUI() {
    $('scFeat').addEventListener('click', () => { Sfx.init(); if (!this.featured) return; this.tab = 'shop'; this.shopSel = { cat: 'outfit', id: this.featured.id }; this.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (this.fest) this.screenTex(); });   // redraw the stage screen once the display font has loaded
    // Enter starts the match from the lobby (not while typing, or while a menu or the opening is up)
    addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.repeat || Match.state !== 'lobby' || $('lobby').classList.contains('intro')) return;
      const t = e.target; if (t && t.closest && t.closest('input, textarea, select, button, a, summary')) return;
      if (!$('settings').hidden || !$('tutAsk').hidden || !$('modeMenu').hidden || $('readyBtn').disabled) return;
      e.preventDefault(); $('readyBtn').click();
    });
    $('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; this.tab = b.dataset.tab; this.refresh(); });
    $('modeGrid').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; Profile.d.mode = b.dataset.mode; Profile.save(); this.refresh(); });
    $('buildSeg').addEventListener('click', e => { const b = e.target.closest('[data-build]'); if (!b) return; Profile.d.build = b.dataset.build === '1'; Profile.save(); this.refresh(); });
    $('nameIn').addEventListener('input', e => { Profile.d.name = e.target.value.trim().slice(0, 16); Profile.save(); const m = $('mpName'); if (m) m.value = Profile.d.name; });
    $('nameIn').addEventListener('keydown', e => e.stopPropagation());
    // mode picker and Unranked / Ranked, right above PLAY
    const menu = $('modeMenu'), openMenu = on => { menu.hidden = !on; $('modeBtn').setAttribute('aria-expanded', on); $('lbFoot').classList.toggle('menu-on', on); };
    $('modeBtn').addEventListener('click', () => { Sfx.init(); openMenu(menu.hidden); });
    $('modeDone').addEventListener('click', () => openMenu(false));
    addEventListener('pointerdown', e => { if (!menu.hidden && !e.target.closest('#lbFoot')) openMenu(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { e.stopImmediatePropagation(); openMenu(false); } }, true);
    $('rankSeg').addEventListener('click', e => { const b = e.target.closest('[data-ranked]'); if (!b || b.disabled) return; Profile.d.ranked = b.dataset.ranked === '1'; Profile.save(); Sfx.init(); this.refresh(); });
    $('catRow').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; this.cat = b.dataset.cat; this.refresh(); });
    $('itemGrid').addEventListener('click', e => {
      const b = e.target.closest('[data-id]'); if (!b) return; const item = cosById(this.cat, b.dataset.id);
      this.lockSel = { cat: this.cat, id: item.id };
      if (Profile.unlocked(item)) { Profile.d.eq[this.cat] = item.id; Profile.save(); Sfx.init(); Sfx.blip && Sfx.blip(); }
      this.refresh(); $('tab-locker').scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('lkBody').addEventListener('click', e => { const b = e.target.closest('[data-body]'); if (!b) return; Profile.d.eq.body = b.dataset.body; Profile.save(); Sfx.init(); this.refresh(); });
    $('lkBtn').addEventListener('click', () => {
      const sel = this.lockSel, item = cosById(sel.cat, sel.id);
      if (Profile.unlocked(item)) { Profile.d.eq[sel.cat] = item.id; Profile.save(); this.refresh(); return; }
      this.shopSel = { cat: sel.cat, id: item.id }; this.tab = 'shop'; this.refresh(); $('tab-shop').scrollTop = 0;
    });
    $('buyBtn').addEventListener('click', () => this.buy(this.shopSel.cat, this.shopSel.id));
    $('codeLink').addEventListener('click', () => { const r = $('codeRow'); r.hidden = !r.hidden; if (!r.hidden) $('codeIn').focus(); });
    const redeem = async () => {
      const msg = $('shopMsg'), inp = $('codeIn'); Sfx.init(); msg.textContent = 'Checking…';
      let r; try { r = await redeemCode(inp.value); } catch (e) { r = { err: 'Could not check that code.' }; }
      if (r.err) { msg.textContent = r.err; return; }
      if (r.pass) { inp.value = ''; $('codeRow').hidden = true; Sfx.chest(); this.refresh(); $('shopMsg').textContent = r.had ? 'You already have the Battle Pass this season.' : 'Battle Pass unlocked! You are now ' + RANKS[Profile.rankIdx()][0] + '. Pick your free skin.'; return; }
      inp.value = ''; $('codeRow').hidden = true; Sfx.chest(); this.shopSel = { cat: r.it.cat, id: r.it.id }; this.lockSel = null;
      this.refresh(); $('shopMsg').textContent = r.had ? r.it.name + ' was already yours, so it is now equipped.' : 'Code redeemed! ' + r.it.name + ' is unlocked and equipped.';
    };
    $('codeBtn').addEventListener('click', redeem);
    $('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') redeem(); e.stopPropagation(); });
    // Battle Pass: 5,000 FortBux (tap twice to confirm), or $1 on the payment site (it sends you back with ?bp=)
    $('bpBtn').addEventListener('click', () => {
      Sfx.init(); const b = $('bpBtn');
      if (Profile.hasPass()) {
        if (!Profile.passPickLeft()) return;
        const first = COS.outfit.find(c => Profile.canClaim(c)); this.tab = 'shop'; this.shopFilter = 'outfit'; if (first) this.shopSel = { cat: 'outfit', id: first.id };
        this.refresh(); $('tab-shop').scrollTop = 0; $('shopMsg').textContent = 'Battle Pass: pick any skin and press Claim free. You get one per season.'; return;
      }
      if (Profile.d.coins < PASS_PRICE) { $('bpMsg').textContent = 'You need ' + (PASS_PRICE - Profile.d.coins).toLocaleString() + ' more ' + COIN + (PASS_PAY_URL ? ', or pay $1 online below.' : '.'); return; }
      if (!b.dataset.confirm) { b.dataset.confirm = '1'; b.textContent = 'Tap again to spend ' + PASS_PRICE.toLocaleString(); clearTimeout(this.bpT); this.bpT = setTimeout(() => { delete b.dataset.confirm; this.refresh(); }, 3500); return; }
      delete b.dataset.confirm; clearTimeout(this.bpT);
      const r = Profile.buyPass(); if (r.ok) Sfx.chest();
      this.refresh(); $('bpMsg').textContent = r.err || 'Battle Pass unlocked! You are now ' + RANKS[Profile.rankIdx()][0] + '. Press Pick your free skin.';
    });
    $('thankBtn').addEventListener('click', () => {
      const d = Profile.d; if (d.thankSeason === Season.id()) return;
      d.thankSeason = Season.id(); const lv = Profile.addXp(1000); Profile.save(); Sfx.init();
      this.refresh(); $('thankTxt').textContent = 'Thank you for playing! +1,000 XP' + (lv.coins ? ' · Level ' + lv.l1 + '! +' + lv.coins + ' ' + COIN : '') + '.';
    });
    $('shopGrid').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; this.shopSel = { cat: b.dataset.cat, id: b.dataset.id }; $('shopMsg').textContent = ''; this.refresh(); $('tab-shop').scrollTo({ top: 0, behavior: 'smooth' }); });
    $('shopFilters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; this.shopFilter = b.dataset.f; this.refresh(); });
    $('readyBtn').addEventListener('click', () => {
      if (Net.state === 'room' && !Net.isHost) return;
      Sfx.init(); Sfx.horn();
      Net.inMatch = Net.state === 'room';
      MapRotation.began(); Profile.d.theme = MapRotation.current();
      Match.start({ mode: Profile.d.mode, build: Profile.d.mode === 'rumble' ? Profile.d.build : Profile.d.build, ranked: Profile.d.ranked && Profile.d.mode !== 'rumble' && !Net.inMatch, theme: Profile.d.theme });
    });
    Net.initUI();
  },
  buy(cat, id) {
    const it = cosById(cat, id), d = Profile.d, msg = $('shopMsg'), price = itemPrice(it); Sfx.init();
    if (Profile.canClaim(it)) { Profile.claimPassSkin(it); Sfx.chest(); msg.textContent = it.name + ' is yours for free with the Battle Pass, and equipped.'; this.refresh(); return; }
    if (Profile.unlocked(it)) { d.eq[cat] = id; Profile.save(); msg.textContent = it.name + ' equipped.' + (cat === 'car' ? ' Get into any car to drive it.' : ''); this.refresh(); return; }
    if (it.limitedSeason != null && Season.id() > it.limitedSeason) { msg.textContent = it.name + ' was only available in ' + Season.name(it.limitedSeason) + '.'; return; }
    if (d.coins < price) { msg.textContent = 'You need ' + (price - d.coins).toLocaleString() + ' more ' + COIN + '. Play matches to earn them.'; return; }
    d.coins -= price; d.owned[cat + ':' + id] = true; d.eq[cat] = id; Profile.save(); Sfx.chest();
    msg.textContent = 'Purchased and equipped. It is in your locker under ' + COS_CATS.find(c => c[0] === cat)[1] + '.'; this.refresh();
  },
  shopFilter: 'all',
  shopHero() {
    const d = Profile.d, sel = this.shopSel, it = cosById(sel.cat, sel.id), catName = COS_CATS.find(c => c[0] === sel.cat)[1];
    const own = Profile.unlocked(it), eq = d.eq[sel.cat] === it.id, price = itemPrice(it), rc = it.premium ? '#ffd23a' : RARITY[it.r].css;
    const DESC = { outfit: 'A full character skin with its own face, hair and outfit.', backpack: 'Back bling worn on your character in every match.', pickaxe: 'Swings in place of the standard harvesting tool.', glider: 'Opens when you drop from the bus.', wrap: 'A finish applied to every weapon you hold.', emote: 'A dance you can play with B during a match.' };
    $('shopDetail').style.setProperty('--rc', rc);
    $('shopTag').textContent = it.premium ? 'Premium' : RARITY[it.r].name;
    $('shopName').textContent = it.name;
    $('shopSub').textContent = catName + ' · ' + (it.premium ? 'Premium' : RARITY[it.r].name);
    const feats = [];
    if (sel.cat === 'car') {
      $('shopDesc').textContent = it.id === 'limo' ? 'An 8.6 m black stretch limousine: chrome grille and trim, tinted windows, cream leather lounge seats with a bar and purple mood lighting, and a sunroof.' : it.premium ? 'A blue tuner coupe with a carbon hood, yellow light covers and a tall rear wing.' : 'The standard coupe parked around the island.';
      if (it.premium) feats.push('Any car you get into becomes your ' + it.name, it.id === 'limo' ? 'Rams through anyone in its way: it is twice as long' : 'Spinning wheels with working front steering');
    } else $('shopDesc').textContent = DESC[sel.cat] || '';
    if (it.music) feats.unshift('Music Festival 2026 collection');
    if (it.limitedSeason != null) feats.unshift('Limited: only available in ' + Season.name(it.limitedSeason) + '. Once the season ends it leaves the Item Shop and will never return.');
    if (it.unlock && it.unlock.startsWith('tier:')) feats.push('Also unlocks free at level ' + it.unlock.slice(5));
    if (it.unlock === 'win') feats.push('Also earned free by winning a match');
    if (!it.unlock) feats.push('Included with every account');
    if (Profile.ticket() && !Profile.owns(it) && it.unlock) feats.unshift('Included with your Music Concert Ticket until ' + Season.name() + ' ends');
    if (Profile.canClaim(it)) feats.unshift('Free with your Battle Pass: one skin each season');
    feats.push('Cosmetic only, no gameplay advantage');
    $('shopFeats').innerHTML = feats.map(f => '<li>' + esc(f) + '</li>').join('');
    const pr = $('shopPrice').parentElement; pr.classList.toggle('owned', own);
    pr.innerHTML = own ? '<b id="shopPrice">' + (eq ? 'Equipped' : 'Owned') + '</b>' : '<i class="coin"></i><b id="shopPrice" class="num">' + price.toLocaleString() + '</b>';
    const btn = $('buyBtn'); btn.textContent = own ? (eq ? 'Equipped' : 'Equip') : 'Buy for ' + price.toLocaleString();
    btn.className = 'buy' + (own && eq ? ' owned' : own ? ' equip' : ''); btn.disabled = own && eq;
    if (Profile.canClaim(it)) { pr.classList.remove('owned'); pr.innerHTML = '<b id="shopPrice">FREE</b>'; btn.textContent = 'Claim free · Battle Pass'; btn.className = 'buy equip'; btn.disabled = false; }
    const coded = !own && Object.values(SKIN_CODES).includes(sel.cat + ':' + sel.id); $('codeBox').hidden = !coded; if (!coded) $('codeRow').hidden = true;
  },
  lockerView() {
    const d = Profile.d, cat = this.cat, catName = COS_CATS.find(c => c[0] === cat)[1];
    if (!this.lockSel || this.lockSel.cat !== cat) this.lockSel = { cat, id: d.eq[cat] };
    const owned = c => Profile.unlocked(c);
    $('catRow').innerHTML = COS_CATS.map(([k, n]) => `<button role="tab" aria-selected="${k === cat}" data-cat="${k}" class="${k === cat ? 'on' : ''}">${n}<i>${COS[k].filter(owned).length}/${COS[k].length}</i></button>`).join('');
    const total = COS_CATS.reduce((s, [k]) => s + COS[k].length, 0), have = COS_CATS.reduce((s, [k]) => s + COS[k].filter(owned).length, 0);
    $('lkCount').textContent = have + ' of ' + total + ' collected';
    $('lockerTitle').textContent = 'Locker';
    const how = c => c.unlock === 'chest' ? '1 in 1,000 chests' : c.unlock === 'win' ? 'Win a match' : c.unlock === 'shop' ? 'Item Shop' : c.unlock && c.unlock.startsWith('tier:') ? 'Level ' + c.unlock.slice(5) : '';
    $('itemGrid').innerHTML = COS[cat].slice().sort((a, b) => owned(b) - owned(a) || a.r - b.r).map(c => {
      const own = owned(c), eq = d.eq[cat] === c.id, on = this.lockSel.id === c.id, rc = c.premium ? '#ffd23a' : RARITY[c.r].css;
      const foot = eq ? '<span class="scard-foot eq">Equipped</span>' : own ? '<span class="scard-foot owned">Owned</span>' : `<span class="scard-foot lock"><svg class="lk" viewBox="0 0 24 24"><path d="M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>${c.unlock === 'chest' ? 'Chest find' : '<i class="coin"></i>' + itemPrice(c).toLocaleString()}</span>`;
      return `<button class="scard ${on ? 'on' : ''} ${own ? '' : 'locked'}" data-id="${c.id}" style="--rc:${rc}">${c.premium ? '<span class="prem">PREMIUM</span>' : ''}${eq ? '<span class="eqb">EQUIPPED</span>' : ''}<span class="scard-art">${this.shopIcon(cat, c)}</span><span class="scard-body"><b>${esc(c.name)}</b><span>${c.premium ? 'Premium' : RARITY[c.r].name}</span></span>${foot}</button>`;
    }).join('');
    const it = cosById(cat, this.lockSel.id), own = owned(it), eq = d.eq[cat] === it.id, rc = it.premium ? '#ffd23a' : RARITY[it.r].css;
    const DESC = { outfit: 'A full character skin with its own face, hair and outfit.', backpack: 'Back bling worn on your character in every match.', pickaxe: 'Swings in place of the standard harvesting tool.', glider: 'Opens when you drop from the bus.', wrap: 'A finish applied to every weapon you hold.', emote: 'A dance you can play with B during a match.', car: 'Any car you get into becomes this one.' };
    $('lkDetail').style.setProperty('--rc', rc);
    $('lkTag').textContent = it.premium ? 'Premium' : RARITY[it.r].name;
    $('lkName').textContent = it.name;
    $('lkSub').textContent = catName + (own ? ' · In your collection' : ' · Not owned yet');
    $('lkDesc').textContent = DESC[cat] + (it.limitedSeason != null ? ' Limited to ' + Season.name(it.limitedSeason) + ': it will never return once the season ends.' : '') + (own ? '' : it.unlock === 'chest' ? ' Get it: every chest you open has a 1 in 1,000 chance to hold it. Only one per player, and it is never sold in the Shop.' : ' Get it: ' + (how(it) ? how(it) + ', or ' : '') + 'buy it in the Item Shop for ' + itemPrice(it).toLocaleString() + ' ' + COIN + '.');
    $('lkState').textContent = eq ? 'Equipped' : own ? 'Owned' : 'Locked';
    $('lkState').className = 'sd-price' + (own ? ' owned' : '');
    const bodyOk = cat === 'outfit' && !it.personal; $('lkBody').hidden = !bodyOk;
    if (bodyOk) for (const b of $('lkBody').querySelectorAll('button')) { const on = (d.eq.body || 'woman') === b.dataset.body; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }
    const gone = !own && it.limitedSeason != null && Season.id() > it.limitedSeason;   // a limited item after its season
    const btn = $('lkBtn'); btn.textContent = eq ? 'Equipped' : own ? 'Equip' : gone ? 'No longer available' : it.unlock === 'chest' ? 'Find it in a chest' : 'Get it in the Shop'; btn.disabled = eq || gone || (!own && it.unlock === 'chest'); btn.className = 'buy' + (eq ? ' owned' : own ? ' equip' : '');
  },
  shopIcon(cat, item) {
    const P = { outfit: 'M8 3l4 2 4-2 5 4-3 3-2-1v11H8V9l-2 1-3-3z', backpack: 'M7 9a5 5 0 0 1 10 0v11H7z M9 13h6 M10 4.5h4', pickaxe: 'M5 20L15 10 M8.5 6.5c4-2.5 8.5-1.5 11 2-3-1-6.5-.8-9 1.3', glider: 'M2 10l10-5 10 5-10 2z M6.5 11l5.5 8 5.5-8', wrap: 'M12 3.5c3 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 3-6.5 6-10.5z', emote: 'M9 17.5V6l10-2v11.5 M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z M19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z', car: 'M3 15.5l2-5h14l2 5v3H3z M6.5 10.5L8.5 6h7l2 4.5 M7 18.5v1.5 M17 18.5v1.5' }[cat];
    const tint = item && (cat === 'outfit' ? item.shirt : item.c);
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (tint != null ? ' class="tint" style="--tint:#' + new THREE.Color(tint).getHexString() + '"' : '') + '><path d="' + P + '"/></svg>';
  },
  refresh() {
    const d = Profile.d;
    Net.render(); $('buildTag').textContent = 'build ' + BUILD_ID;
    this.seasonCard();
    { const newish = !d.tutDone && (d.matches || 0) < 3;
      $('tutBtn').hidden = !!d.tutDone; $('tutBadge').hidden = !newish; $('tutBtn').classList.toggle('new', newish); $('tutBtn').classList.toggle('small', !newish); }
    { const el = $('coinLbl'), nv = d.coins.toLocaleString(); if (el.textContent !== nv && el.textContent !== '0') { const box = el.parentElement; box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); } el.textContent = nv; }   // the FortBux counter bounces when it changes
    [...$('tabs').children].forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
    if (this.tab === 'players' && !Players.available()) this.tab = 'play';
    $('tabPlayers').hidden = !Players.available();   // only the owner's account (or a browser with the old Sheet link)
    for (const t of ['play', 'locker', 'pass', 'career', 'shop', 'players']) $('tab-' + t).hidden = t !== this.tab;
    if (this.tab === 'players') { Players.render(); Players.load(false); }
    if (document.activeElement !== $('nameIn')) $('nameIn').value = Profile.d.name || '';
    $('lobby').classList.toggle('shop-wide', this.tab === 'shop' || this.tab === 'locker');
    $('lobby').classList.toggle('play-view', this.tab === 'play');
    if (this.placedTab !== this.tab) { this.placedTab = this.tab; if (this.cam) this.place(); }
    { const room = Net.state === 'room';
      $('partySum').textContent = room ? 'Room ' + Net.code : 'Play with friends';
      $('partySub').textContent = room ? Net.members.length + ' of 8 players' + (Net.isHost ? ' · you are the host' : '') : 'Make a room and share its code'; }
    if (this.tab === 'shop') {
      this.shopHero();
      $('shopBal').textContent = d.coins.toLocaleString();
      const all = []; for (const [cat] of COS_CATS) for (const c of COS[cat]) if (c.unlock !== 'chest' && !(c.limitedSeason != null && Season.id() > c.limitedSeason && !Profile.owns(c))) all.push(c);   // chest finds are never sold; limited items leave after their season
      const featured = c => c.premium || c.music || c.r >= 4;
      const filters = [['all', 'All', all.length], ['featured', 'Featured', all.filter(featured).length], ...COS_CATS.map(([k, n]) => [k, n, COS[k].length])];
      $('shopFilters').innerHTML = filters.map(([k, n, c]) => `<button role="tab" aria-selected="${this.shopFilter === k}" class="${this.shopFilter === k ? 'on' : ''}" data-f="${k}">${n}<i>${c}</i></button>`).join('');
      const order = COS_CATS.map(c => c[0]);
      const list = all.filter(c => this.shopFilter === 'all' ? true : this.shopFilter === 'featured' ? featured(c) : c.cat === this.shopFilter)
        .sort((a, b) => (featured(b) && this.shopFilter === 'all') - (featured(a) && this.shopFilter === 'all') || order.indexOf(a.cat) - order.indexOf(b.cat) || a.r - b.r || a.name.localeCompare(b.name));
      $('shopGrid').innerHTML = list.map(c => {
        const own = Profile.unlocked(c), eq = d.eq[c.cat] === c.id, on = this.shopSel.cat === c.cat && this.shopSel.id === c.id, rc = c.premium ? '#ffd23a' : RARITY[c.r].css;
        const foot = Profile.canClaim(c) ? '<span class="scard-foot free">FREE · Pass</span>' : eq ? '<span class="scard-foot eq">Equipped</span>' : own ? '<span class="scard-foot owned">Owned</span>' : `<span class="scard-foot"><i class="coin"></i>${itemPrice(c).toLocaleString()}</span>`;
        const cat = COS_CATS.find(x => x[0] === c.cat)[1];
        return `<button class="scard ${on ? 'on' : ''}" data-cat="${c.cat}" data-id="${c.id}" style="--rc:${rc}">${c.premium ? '<span class="prem">PREMIUM</span>' : ''}<span class="scard-art">${this.shopIcon(c.cat, c)}</span><span class="scard-body"><b>${esc(c.name)}</b><span>${c.premium ? 'Premium' : RARITY[c.r].name} · ${cat}</span></span>${foot}</button>`;
      }).join('');
    }
    const tier = Profile.tier();
    Profile.syncSeason();
    { const dl = Profile.daily(); if (dl) { setTimeout(() => Social.note('Daily bonus: +' + DAILY_XP + ' XP for hopping on FortDay today!' + (dl.l1 > dl.l0 ? ' Level ' + dl.l1 + '!' : '')), 600); Sfx.init(); } }
    $('tierLbl').textContent = 'Level ' + tier; $('tierFill').style.width = ((d.seasonXp % XP_PER_LEVEL) / XP_PER_LEVEL * 100) + '%';
    [...$('modeGrid').children].forEach(b => b.classList.toggle('on', b.dataset.mode === d.mode));
    [...$('buildSeg').children].forEach(b => b.classList.toggle('on', (b.dataset.build === '1') === d.build));
    $('buildHint').textContent = d.build ? 'Harvest wood, brick and metal with your tool, then throw up walls, ramps and floors mid-fight.' : 'No construction. Use natural cover, mantle up ledges, and lean on a 50-point overshield that regenerates when you are out of combat.';
    const cur = MapRotation.current(); if (d.theme !== cur) { d.theme = cur; Profile.save(); }   // the open island (it changes every 30 days)
    this.modeBar();
    if (this.tab === 'locker') this.lockerView();
    if (this.tab === 'pass') {
      const rw = passRewards();
      const sid = Season.id(), dl = Season.daysLeft();
      $('seasonName').textContent = Season.name(); document.querySelector('.season-tag').textContent = 'Season ' + (sid + 1);
      $('seasonLeft').textContent = dl > 1 ? 'Ends in ' + dl + ' days' : dl === 1 ? 'Ends in 1 day' : 'Ends today';
      $('ticketOwn').hidden = !Profile.ticket();
      { const has = Profile.hasPass(), left = Profile.passPickLeft(), dtx = dl > 1 ? dl + ' days' : dl === 1 ? '1 day' : 'less than a day';
        $('bpCard').classList.toggle('on', has); $('bpTitle').textContent = has ? 'Battle Pass active' : 'Get the Battle Pass';
        $('bpList').innerHTML = ['<b>Diamond rank</b> right away, and you can\'t drop below Diamond this season',
          '<b>More ' + COIN + '</b>: at Diamond a good match pays ×' + RANK_COIN_MULT[PASS_RANK] + ' (up to ' + MATCH_COINS_MAX + ' a match)',
          '<b>1 free skin</b> of your choice from the Item Shop' + (has ? (left ? ' · not picked yet' : ' · claimed ✓') : '')].map(x => '<li>' + x + '</li>').join('');
        $('bpNote').textContent = has ? 'Active for ' + Season.name() + ' · ' + dtx + ' left. Get it again next season for another free skin.' : 'Lasts until ' + Season.name() + ' ends (' + dtx + '). Get it again each season for another free skin.';
        const b = $('bpBtn'); if (!b.dataset.confirm) { b.textContent = has ? (left ? 'Pick your free skin' : 'Free skin claimed ✓') : 'Buy for ' + PASS_PRICE.toLocaleString() + ' ' + COIN; b.disabled = has && !left; b.className = 'buy' + (has ? (left ? ' equip' : ' owned') : ''); }
        $('bpUsd').hidden = has; $('bpPay').hidden = !PASS_PAY_URL; if (PASS_PAY_URL) $('bpPay').href = PASS_PAY_URL;
        $('bpPayNote').textContent = PASS_PAY_URL ? 'Pay on the secure checkout page. When you finish, you come straight back here and the Battle Pass unlocks by itself.' : 'Online checkout is coming soon.'; }
      $('passLvl').textContent = 'Level ' + tier; $('passXp').textContent = (d.seasonXp % XP_PER_LEVEL).toLocaleString() + ' / ' + XP_PER_LEVEL.toLocaleString() + ' XP';
      $('passInfo').textContent = `Every level takes ${XP_PER_LEVEL.toLocaleString()} XP and pays ${LEVEL_COINS} ${COIN}. Bonus XP: 1st place +2,500 · each bird you shoot down +5,000 (and 100 ${COIN}) · each shark you defeat +2,000 · first to land +500 · your first game +5,000 · thanking the maker +1,000 once a season. Levels start over each season; anything you unlock stays yours.`;
      $('passFill').style.width = ((d.seasonXp % XP_PER_LEVEL) / XP_PER_LEVEL * 100) + '%';
      const thanked = d.thankSeason === sid; $('thankBtn').disabled = thanked; $('thankBtn').textContent = thanked ? 'Thanked ✓' : 'Thank you!';
      $('thankTxt').textContent = thanked ? 'Thanks sent for ' + Season.name() + '. You can thank the maker again next season.' : 'Say thanks to the person who made FortDay. +1,000 XP, once per season.';
      let h = '';
      for (let t = 1; t <= PASS_TIERS; t++) { const r = rw[t]; h += `<div class="tier ${t <= tier ? 'got' : ''} ${t === tier ? 'cur' : ''}"><span class="tn">${t}</span><span class="tr">${r ? esc(r.item.name) + '<br><span style="color:' + RARITY[r.item.r].css + '">' + COS_CATS.find(c => c[0] === r.cat)[1] + '</span>' : 'XP boost'}</span></div>`; }
      $('passTrack').innerHTML = h;
    }
    if (this.tab === 'career') {
      $('statGrid').innerHTML = [['Wins', d.wins], ['Matches', d.matches], ['Eliminations', d.kills], ['Top 10 finishes', d.top10], ['Chests opened', (d.chests || 0).toLocaleString()]].map(s => `<div class="stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join('');
      const ri = Profile.rankIdx();
      $('rankList').innerHTML = (Profile.hasPass() ? '<div class="hint">Battle Pass: Diamond or higher until ' + esc(Season.name()) + ' ends.</div>' : '') + RANKS.map((r, i) => `<div class="rank ${i === ri ? 'cur' : ''}"><span>${r[0]}${i === ri ? ' · ' + d.rp + ' RP' : ''}</span><i>${r[1]} RP</i></div>`).join('');
    }
  },
};
