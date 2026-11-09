// 여러 사람 연결: Firebase(익명 로그인 + Realtime Database)
// firebaseConfig가 없거나 연결에 실패하면 같은 모양의 "혼자 모드"로 대신 동작해요.
import { TAB_ID } from './util.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

export async function createNet(config, onStatus = () => {}){
  // claude.ai 아티팩트 안에서 열렸을 때: Claude의 내장 실시간·저장 기능 사용
  if (!config && window.claude && typeof window.claude.use === 'function') {
    try { const a = await artifactNet(onStatus); if (a) return a; } catch (e) { console.warn('[cloud-heaven] artifact 연결 실패', e); }
  }
  if (!config) { onStatus('solo'); return soloNet('config'); }
  try { return await firebaseNet(config, onStatus); }
  catch (e) {
    console.error('[cloud-heaven] Firebase 연결 실패:', e);
    onStatus('solo');
    const code = (e && e.code) || (e && e.message) || 'unknown';
    return soloNet(code);
  }
}

// ─────────────────────────── Firebase ───────────────────────────
async function firebaseNet(cfg, onStatus){
  onStatus('connecting');
  const [appM, authM, dbM] = await Promise.all([
    import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-database.js')
  ]);
  const { ref, set, update, remove, push, onValue, query, orderByChild, limitToLast, onDisconnect, serverTimestamp, get, onChildAdded } = dbM;

  const app = appM.initializeApp(cfg);
  const auth = authM.getAuth(app);
  const cred = await authM.signInAnonymously(auth);
  const uid = cred.user.uid;
  const db = dbM.getDatabase(app);

  // 서버 시계와의 차이 (오래된 접속 정보 걸러낼 때 사용)
  let offset = 0;
  onValue(ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });
  const serverNow = () => Date.now() + offset;

  // ── 접속자(위치·모습) ──
  const myRef = ref(db, `presence/${uid}/${TAB_ID}`);
  let last = null, connected = false;
  onValue(ref(db, '.info/connected'), async s => {
    connected = !!s.val();
    onStatus(connected ? 'online' : 'connecting');
    if (connected) {
      try { await onDisconnect(myRef).remove(); if (last) await set(myRef, { ...last, hb: serverTimestamp() }); }
      catch (e) { console.warn(e); }
    }
  });
  // 가만히 있어도 20초마다 "아직 있어요" 신호
  setInterval(() => { if (last && connected) update(myRef, { hb: serverTimestamp() }).catch(() => {}); }, 20000);
  addEventListener('pagehide', () => { remove(myRef).catch(() => {}); });

  const permErr = (where, cb) => e => { console.warn(`[cloud-heaven] ${where} 읽기 실패`, e); cb && cb(e); };

  return {
    mode: 'online', uid, serverNow,
    presence: {
      set(obj){ last = obj; set(myRef, { ...obj, hb: serverTimestamp() }).catch(() => {}); },
      subscribe(cb, onErr){
        let cache = {};
        const emit = () => {
          const list = [];
          for (const u in cache) {
            const tabs = cache[u]; if (!tabs || typeof tabs !== 'object') continue;
            for (const t in tabs) {
              if (u === uid && t === TAB_ID) continue;
              const p = tabs[t]; if (!p || typeof p !== 'object') continue;
              if (typeof p.hb === 'number' && serverNow() - p.hb > 70000) continue; // 오래된 유령 접속 제외
              list.push({ key: u + '/' + t, uid: u, mine: u === uid, p });
            }
          }
          cb(list);
        };
        onValue(ref(db, 'presence'), s => { cache = s.val() || {}; emit(); }, permErr('presence', onErr));
        setInterval(emit, 15000);
      }
    },
    chat: {
      send({ nick, col, text }){ return push(ref(db, 'chat'), { uid, nick, col, text, t: serverTimestamp() }); },
      subscribe(cb, onErr){
        onChildAdded(query(ref(db, 'chat'), orderByChild('t'), limitToLast(15)), s => cb({ id: s.key, ...s.val() }), permErr('chat', onErr));
      }
    },
    guestbook: {
      add({ nick, col, text }){ return push(ref(db, 'guestbook'), { uid, nick, col, text, t: serverTimestamp() }); },
      subscribe(cb, onErr){
        onValue(query(ref(db, 'guestbook'), orderByChild('t'), limitToLast(80)), s => {
          const list = []; s.forEach(c => { list.push({ id: c.key, ...c.val() }); }); cb(list.reverse());
        }, permErr('guestbook', onErr));
      }
    },
    items: {
      async add(meta, img){
        const r = push(ref(db, 'items'));
        await set(ref(db, 'images/' + r.key), { uid, data: img });   // 사진 먼저
        await set(r, { ...meta, uid, t: serverTimestamp() });
        return r.key;
      },
      async remove(id){
        await remove(ref(db, 'comments/' + id)).catch(() => {});   // 코멘트 → 물건 → 사진 순서로 지우기
        await remove(ref(db, 'items/' + id));
        await remove(ref(db, 'images/' + id)).catch(() => {});
      },
      subscribe(cb, onErr){
        onValue(query(ref(db, 'items'), orderByChild('t'), limitToLast(40)), s => {
          const list = []; s.forEach(c => { list.push({ id: c.key, ...c.val() }); }); cb(list.reverse());
        }, permErr('items', onErr));
      },
      image: cachedImage(id => get(ref(db, `images/${id}/data`)).then(s => s.val()))
    },
    // 익명 코멘트: 누가 썼는지(uid)를 저장하지 않아요
    comments: {
      add(itemId, text){ return push(ref(db, `comments/${itemId}`), { text, t: serverTimestamp() }); },
      remove(itemId, cid){ return remove(ref(db, `comments/${itemId}/${cid}`)); },
      subscribe(cb, onErr){
        onValue(ref(db, 'comments'), s => {
          const out = {};
          s.forEach(it => { const list = []; it.forEach(c => { list.push({ id: c.key, ...c.val() }); }); list.sort((a, b) => (a.t || 0) - (b.t || 0)); out[it.key] = list; });
          cb(out);
        }, permErr('comments', onErr));
      }
    },
    votes: {
      set(itemId, v){ return set(ref(db, `votes/${uid}/${itemId}`), v || null); },
      subscribe(cb, onErr){ onValue(ref(db, 'votes'), s => cb(s.val() || {}), permErr('votes', onErr)); }
    }
  };
}

