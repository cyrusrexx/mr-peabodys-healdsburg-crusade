// Iggy's three on their cards at the counter: fries in a red carton, the Iggy Burger, a strawberry milkshake. Drawn
// for the Iggy's first drawn in code (art/iggys.mjs, in the history at 104c585); the room is Cyrus's painting now
// (assets/iggys.webp). One of each is on screen at a time, so their gradients' ids are their own.
export const SHOP_ART = {
  fries: `<svg viewBox="0 0 120 120"><defs>
<linearGradient id="igFry" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e09a12"/><stop offset=".45" stop-color="#ffdc5a"/><stop offset="1" stop-color="#e3a01a"/></linearGradient>
<linearGradient id="igTip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c47612" stop-opacity=".55"/><stop offset=".25" stop-color="#c47612" stop-opacity="0"/></linearGradient>
<linearGradient id="igBox" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8261e"/><stop offset=".35" stop-color="#ec4d40"/><stop offset="1" stop-color="#b52a20"/></linearGradient></defs>
<ellipse cx="60" cy="114" rx="34" ry="5" fill="#3a1a0a" opacity=".25"/>
<g fill="url(#igFry)"><rect x="31" y="22" width="11" height="64" rx="3" transform="rotate(-16 36 72)"/><rect x="43" y="12" width="11" height="70" rx="3" transform="rotate(-7 48 72)"/><rect x="56" y="6" width="11" height="74" rx="3"/><rect x="68" y="12" width="11" height="70" rx="3" transform="rotate(8 73 72)"/><rect x="79" y="22" width="11" height="64" rx="3" transform="rotate(17 84 72)"/><rect x="50" y="24" width="10" height="60" rx="3" transform="rotate(3 55 72)"/><rect x="62" y="20" width="10" height="62" rx="3" transform="rotate(-4 67 72)"/></g>
<g fill="url(#igTip)"><rect x="31" y="22" width="11" height="64" rx="3" transform="rotate(-16 36 72)"/><rect x="43" y="12" width="11" height="70" rx="3" transform="rotate(-7 48 72)"/><rect x="56" y="6" width="11" height="74" rx="3"/><rect x="68" y="12" width="11" height="70" rx="3" transform="rotate(8 73 72)"/><rect x="79" y="22" width="11" height="64" rx="3" transform="rotate(17 84 72)"/></g>
<path d="M22,52 C40,63 80,63 98,52 L88,112 L32,112Z" fill="url(#igBox)"/><path d="M22,52 C40,63 80,63 98,52 L97,59 C80,70 40,70 23,59Z" fill="#fff" opacity=".22"/>
<path d="M31,66 L38,108" stroke="#fff" stroke-width="4" opacity=".22" stroke-linecap="round"/>
<circle cx="60" cy="88" r="14" fill="#fff8ec"/><path d="M49,88 c4,-6 14,-6 18,0 c-4,6 -14,6 -18,0z" fill="#d8342a"/><path d="M66,88 l6,-5 v10z" fill="#d8342a"/><circle cx="61" cy="86.5" r="1.6" fill="#fff8ec"/></svg>`,

  burger: `<svg viewBox="0 0 120 120"><defs>
<radialGradient id="igBun" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffd385"/><stop offset=".55" stop-color="#eba043"/><stop offset="1" stop-color="#b8681c"/></radialGradient>
<linearGradient id="igPat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4a24"/><stop offset="1" stop-color="#4e2410"/></linearGradient>
<linearGradient id="igBot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eba043"/><stop offset="1" stop-color="#b8681c"/></linearGradient></defs>
<ellipse cx="60" cy="111" rx="46" ry="6" fill="#3a1a0a" opacity=".25"/>
<path d="M17,90 L103,90 C103,104 95,108 87,108 L33,108 C25,108 17,104 17,90Z" fill="url(#igBot)"/>
<rect x="13" y="74" width="94" height="19" rx="9.5" fill="url(#igPat)"/><path d="M27,78 l9,10 M45,77 l9,11 M63,77 l9,11 M81,78 l9,10" stroke="#2e1206" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>
<path d="M13,71 L107,71 L105,78 L95,90 L89,79 L73,88 L63,78 L49,90 L41,79 L25,86 L15,78Z" fill="#ffc83a"/><path d="M15,72 L105,72" stroke="#fff3a6" stroke-width="2.5"/>
<rect x="16" y="62" width="88" height="11" rx="5.5" fill="#e8453a"/><rect x="24" y="64" width="18" height="3" rx="1.5" fill="#ff9a8a"/>
<path d="M9,64 q7,-9 14,0 q7,-9 14,0 q7,-9 14,0 q7,-9 14,0 q7,-9 14,0 q7,-9 14,0 q7,-9 14,0 L111,70 L9,70Z" fill="#6cc04a"/><path d="M9,68 L111,68" stroke="#4e9a32" stroke-width="2"/>
<path d="M13,63 C13,18 107,18 107,63Z" fill="url(#igBun)"/><ellipse cx="42" cy="37" rx="15" ry="6" fill="#fff" opacity=".35" transform="rotate(-20 42 37)"/>
<g fill="#fff6dc"><ellipse cx="38" cy="50" rx="3.6" ry="2" transform="rotate(-25 38 50)"/><ellipse cx="54" cy="38" rx="3.6" ry="2" transform="rotate(-10 54 38)"/><ellipse cx="70" cy="34" rx="3.6" ry="2" transform="rotate(10 70 34)"/><ellipse cx="84" cy="44" rx="3.6" ry="2" transform="rotate(25 84 44)"/><ellipse cx="62" cy="50" rx="3.6" ry="2" transform="rotate(5 62 50)"/><ellipse cx="78" cy="56" rx="3.6" ry="2" transform="rotate(30 78 56)"/><ellipse cx="46" cy="58" rx="3.6" ry="2" transform="rotate(-15 46 58)"/></g></svg>`,

  shake: `<svg viewBox="0 0 120 120"><defs>
<linearGradient id="igShk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e2507e"/><stop offset=".4" stop-color="#ffb3cf"/><stop offset="1" stop-color="#e2507e"/></linearGradient>
<linearGradient id="igGl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".3" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient></defs>
<ellipse cx="60" cy="114" rx="28" ry="4.5" fill="#3a1a0a" opacity=".25"/>
<g transform="rotate(16 74 34)"><rect x="70" y="2" width="9" height="56" rx="3" fill="#fff"/><g fill="#e8453a"><rect x="70" y="6" width="9" height="5"/><rect x="70" y="18" width="9" height="5"/><rect x="70" y="30" width="9" height="5"/><rect x="70" y="42" width="9" height="5"/></g></g>
<path d="M35,46 L85,46 L78,94 C74,99 46,99 42,94Z" fill="url(#igShk)"/>
<path d="M32,40 L88,40 L80,96 C76,102 44,102 40,96Z" fill="url(#igGl)" stroke="#fff" stroke-opacity=".85" stroke-width="2"/>
<path d="M38,52 L44,92" stroke="#fff" stroke-width="3.5" opacity=".55" stroke-linecap="round"/>
<rect x="54" y="99" width="12" height="9" fill="#e4eff4"/><ellipse cx="60" cy="109" rx="21" ry="5" fill="#eef6f9" stroke="#c9d9e0" stroke-width="1.5"/>
<g fill="#fffaf6"><circle cx="44" cy="39" r="11"/><circle cx="60" cy="34" r="13"/><circle cx="76" cy="39" r="11"/><circle cx="60" cy="23" r="10"/></g>
<g fill="#f2dce4"><circle cx="48" cy="45" r="5"/><circle cx="72" cy="45" r="5"/><circle cx="62" cy="40" r="5"/></g>
<g><rect x="45" y="32" width="6" height="2.4" rx="1.2" fill="#3aa39a" transform="rotate(30 48 33)"/><rect x="66" y="28" width="6" height="2.4" rx="1.2" fill="#f2b632" transform="rotate(-20 69 29)"/><rect x="72" y="38" width="6" height="2.4" rx="1.2" fill="#d8342a" transform="rotate(60 75 39)"/><rect x="53" y="40" width="6" height="2.4" rx="1.2" fill="#6fa8e8" transform="rotate(-50 56 41)"/></g>
<path d="M63,6 Q67,1 75,3" stroke="#3a7a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="62" cy="13" r="8" fill="#e01e3c"/><circle cx="59" cy="10" r="2.6" fill="#fff" opacity=".8"/></svg>`,
};
