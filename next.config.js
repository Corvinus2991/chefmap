"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, ChefHat, Users, Search, Plus, Check, ArrowRight, X, ClipboardList, UserCircle2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const FONT_DISPLAY = "'Fraunces', serif";
const FONT_BODY = "'Work Sans', sans-serif";

const COLORS = {
  bgDark: "#211D19",
  card: "#FAF6EE",
  cardAlt: "#F1EAD9",
  olive: "#6E7D4F",
  oliveDark: "#4B5636",
  saffron: "#B98A2E",
  textOnDark: "#F5F0E6",
  mutedOnDark: "#B9AF9E",
  textPrimary: "#2B2620",
  textSecondary: "#6B6252",
  border: "rgba(43,38,32,0.16)",
};

const ROLES = ["Chef", "Jefe de sala", "Camarero", "Sumiller", "Pastelero", "Otro"];

const SEED = {
  professionals: [
    {
      id: "p1",
      name: "Laura Martí",
      role: "Jefe de sala",
      restaurant: "El Celler",
      city: "Badalona",
      years: 9,
      specialties: ["marisco", "cocina catalana"],
      bio: "Jefa de sala apasionada por el servicio de proximidad y el producto de temporada.",
      email: "laura@elceller.example.com",
    },
    {
      id: "p2",
      name: "Marc Soler",
      role: "Chef",
      restaurant: "Restaurant Marea",
      city: "Barcelona",
      years: 14,
      specialties: ["mediterránea", "brasa"],
      bio: "Chef ejecutivo, 14 años de oficio entre Can Fabes y Hoffmann antes de Marea.",
      email: "",
    },
  ],
  recommendations: [
    {
      id: "r1",
      professionalId: "p1",
      place: "Marisquería Can Pau",
      zone: "Badalona",
      cuisine: "marisco",
      text: "El arroz de bogavante es lo mejor que he probado esta temporada.",
      tags: ["marisco", "celebración"],
      conflict: false,
      createdAt: Date.now() - 86400000,
    },
    {
      id: "r2",
      professionalId: "p2",
      place: "Forn de pa Sant Jordi",
      zone: "Barcelona",
      cuisine: "panadería",
      text: "El mejor pan de masa madre que se hornea en la ciudad ahora mismo.",
      tags: ["panadería"],
      conflict: false,
      createdAt: Date.now() - 40000000,
    },
  ],
};

// Coordenadas aproximadas de zonas/barrios habituales. En la versión real esto
// se sustituye por geocodificación automática al escribir la dirección.
const GEO = {
  "badalona": [41.4500, 2.2474],
  "barcelona": [41.3874, 2.1686],
  "gracia": [41.4036, 2.1526],
  "gràcia": [41.4036, 2.1526],
  "eixample": [41.3888, 2.1590],
  "born": [41.3833, 2.1833],
  "el born": [41.3833, 2.1833],
  "poble sec": [41.3745, 2.1631],
  "sarria": [41.3989, 2.1226],
  "sarrià": [41.3989, 2.1226],
  "sants": [41.3757, 2.1391],
  "gotic": [41.3833, 2.1770],
  "gòtic": [41.3833, 2.1770],
  "poblenou": [41.4036, 2.2044],
};

function hashJitter(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000;
  return [((h % 100) - 50) / 4000, (((h * 7) % 100) - 50) / 4000];
}

function getCoords(zone) {
  const key = (zone || "").trim().toLowerCase();
  const base = GEO[key] || GEO["barcelona"];
  const [jLat, jLng] = hashJitter(zone || "x");
  const known = !!GEO[key];
  return { lat: base[0] + (known ? 0 : jLat), lng: base[1] + (known ? 0 : jLng) };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function verificationLevel(pro) {
  if (pro.email || pro.linkedin) return { label: "Verificado · nivel 1", ok: true };
  return { label: "Pendiente de verificación", ok: false };
}

function Avatar({ name, size = 40 }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: COLORS.olive,
      color: COLORS.textOnDark, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: size * 0.38, flexShrink: 0,
    }}>{initials || "?"}</div>
  );
}