function cachedImage(load){
  const cache = new Map();
  return id => {
    if (!cache.has(id)) cache.set(id, load(id).catch(() => { cache.delete(id); return null; }));
    return cache.get(id);
  };
}

// ─────────────────────── claude.ai 아티팩트 ───────────────────────
// room(지금 접속한 사람끼리 실시간) + db(계속 남는 데이터) + user(내 아이디)
async function artifactNet(onStatus){
  const use = n => Promise.resolve(window.claude.use(n)).catch(() => null);
  const [room, db, user] = await Promise.all([use('room'), use('db'), use('user')]);
  if (!room && !db) return null;
  let uid = null; try { uid = user ? await user.id() : null; } catch (e) {}
  if (!uid) uid = 'tab-' + TAB_ID;

  // 채팅은 서버에 저장하지 않고, 각자의 접속 정보(presence)에 최근 4개를 실어 보내요
  let lastObj = {}, myChat = [], chatN = 0;
  const chatSubs = [], seen = new Set();
  const pushPresence = () => { if (room) room.presence({ ...lastObj, uid, chat: myChat }).catch(() => {}); };
  const deliver = m => { if (seen.has(m.id)) return; seen.add(m.id); chatSubs.forEach(f => f(m)); };

  let peerSubs = [];
  if (room) {
    room.onConnection(c => onStatus(c ? 'online' : 'connecting'), () => onStatus('solo'));
    room.onPeers(ch => {
      const list = [];
      for (const p of ch.peers) {
        if (p.sameTab || p.kind !== 'viewer') continue;
        const pr = p.presence || {};
        if (typeof pr.x !== 'number') continue;
        const pu = p.by || (typeof pr.uid === 'string' ? pr.uid : p.peer);
        list.push({ key: p.peer, uid: pu, mine: p.isMe, p: pr });
        if (Array.isArray(pr.chat)) for (const m of pr.chat.slice(-6)) {
          if (!m || typeof m !== 'object' || typeof m.n !== 'number') continue;
          deliver({ id: p.peer + ':' + m.n, uid: pu, nick: m.nick, col: m.col, text: m.text, t: m.t });
        }
      }
      peerSubs.forEach(f => f(list));
    }, () => onStatus('solo'));
  } else onStatus('solo');

  const noDb = () => Promise.reject(new Error('no-db'));
  const coll = (name, n) => db.collection(name).orderBy('t', 'desc').limit(n);
  const snapList = s => s.docs.map(d => ({ id: d.id, ...d.data() }));

  let myVotes = {}, voteChain = Promise.resolve();

  return {
    mode: 'online', uid, serverNow: () => Date.now(),
    presence: {
      set(obj){ lastObj = obj; pushPresence(); },
      subscribe(cb){ peerSubs.push(cb); setTimeout(() => cb([]), 0); }
    },
    chat: {
      send({ nick, col, text }){
        const m = { n: ++chatN, t: Date.now(), nick, col, text };
        myChat = [...myChat, m].slice(-4); pushPresence();
        deliver({ id: 'me:' + m.n, uid, nick, col, text, t: m.t });
        return Promise.resolve();
      },
      subscribe(cb){ chatSubs.push(cb); }
    },
    guestbook: {
      add({ nick, col, text }){ return db ? db.collection('guestbook').add({ uid, nick, col, text, t: Date.now() }) : noDb(); },
      subscribe(cb, onErr){ if (!db) return setTimeout(() => cb([]), 0); coll('guestbook', 80).onSnapshot(s => cb(snapList(s)), onErr); }
    },
    items: {
      async add(meta, img){
        if (!db) throw new Error('no-db');
        const r = db.collection('items').doc();
        await db.doc('images/' + r.id).set({ uid, data: img });
        await r.set({ ...meta, uid, t: Date.now() });
        return r.id;
      },
      async remove(id){
        if (!db) throw new Error('no-db');
        try { const cs = await db.collection('comments').where('item', '==', id).get(); for (const d of cs.docs) await db.doc('comments/' + d.id).delete(); } catch (e) {}
        await db.doc('items/' + id).delete(); await db.doc('images/' + id).delete().catch(() => {});
      },
      subscribe(cb, onErr){ if (!db) return setTimeout(() => cb([]), 0); coll('items', 40).onSnapshot(s => cb(snapList(s)), onErr); },
      image: cachedImage(async id => {
        if (!db) return null;
        const s = await db.doc('images/' + id).get();
        if (s.exists) return s.data().data;
        const it = await db.doc('items/' + id).get();          // 예전 버전에서 올린 물건(사진이 물건 안에 있음)
        return it.exists ? it.data().img : null;
      })
    },
    comments: {
      add(itemId, text){ return db ? db.collection('comments').add({ item: itemId, text, t: Date.now() }) : noDb(); },
      remove(itemId, cid){ return db ? db.doc('comments/' + cid).delete() : noDb(); },
      subscribe(cb, onErr){
        if (!db) return setTimeout(() => cb({}), 0);
        db.collection('comments').orderBy('t', 'desc').limit(600).onSnapshot(s => {
          const out = {};
          for (const d of s.docs) { const x = d.data(); if (!x || typeof x.item !== 'string') continue; (out[x.item] = out[x.item] || []).push({ id: d.id, text: x.text, t: x.t }); }
          for (const k in out) out[k].reverse();
          cb(out);
        }, onErr);
      }
    },
    votes: {
      set(itemId, v){
        if (!db) return noDb();
        myVotes = { ...myVotes }; if (v) myVotes[itemId] = v; else delete myVotes[itemId];
        const snap = myVotes;
        voteChain = voteChain.then(() => db.doc('votes/' + uid).set({ v: snap, t: Date.now() }));
        return voteChain;
      },
      subscribe(cb, onErr){
        if (!db) return setTimeout(() => cb({}), 0);
        db.collection('votes').onSnapshot(s => {
          const out = {};
          for (const d of s.docs) { const x = d.data(); if (x && x.v && typeof x.v === 'object') out[d.id] = x.v; }
          if (out[uid]) myVotes = { ...out[uid] };
          cb(out);
        }, onErr);
      }
    }
  };
}

