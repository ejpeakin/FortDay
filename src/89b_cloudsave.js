// =====================================================================
//  Cloud save: a signed-in player's progress lives on their account (Supabase table "progress",
//  see supabase/schema.sql), so clearing the browser, switching devices or opening the game from a
//  different link doesn't lose it. Signed out, progress stays in this browser only, as before.
//  Device settings (controls, graphics, music, last mode picked) stay per device.
// =====================================================================
const CLOUD_LOCAL = ['sens', 'shadows', 'gfx', 'gfxV', 'perf', 'fov', 'keys', 'musVol', 'musOn', 'mode', 'build', 'theme', 'ranked', 'dev', 'ownerCsv', 'tutAsked', 'name', 'acct'];
const CloudSave = {
  uid: null, on: false, busy: false, dirtyT: 0, lastUp: 0, timer: 0,
  // how much has been played on a save: the bigger one wins when two saves meet
  score(d) { return d ? (+d.xp || 0) + (+d.matches || 0) * 40 + (+d.wins || 0) * 300 + Object.keys(d.owned || {}).length * 400 + (+d.coins || 0) * 0.5 : 0; },
  async signedIn() {
    const sb = Social.sb, u = Social.user; if (!sb || !u) return;
    this.uid = u.id; this.on = false;
    const { data, error } = await sb.rpc('load_progress');
    if (Social.user !== u) return;   // signed out (or into another account) while loading
    if (error) { console.warn('FortDay cloud save is not set up yet (run supabase/schema.sql again):', error.message); return; }
    const d = Profile.d, cloud = data && typeof data === 'object' ? data : null;
    const mine = d.acct === u.id, other = d.acct && d.acct !== u.id, daily0 = d.lastDaily || 0;   // this browser's save belongs to this account / to someone else's account
    let msg = '';
    if (cloud && (other || this.score(cloud) > this.score(d))) {
      // the account's save is the real one: take its progress, keep this device's settings
      const keep = {}; for (const k of CLOUD_LOCAL) if (k in d) keep[k] = d[k];
      const ownedHere = other ? {} : Object.assign({}, d.owned);
      for (const k of Object.keys(d)) if (!CLOUD_LOCAL.includes(k)) delete d[k];
      Object.assign(d, cloud, keep);
      d.eq = Object.assign({}, Profile.defEq, cloud.eq || {}); d.owned = Object.assign(ownedHere, cloud.owned || {});
      msg = 'Your saved progress was loaded from your account.';
    } else if (other && !cloud) {
      // a brand-new account in a browser that holds someone else's progress: start this account fresh
      const keep = {}; for (const k of CLOUD_LOCAL) if (k in d) keep[k] = d[k];
      for (const k of Object.keys(d)) delete d[k];
      Object.assign(d, JSON.parse(JSON.stringify(Profile.fresh)), keep);
      msg = 'New account: your progress starts here and is saved online.';
    } else {
      if (cloud) d.owned = Object.assign({}, cloud.owned || {}, d.owned);   // this browser is ahead: keep it, plus anything the account owned
      if (!mine) msg = 'Your progress is now saved to your account. Sign in on any device to keep playing where you left off.';
    }
    if (!other) d.lastDaily = Math.max(d.lastDaily || 0, daily0);   // today's daily bonus counts once, whichever save wins
    d.acct = u.id; this.on = true; this.logPlay('visit');
    sb.rpc('am_owner').then(({ data }) => { Players.owner = data === true; Players.db = null; Lobby.refresh(); }, () => {});   // the owner gets the Players tab
    try { localStorage.setItem('stormbreak.v1', JSON.stringify(d)); } catch (e) { /* ignore */ }
    if (typeof Profile.syncSeason === 'function') Profile.syncSeason();
    Lobby.refresh(); HUD.dirty = true;
    await this.upload();
    if (msg) Social.note(msg);
  },
  // for the owner's player list (Supabase: owner.player_activity): a visit when you sign in, a match each time you drop in
  logPlay(kind) { if (!this.on || !Social.sb) return; Social.sb.rpc('log_play', { kind }).then(({ error }) => { if (error) console.warn('FortDay play log:', error.message); }, () => {}); },
  signedOut() { this.on = false; this.uid = null; clearTimeout(this.timer); if (Players.owner) { Players.owner = false; Players.db = null; Lobby.refresh(); } },
  // every Profile.save() while signed in: upload a few seconds later (many saves in a row become one upload)
  dirty() { if (!this.on) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.upload(), 4000); },
  async upload() {
    if (!this.on || !Social.sb || !Social.user || Social.user.id !== this.uid) return;
    if (this.busy) { this.dirty(); return; }
    this.busy = true; clearTimeout(this.timer);
    try {
      const { error } = await Social.sb.rpc('save_progress', { p: Profile.d });
      if (error) console.warn('FortDay cloud save failed:', error.message); else this.lastUp = Date.now();
    } catch (e) { console.warn('FortDay cloud save failed', e); }
    this.busy = false;
  },
};
Profile.onSave = () => CloudSave.dirty();
// leaving the page: send what's left right away
addEventListener('visibilitychange', () => { if (document.hidden && CloudSave.on && CloudSave.timer) CloudSave.upload(); });