function Badge({ ok, label }) {
  return (
    <span style={{
      fontSize: 11, fontFamily: FONT_BODY, padding: "2px 8px", borderRadius: 20,
      background: ok ? "rgba(110,125,79,0.15)" : "rgba(185,138,46,0.18)",
      color: ok ? COLORS.oliveDark : "#8A5F1E", display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {ok && <Check size={11} />}{label}
    </span>
  );
}

function TagChips({ tags }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {tags.map((t) => (
        <span key={t} style={{
          fontSize: 11, fontFamily: FONT_BODY, color: COLORS.textSecondary,
          border: `0.5px solid ${COLORS.border}`, borderRadius: 20, padding: "2px 9px",
        }}>{t}</span>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: FONT_BODY, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 14,
  padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
  background: "#fff", color: COLORS.textPrimary,
};

export default function ChefMapApp() {
  const [data, setData] = useState(null);
  const [view, setView] = useState("feed");
  const [meId, setMeId] = useState(null);
  const [toast, setToast] = useState("");

  async function loadData() {
    const { data: professionals, error: e1 } = await supabase
      .from("professionals")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: recommendations, error: e2 } = await supabase
      .from("recommendations")
      .select("*")
      .order("created_at", { ascending: false });

    if (e1 || e2) {
      // Sin conexión a Supabase todavía (o tablas no creadas): usamos datos de ejemplo
      // para poder seguir viendo la app mientras se termina de configurar.
      setData(SEED);
      return;
    }

    setData({
      professionals: professionals.map((p) => ({ ...p, specialties: p.specialties || [] })),
      recommendations: recommendations.map((r) => ({
        ...r,
        tags: r.tags || [],
        professionalId: r.professional_id,
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  }

  useEffect(() => { loadData(); }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  if (!data) {
    return (
      <div style={{ fontFamily: FONT_BODY, padding: "3rem 1rem", textAlign: "center", color: COLORS.textSecondary }}>
        Cargando ChefMap…
      </div>
    );
  }

  const me = data.professionals.find((p) => p.id === meId) || null;

  async function addProfessional(pro) {
    const { data: inserted, error } = await supabase
      .from("professionals")
      .insert({
        name: pro.name,
        role: pro.role,
        restaurant: pro.restaurant,
        city: pro.city,
        years: pro.years,
        specialties: pro.specialties,
        bio: pro.bio,
        email: pro.email,
      })
      .select()
      .single();

    if (error) { showToast("No se pudo guardar. Revisa la conexión con Supabase."); return; }

    await loadData();
    setMeId(inserted.id);
    showToast(`Perfil de ${pro.name} creado`);
    setView("profile");
  }

  async function addRecommendation(rec) {
    const { error } = await supabase.from("recommendations").insert({
      professional_id: meId,
      place: rec.place,
      zone: rec.zone,
      cuisine: rec.cuisine,
      text: rec.text,
      tags: rec.tags,
      conflict: rec.conflict,
    });

    if (error) { showToast("No se pudo publicar. Revisa la conexión con Supabase."); return; }

    await loadData();
    showToast("Recomendación publicada");
    setView("feed");
  }

  return (
    <div style={{ background: COLORS.bgDark, borderRadius: 16, maxWidth: 460, margin: "0 auto", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Work+Sans:wght@400;500&display=swap');
      `}</style>

      <TopBar me={me} onSwitch={() => setView("whoami")} />

      <div style={{ padding: "1.1rem 1.1rem 1.4rem", minHeight: 420 }}>
        {view === "feed" && <Feed data={data} />}
        {view === "map" && <MapView data={data} />}
        {view === "profile" && (
          me ? <ProfileView pro={me} data={data} /> :
          <EmptyState
            icon={<UserCircle2 size={28} color={COLORS.saffron} />}
            title="Aún no tienes perfil profesional"
            body="Crea tu perfil para poder publicar recomendaciones firmadas con tu trayectoria."
            cta="Crear mi perfil"
            onClick={() => setView("register")}
          />
        )}
        {view === "register" && <RegisterForm onSubmit={addProfessional} onCancel={() => setView("feed")} />}
        {view === "recommend" && (
          me ? <RecommendForm onSubmit={addRecommendation} onCancel={() => setView("feed")} /> :
          <EmptyState
            icon={<ClipboardList size={28} color={COLORS.saffron} />}
            title="Necesitas un perfil profesional"
            body="Solo los profesionales verificados pueden publicar recomendaciones. Crea tu perfil primero."
            cta="Crear mi perfil"
            onClick={() => setView("register")}
          />
        )}
      </div>

      <BottomNav view={view} setView={setView} hasProfile={!!me} />

      {toast && (
        <div style={{
          position: "absolute", bottom: 78, left: "50%", transform: "translateX(-50%)",
          background: COLORS.oliveDark, color: COLORS.textOnDark, fontFamily: FONT_BODY, fontSize: 13,
          padding: "8px 16px", borderRadius: 20, whiteSpace: "nowrap",
        }}>{toast}</div>
      )}
    </div>
  );
}

function TopBar({ me }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "1rem 1.1rem 0.8rem", borderBottom: `1px solid rgba(245,240,230,0.1)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ChefHat size={20} color={COLORS.saffron} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 19, color: COLORS.textOnDark }}>ChefMap</span>
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: COLORS.mutedOnDark }}>
        {me ? `Publicando como ${me.name.split(" ")[0]}` : "Modo visitante"}
      </div>
    </div>
  );
}

function BottomNav({ view, setView, hasProfile }) {
  const items = [
    { id: "feed", label: "Feed", icon: Search },
    { id: "map", label: "Mapa", icon: MapPin },
    { id: "recommend", label: "Recomendar", icon: Plus },
    { id: "profile", label: "Perfil", icon: hasProfile ? UserCircle2 : Users },
  ];
  return (
    <div style={{ display: "flex", borderTop: "1px solid rgba(245,240,230,0.1)", background: "#1B1815" }}>
      {items.map(({ id, label, icon: Icon }) => {
        const active = view === id || (id === "profile" && view === "register");
        return (
          <button key={id} onClick={() => setView(id)} style={{
            flex: 1, background: "none", border: "none", padding: "10px 4px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            color: active ? COLORS.saffron : COLORS.mutedOnDark,
          }}>
            <Icon size={18} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 11 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ icon, title, body, cta, onClick }) {
  return (
    <div style={{ textAlign: "center", padding: "2.4rem 0.5rem" }}>
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 17, color: COLORS.textOnDark, marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.mutedOnDark, marginBottom: 18, lineHeight: 1.6 }}>{body}</div>
      <button onClick={onClick} style={{
        fontFamily: FONT_BODY, fontSize: 13, background: COLORS.saffron, color: "#2B2000",
        border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", display: "inline-flex",
        alignItems: "center", gap: 6, fontWeight: 500,
      }}>{cta} <ArrowRight size={14} /></button>
    </div>
  );
}

function RecommendationTicket({ rec, pro }) {
  if (!pro) return null;
  const v = verificationLevel(pro);
  return (
    <div style={{
      background: COLORS.card, borderRadius: 10, padding: "14px 16px 16px", marginBottom: 14,
      borderBottom: `2px dashed ${COLORS.border}`,
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Avatar name={pro.name} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14.5, color: COLORS.textPrimary }}>{pro.name}</span>
            <Badge ok={v.ok} label={v.label} />
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 }}>{pro.role} · {pro.restaurant}</div>

          <div style={{
            fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: 0.5, color: COLORS.saffron,
            textTransform: "uppercase", marginBottom: 3,
          }}>Recomienda</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15.5, color: COLORS.textPrimary, marginBottom: 2 }}>
            {rec.place} <span style={{ fontFamily: FONT_BODY, fontWeight: 400, fontSize: 12, color: COLORS.textSecondary }}>· {rec.zone}</span>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: COLORS.textPrimary, lineHeight: 1.55, margin: "6px 0 10px" }}>{rec.text}</div>
          <TagChips tags={rec.tags} />
          {rec.conflict && (
            <div style={{ marginTop: 8, fontFamily: FONT_BODY, fontSize: 11, color: "#8A5F1E" }}>
              Declara relación comercial con este local
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Feed({ data }) {
  const sorted = [...data.recommendations].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div>
      <SectionLabel text={`${sorted.length} recomendaciones de profesionales`} />
      {sorted.map((r) => (
        <RecommendationTicket key={r.id} rec={r} pro={data.professionals.find((p) => p.id === r.professionalId)} />
      ))}
    </div>
  );
}

function SectionLabel({ text }) {
  return <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: COLORS.mutedOnDark, marginBottom: 12 }}>{text}</div>;
}

function LeafletMap({ data }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function loadCss() {
      if (document.getElementById("leaflet-css")) return;
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    function loadScript() {
      return new Promise((resolve, reject) => {
        if (window.L) return resolve();
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    loadCss();
    loadScript()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = window.L;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([41.395, 2.19], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${COLORS.saffron};border:2px solid #2B2000;box-shadow:0 0 0 2px rgba(255,255,255,0.6)"></div>`,
      iconSize: [14, 14],
    });

    data.recommendations.forEach((r) => {
      const pro = data.professionals.find((p) => p.id === r.professionalId);
      const { lat, lng } = getCoords(r.zone);
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(
        `<b>${r.place}</b><br/>${r.zone}<br/><span style="color:#6B6252">recomendado por ${pro ? pro.name : "un profesional"}</span>`
      );
    });

    mapRef.current = map;
  }, [ready, data]);

  if (failed) {
    return (
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: COLORS.mutedOnDark, padding: "1rem", textAlign: "center" }}>
        No se ha podido cargar el mapa (sin conexión a internet en esta vista previa). La lista por zonas de abajo sigue funcionando.
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
      <div ref={containerRef} style={{ height: 260, width: "100%", background: COLORS.card }} />
      {!ready && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: COLORS.textSecondary, padding: "8px 12px", background: COLORS.card }}>
          Cargando mapa…
        </div>
      )}
    </div>
  );
}

function MapView({ data }) {
  const zones = {};
  data.recommendations.forEach((r) => {
    zones[r.zone] = zones[r.zone] || [];
    zones[r.zone].push(r);
  });
  const zoneNames = Object.keys(zones);
  return (
    <div>
      <LeafletMap data={data} />
      <SectionLabel text="Detalle por zona" />
      {zoneNames.length === 0 && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.mutedOnDark }}>Todavía no hay recomendaciones.</div>
      )}
      {zoneNames.map((zone) => (
        <div key={zone} style={{ background: COLORS.card, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <MapPin size={15} color={COLORS.oliveDark} />
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: COLORS.textPrimary }}>{zone}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: COLORS.textSecondary }}>· {zones[zone].length} recomendaciones</span>
          </div>
          {zones[zone].map((r) => (
            <div key={r.id} style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.textPrimary, padding: "4px 0", borderTop: `0.5px solid ${COLORS.border}` }}>
              {r.place} <span style={{ color: COLORS.textSecondary }}>· {r.cuisine}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProfileView({ pro, data }) {
  const v = verificationLevel(pro);
  const mine = data.recommendations.filter((r) => r.professionalId === pro.id);
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <Avatar name={pro.name} size={52} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, color: COLORS.textOnDark }}>{pro.name}</span>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: COLORS.mutedOnDark }}>{pro.role} · {pro.restaurant}</div>
          <div style={{ marginTop: 4 }}><Badge ok={v.ok} label={v.label} /></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, padding: "12px 0", borderTop: "1px solid rgba(245,240,230,0.12)", borderBottom: "1px solid rgba(245,240,230,0.12)", marginBottom: 14 }}>
        <Stat n={pro.years} label="años de oficio" />
        <Stat n={mine.length} label="recomendaciones" />
        <Stat n={pro.city} label="ciudad base" />
      </div>

      <div style={{ marginBottom: 14 }}><TagChips tags={pro.specialties} /></div>

      {pro.bio && <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: COLORS.textOnDark, lineHeight: 1.6, marginBottom: 18 }}>{pro.bio}</p>}

      <SectionLabel text="Sus recomendaciones" />
      {mine.length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.mutedOnDark }}>Todavía no ha publicado ninguna.</div>}
      {mine.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(245,240,230,0.1)" }}>
          <MapPin size={15} color={COLORS.mutedOnDark} />
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.textOnDark }}>{r.place} <span style={{ color: COLORS.mutedOnDark }}>· {r.zone}</span></div>
        </div>
      ))}
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 17, color: COLORS.textOnDark }}>{n}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: COLORS.mutedOnDark }}>{label}</div>
    </div>
  );
}