// ─────────────────────────── 혼자 모드 ───────────────────────────
// 서버 없이 이 창 안에서만 동작 (새로고침하면 사라짐)
function soloNet(reason){
  const uid = 'solo';
  const subs = { chat: [], guestbook: [], items: [], votes: [], comments: [] };
  const data = { guestbook: [], items: [], images: new Map(), votes: {}, comments: {} };
  const fire = k => subs[k].forEach(f => f(k === 'votes' || k === 'comments' ? data[k] : data[k].slice().reverse()));
  let n = 0; const id = () => 'l' + Date.now().toString(36) + (n++);
  return {
    mode: 'solo', reason, uid, serverNow: () => Date.now(),
    presence: { set(){}, subscribe(cb){ setTimeout(() => cb([]), 0); } },
    chat: {
      send(m){ const msg = { id: id(), uid, ...m, t: Date.now() }; subs.chat.forEach(f => f(msg)); return Promise.resolve(); },
      subscribe(cb){ subs.chat.push(cb); }
    },
    guestbook: {
      add(m){ data.guestbook.push({ id: id(), uid, ...m, t: Date.now() }); fire('guestbook'); return Promise.resolve(); },
      subscribe(cb){ subs.guestbook.push(cb); setTimeout(() => fire('guestbook'), 0); }
    },
    items: {
      add(meta, img){ const k = id(); data.images.set(k, img); data.items.push({ id: k, ...meta, uid, t: Date.now() }); fire('items'); return Promise.resolve(k); },
      remove(k){ data.items = data.items.filter(i => i.id !== k); data.images.delete(k); delete data.comments[k]; fire('items'); fire('comments'); return Promise.resolve(); },
      subscribe(cb){ subs.items.push(cb); setTimeout(() => fire('items'), 0); },
      image: k => Promise.resolve(data.images.get(k) || null)
    },
    comments: {
      add(itemId, text){ data.comments = { ...data.comments, [itemId]: [...(data.comments[itemId] || []), { id: id(), text, t: Date.now() }] }; fire('comments'); return Promise.resolve(); },
      remove(itemId, cid){ data.comments = { ...data.comments, [itemId]: (data.comments[itemId] || []).filter(c => c.id !== cid) }; fire('comments'); return Promise.resolve(); },
      subscribe(cb){ subs.comments.push(cb); setTimeout(() => fire('comments'), 0); }
    },
    votes: {
      set(itemId, v){ data.votes[uid] = { ...(data.votes[uid] || {}) }; if (v) data.votes[uid][itemId] = v; else delete data.votes[uid][itemId]; fire('votes'); return Promise.resolve(); },
      subscribe(cb){ subs.votes.push(cb); setTimeout(() => fire('votes'), 0); }
    }
  };
}
