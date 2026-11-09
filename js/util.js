// 공용 도우미와 상수
export const $ = id => document.getElementById(id);

export const store = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};

// 제어문자·보이지 않는 문자를 지우고 길이 제한
export const clip = (s, n) => (typeof s === 'string' ? s : '')
  .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁤﻿]/g, '').trim().slice(0, n);

// 숫자가 아니거나 범위를 벗어나면 기본값/경계값
export const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : d;

export const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

export const COLORS = ['#f7a8c4','#a9c8ff','#b9e4c9','#ffd59a','#cdb8ff','#ff9f8e','#8fd8e0','#f4f0ff','#ffe066','#c8a2e8'];
export const HATS = [
  { id: 'halo', name: '후광', ic: '😇' },
  { id: 'crown', name: '왕관', ic: '👑' },
  { id: 'flower', name: '꽃', ic: '🌸' },
  { id: 'none', name: '없음', ic: '🙂' }
];
export const HAIRS = [
  { id: 'short', name: '짧은머리', ic: '👦' },
  { id: 'bob',   name: '단발머리', ic: '👧' },
  { id: 'long',  name: '긴머리',   ic: '👩' },
  { id: 'perm',  name: '파마머리', ic: '👩‍🦱' },
  { id: 'pony',  name: '묶은머리', ic: '🎀' }
];
export const HAIR_COLORS = ['#3b2a26','#6b4226','#b07a4a','#e8c37a','#f2a7c3','#9db8f0','#d7d2e2'];
export const EMOTES = ['👋','😂','❤️','👏','🙏','✨','🤔'];

// 이 창(탭)만의 아이디: 같은 사람이 창을 두 개 열어도 따로 보이게
export const TAB_ID = Math.random().toString(36).slice(2, 10);