function TagInput({ tags, setTags, placeholder }) {
  const [draft, setDraft] = useState("");
  function commit() {
    const clean = draft.trim();
    if (clean && !tags.includes(clean)) setTags([...tags, clean]);
    setDraft("");
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: tags.length ? 8 : 0 }}>
        {tags.map((t) => (
          <span key={t} style={{
            fontSize: 12, fontFamily: FONT_BODY, background: "rgba(110,125,79,0.15)", color: COLORS.oliveDark,
            padding: "4px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            {t}
            <X size={11} style={{ cursor: "pointer" }} onClick={() => setTags(tags.filter((x) => x !== t))} />
          </span>
        ))}
      </div>
      <input
        style={inputStyle}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        onBlur={commit}
      />
    </div>
  );
}

function RegisterForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: "", role: ROLES[0], restaurant: "", city: "", years: "", bio: "", email: "",
  });
  const [specialties, setSpecialties] = useState([]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const valid = form.name && form.restaurant && form.city && form.years && specialties.length > 0;

  return (
    <div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, color: COLORS.textOnDark, marginBottom: 4 }}>Crea tu perfil profesional</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: COLORS.mutedOnDark, marginBottom: 18 }}>Esto es lo que verán los demás en tu perfil.</div>

      <div style={{ background: COLORS.card, borderRadius: 12, padding: "16px" }}>
        <Field label="Nombre completo"><input style={inputStyle} value={form.name} onChange={set("name")} placeholder="Laura Martí" /></Field>
        <Field label="Puesto actual">
          <select style={inputStyle} value={form.role} onChange={set("role")}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Establecimiento actual"><input style={inputStyle} value={form.restaurant} onChange={set("restaurant")} placeholder="Restaurant Marea" /></Field>
        <Field label="Ciudad base"><input style={inputStyle} value={form.city} onChange={set("city")} placeholder="Barcelona" /></Field>
        <Field label="Años en el oficio"><input type="number" style={inputStyle} value={form.years} onChange={set("years")} placeholder="14" /></Field>
        <Field label="Especialidades"><TagInput tags={specialties} setTags={setSpecialties} placeholder="mediterránea, brasa… (Enter para añadir)" /></Field>
        <Field label="Biografía corta"><textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={form.bio} onChange={set("bio")} placeholder="Cuéntanos tu trayectoria en pocas palabras…" /></Field>
        <Field label="Email corporativo (opcional, sube tu nivel de verificación)"><input style={inputStyle} value={form.email} onChange={set("email")} placeholder="laura@elrestaurante.com" /></Field>

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={onCancel} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 13, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 0", cursor: "pointer" }}>Cancelar</button>
          <button
            disabled={!valid}
            onClick={() => onSubmit({ ...form, years: Number(form.years) || 0, specialties })}
            style={{
              flex: 1, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: "#2B2000",
              background: valid ? COLORS.saffron : "#D8C7A0", border: "none", borderRadius: 8, padding: "9px 0",
              cursor: valid ? "pointer" : "not-allowed",
            }}
          >Crear perfil</button>
        </div>
      </div>
    </div>
  );
}

function RecommendForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ place: "", zone: "", cuisine: "", text: "", conflict: false });
  const [tags, setTags] = useState([]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.place && form.zone && form.text;

  return (
    <div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, color: COLORS.textOnDark, marginBottom: 4 }}>Nueva recomendación</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: COLORS.mutedOnDark, marginBottom: 18 }}>Firmada con tu perfil profesional.</div>

      <div style={{ background: COLORS.card, borderRadius: 12, padding: "16px" }}>
        <Field label="Nombre del local"><input style={inputStyle} value={form.place} onChange={set("place")} placeholder="Marisquería Can Pau" /></Field>
        <Field label="Zona / ciudad"><input style={inputStyle} value={form.zone} onChange={set("zone")} placeholder="Badalona" /></Field>
        <Field label="Tipo de cocina"><input style={inputStyle} value={form.cuisine} onChange={set("cuisine")} placeholder="marisco" /></Field>
        <Field label="¿Por qué lo recomiendas?"><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={form.text} onChange={set("text")} placeholder="El arroz de bogavante es lo mejor que he probado esta temporada." /></Field>
        <Field label="Etiquetas"><TagInput tags={tags} setTags={setTags} placeholder="celebración, brunch… (Enter para añadir)" /></Field>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_BODY, fontSize: 12.5, color: COLORS.textSecondary, marginBottom: 16 }}>
          <input type="checkbox" checked={form.conflict} onChange={(e) => setForm({ ...form, conflict: e.target.checked })} />
          Tengo una relación comercial con este local (socio, proveedor, familiar)
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 13, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 0", cursor: "pointer" }}>Cancelar</button>
          <button
            disabled={!valid}
            onClick={() => onSubmit({ ...form, tags })}
            style={{
              flex: 1, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: "#2B2000",
              background: valid ? COLORS.saffron : "#D8C7A0", border: "none", borderRadius: 8, padding: "9px 0",
              cursor: valid ? "pointer" : "not-allowed",
            }}
          >Publicar</button>
        </div>
      </div>
    </div>
  );
}
