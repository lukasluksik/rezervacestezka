import React, { useEffect, useState } from "react";

const OWNER_EMAIL = "dvorekboys@seznam.cz";
const MAX_PEOPLE = 8;
const SLOT_INTERVAL_MIN = 5;
const START_TIME = { h: 18, m: 30 };
const END_TIME = { h: 21, m: 30 };

function pad(n) {
  return n.toString().padStart(2, "0");
}

function timeToString(h, m) {
  return `${pad(h)}:${pad(m)}`;
}

function genSlots() {
  const slots = [];
  let h = START_TIME.h;
  let m = START_TIME.m;
  while (h < END_TIME.h || (h === END_TIME.h && m <= END_TIME.m)) {
    slots.push({ time: timeToString(h, m), id: `${h}-${m}` });
    m += SLOT_INTERVAL_MIN;
    while (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  return slots;
}

const STORAGE_KEY = "rezervace_demo_v1";

export default function App() {
  const slots = genSlots();
  const [bookings, setBookings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", people: 1 });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }, [bookings]);

  function availableFor(slotId) {
    const taken = bookings[slotId] || [];
    const occupied = taken.reduce((acc, b) => acc + (b.people || 1), 0);
    return Math.max(0, MAX_PEOPLE - occupied);
  }

  function openSlot(slot) {
    setSelectedSlot(slot);
    setForm({ name: "", email: "", people: 1 });
    setStatus(null);
  }

  function closeModal() {
    setSelectedSlot(null);
    setStatus(null);
  }

  async function sendReservationToServer(booking) {
    const API = process.env.REACT_APP_API_URL || '';
    const url = (API ? API : '') + '/api/reserve';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    return resp.json();
  }

  async function submitReservation(e) {
    e.preventDefault();
    if (!selectedSlot) return;
    if (!form.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setStatus({ type: "error", message: "Vyplňte prosím jméno a platný e-mail." });
      return;
    }

    const free = availableFor(selectedSlot.id);
    if (form.people > free) {
      setStatus({ type: "error", message: `Ve vybraném slotu zbývá ${free} míst.` });
      return;
    }

    const newBooking = {
      slot: selectedSlot.time,
      slotId: selectedSlot.id,
      name: form.name.trim(),
      email: form.email.trim(),
      people: Number(form.people),
    };

    // optimisticky uložíme lokálně
    setBookings((prev) => {
      const next = { ...prev };
      if (!next[selectedSlot.id]) next[selectedSlot.id] = [];
      next[selectedSlot.id].push({ ...newBooking, id: Date.now(), createdAt: new Date().toISOString() });
      return next;
    });

    setStatus({ type: "loading", message: "Odesílám potvrzení..." });

    try {
      const resp = await sendReservationToServer(newBooking);
      if (resp && resp.ok) {
        setStatus({ type: "success", message: "Rezervace byla úspěšně vytvořena. Potvrzení bylo odesláno e-mailem." });
      } else {
        setStatus({ type: "warning", message: "Rezervace uložena, ale odeslání e-mailu se nezdařilo." });
      }
      setTimeout(() => closeModal(), 900);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Chyba při odeslání. Zkuste to prosím později." });
    }
  }

  function renderStatus() {
    if (!status) return null;
    const base = { padding: '8px', borderRadius: '6px', fontSize: '14px' };
    if (status.type === "error") return <div style={{...base, background:'#b91c1c', color:'#fff'}}>{status.message}</div>;
    if (status.type === "success") return <div style={{...base, background:'#15803d', color:'#fff'}}>{status.message}</div>;
    if (status.type === "loading") return <div style={{...base, background:'#f59e0b', color:'#000'}}>{status.message}</div>;
    return <div style={{...base, background:'#e5e7eb'}}>{status.message}</div>;
  }

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#000', color:'#fff', padding:16}}>
      <div style={{width:'100%', maxWidth:1024, background:'linear-gradient(180deg,#0f172a,#000)', borderRadius:16, overflow:'hidden', boxShadow:'0 10px 30px rgba(0,0,0,0.6)'}}>
        <header style={{padding:24, borderBottom:'1px solid #4b0000', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h1 style={{fontSize:24, fontWeight:800}}>Rezervační formulář — Stezka</h1>
          <div style={{fontSize:14, color:'#f87171'}}>18:30 — 21:30 • sloty po 5 minutách • max {MAX_PEOPLE} osob</div>
        </header>

        <main style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:24, padding:24}}>
          <section>
            <h2 style={{fontSize:18, fontWeight:600, marginBottom:12}}>Vyberte časový slot</h2>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
              {slots.map((s) => {
                const free = availableFor(s.id);
                const isFull = free === 0;
                const style = {
                  borderRadius:10, padding:12, textAlign:'center', fontSize:14, boxShadow:'0 3px 8px rgba(0,0,0,0.3)',
                  background: isFull ? '#374151' : '#9ca3af',
                  color: isFull ? '#9ca3af' : '#fff',
                  cursor: isFull ? 'not-allowed' : 'pointer'
                };
                return (
                  <button key={s.id} onClick={() => !isFull && openSlot(s)} style={style} disabled={isFull} title={isFull ? 'Slot plný' : `Volných míst: ${free}`}>
                    <div style={{fontFamily:'monospace', fontSize:16}}>{s.time}</div>
                    <div style={{fontSize:12, marginTop:6}}>Volno: {free}</div>
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:12, fontSize:12, color:'#9ca3af'}}>Poznámka: zobrazené volné místo je orientační — v reálném provozu řešte synchronizaci přes server.</div>
          </section>

          <aside style={{background:'linear-gradient(180deg,#7f1d1d,#000)', padding:16, borderRadius:12}}>
            <h3 style={{fontSize:16, fontWeight:700}}>Informace o rezervaci</h3>
            <p style={{color:'#e5e7eb'}}>Vyberte slot a vyplňte jméno a e-mail. Potvrzení přijde na e-mail rezervujícího a kopie na váš e-mail ({OWNER_EMAIL}).</p>
            <div style={{marginTop:12}}>
              <div style={{fontSize:12, color:'#e5e7eb'}}>Počet rezervací / slot</div>
              <div style={{fontSize:24, fontWeight:800}}>{MAX_PEOPLE}</div>
            </div>
            <div style={{marginTop:12, fontSize:12, color:'#e5e7eb'}}>Aktuální obsazenost (příklad):</div>
            <div style={{marginTop:8}}>
              {slots.slice(0,6).map(s => <div key={s.id} style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#e5e7eb', paddingTop:4}}><div>{s.time}</div><div>{MAX_PEOPLE - availableFor(s.id)}/{MAX_PEOPLE}</div></div>)}
            </div>
            <div style={{marginTop:12, fontSize:12, color:'#e5e7eb'}}>Design: červeno-černé provedení, šedivé sloty. Volné mají bílé písmo.</div>
          </aside>
        </main>

        <footer style={{padding:16, borderTop:'1px solid #4b0000', textAlign:'center', color:'#9ca3af'}}>© {new Date().getFullYear()} Rezervační systém — demo</footer>
      </div>

      {selectedSlot && (
        <div style={{position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
          <div onClick={closeModal} style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.7)'}} />
          <div style={{position:'relative', background:'#fff', color:'#000', borderRadius:12, maxWidth:480, width:'100%', padding:20, boxShadow:'0 20px 50px rgba(0,0,0,0.6)'}}>
            <h3 style={{fontSize:18, fontWeight:700}}>Rezervace {selectedSlot.time}</h3>
            <form onSubmit={submitReservation} style={{marginTop:12, display:'grid', gap:10}}>
              <div>
                <label style={{display:'block', fontSize:14}}>Jméno a příjmení</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required style={{width:'100%', padding:8, borderRadius:6, border:'1px solid #d1d5db'}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:14}}>E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required style={{width:'100%', padding:8, borderRadius:6, border:'1px solid #d1d5db'}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:14}}>Počet osob (max {MAX_PEOPLE})</label>
                <input type="number" min={1} max={MAX_PEOPLE} value={form.people} onChange={e => setForm(f => ({...f, people: e.target.value}))} style={{width:120, padding:8, borderRadius:6, border:'1px solid #d1d5db'}} />
                <div style={{fontSize:12, color:'#6b7280', marginTop:6}}>Zbývá míst: {availableFor(selectedSlot.id)}</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8}}>
                <div style={{display:'flex', gap:8}}>
                  <button type="button" onClick={closeModal} style={{padding:'8px 14px', borderRadius:8, background:'#e5e7eb'}}>Zavřít</button>
                  <button type="submit" style={{padding:'8px 14px', borderRadius:8, background:'#dc2626', color:'#fff'}}>Potvrdit rezervaci</button>
                </div>
                <div>{renderStatus()}</div>
              </div>
            </form>
            <div style={{marginTop:10, fontSize:12, color:'#6b7280'}}>Poznámka: po rozšíření na server bude odesláno potvrzení na zadaný e-mail a kopie na váš e-mail ({OWNER_EMAIL}).</div>
          </div>
        </div>
      )}
    </div>
  );
}
