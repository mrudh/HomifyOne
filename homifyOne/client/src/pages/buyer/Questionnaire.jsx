import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useBasket } from "../../context/BasketContext";
import { useAuth } from "../../context/AuthContext";
import SelectionsLockedNotice from "../../components/SelectionsLockedNotice";
import confetti from "canvas-confetti";

import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function derivePlotContext(plot) {
    if (!plot) return {
        roomSuggestions: []
    };
    const {
        bedrooms = 0
    } = plot;
    const rooms = [
        "Kitchen", "Living room", "Bedroom", "Bathroom",
        "Flooring throughout", "Storage & wardrobes",
        "Security & safety",
    ];
    if (bedrooms >= 3) rooms.push("Garden / outdoor space");
    return {
        roomSuggestions: rooms,
        bedrooms,
        bathrooms: plot.bathrooms
    };
}

const Q1_OPTIONS = [{
        value: "solo",
        emoji: "🧑",
        label: "Just me",
        desc: "A personal space built for one"
    },
    {
        value: "couple",
        emoji: "👫",
        label: "Couple",
        desc: "A shared home for two"
    },
    {
        value: "family_y",
        emoji: "👶",
        label: "Family with young children",
        desc: "Safety, durability, easy-clean"
    },
    {
        value: "family_t",
        emoji: "🧑‍🎓",
        label: "Family with teenagers",
        desc: "Storage, study space, flexible rooms"
    },
    {
        value: "shared",
        emoji: "🏠",
        label: "Shared home",
        desc: "Storage, privacy, durable shared spaces"
    },
];

const Q1_PET_OPTIONS = [{
        value: "pet_durable",
        label: "Yes, durability is very important"
    },
    {
        value: "pet_style",
        label: "Yes, but style still matters more"
    },
    {
        value: "pet_no",
        label: "No, pets don't affect my choices"
    },
];

const Q2_OPTIONS = [{
        value: "relax",
        emoji: "🛋️",
        label: "Relaxing & family time",
        desc: "Comfort, flooring, cosy finishes"
    },
    {
        value: "work",
        emoji: "💻",
        label: "Working or studying at home",
        desc: "Study setup, sockets, lighting"
    },
    {
        value: "cooking",
        emoji: "👨‍🍳",
        label: "Cooking & dining",
        desc: "Kitchen worktops, storage, appliances"
    },
    {
        value: "hosting",
        emoji: "🥂",
        label: "Hosting guests",
        desc: "Living room, kitchen, bathroom upgrades"
    },
    {
        value: "organised",
        emoji: "📦",
        label: "Keeping things organised",
        desc: "Fitted wardrobes, storage, utility extras"
    },
    {
        value: "mixed",
        emoji: "✨",
        label: "A bit of everything",
        desc: "Balanced mix of all areas"
    },
];

const Q2A_OPTIONS = [{
        value: "wfh_most",
        label: "Most days"
    },
    {
        value: "wfh_few",
        label: "A few days a week"
    },
    {
        value: "wfh_occ",
        label: "Occasionally"
    },
    {
        value: "wfh_rare",
        label: "Rarely"
    },
];

const Q3_OPTIONS = [{
        value: "modern",
        emoji: "⬜",
        label: "Modern",
        desc: "Sleek finishes, neutral tones, smart lighting"
    },
    {
        value: "minimal",
        emoji: "◻️",
        label: "Minimal",
        desc: "Clean lines, simple colours, hidden storage"
    },
    {
        value: "classic",
        emoji: "🏛️",
        label: "Classic",
        desc: "Traditional finishes, warm tones, timeless fittings"
    },
    {
        value: "scandi",
        emoji: "🌿",
        label: "Scandinavian",
        desc: "Light wood, soft neutrals, natural textures"
    },
    {
        value: "cosy",
        emoji: "🕯️",
        label: "Cosy / warm",
        desc: "Carpets, warm lighting, soft textures"
    },
    {
        value: "bold",
        emoji: "🎨",
        label: "Bold / statement",
        desc: "Feature walls, premium finishes, darker tones"
    },
    {
        value: "unsure",
        emoji: "🤷",
        label: "I'll decide later",
        desc: "We'll show a balanced mix of styles"
    },
];

const Q4_OPTIONS = [{
        value: "budget",
        emoji: "💰",
        label: "Staying within budget",
        desc: "Best value for money"
    },
    {
        value: "durable",
        emoji: "🔩",
        label: "Long-term durability",
        desc: "Prioritise lasting materials"
    },
    {
        value: "maintain",
        emoji: "🧹",
        label: "Easy maintenance",
        desc: "Easy-clean surfaces and finishes"
    },
    {
        value: "premium",
        emoji: "💎",
        label: "Premium look & feel",
        desc: "Higher-end extras shown first"
    },
    {
        value: "value_up",
        emoji: "📈",
        label: "Increasing property value",
        desc: "Upgrades with strong resale appeal"
    },
    {
        value: "comfort",
        emoji: "☁️",
        label: "Comfort & lifestyle",
        desc: "Lighting, flooring, fitted storage"
    },
    {
        value: "safety",
        emoji: "🔒",
        label: "Safety & security",
        desc: "Alarms, cameras, smart access"
    },
];

const Q5_OPTIONS = [{
        value: "low",
        emoji: "⚖️",
        label: "Keep it as low as possible",
        desc: "Standard and included options only"
    },
    {
        value: "little",
        emoji: "🪙",
        label: "A little on the right things",
        desc: "Practical upgrades where it counts"
    },
    {
        value: "balanced",
        emoji: "🎯",
        label: "Balanced mix",
        desc: "Best of both worlds"
    },
    {
        value: "invest",
        emoji: "💎",
        label: "Happy to invest in luxury upgrades",
        desc: "Luxury finishes and advanced extras"
    },
    {
        value: "unsure",
        emoji: "🤷",
        label: "Not sure yet",
        desc: "We'll show Essential, Recommended & Premium tiers"
    },
];

const Q6_BASE = [
    "Kitchen", "Living room", "Bedroom", "Bathroom",
    "Flooring throughout", "Storage & wardrobes",
    "Security & safety", "Garden / outdoor space",
];

const Q6A_MAP = {
    "Kitchen": {
        q: "What do you care about most in the kitchen?",
        options: ["Easy cleaning", "More storage", "Premium appearance", "Cooking convenience", "Family-friendly layout"],
    },
    "Bedroom": {
        q: "What do you want your bedroom to feel like?",
        options: ["Calm and relaxing", "Cosy and warm", "Practical with more storage", "Modern and stylish", "Multi-use including study/work"],
    },
    "Bathroom": {
        q: "What matters most in the bathroom?",
        options: ["Easy maintenance", "Premium hotel-style look", "Family-friendly durability", "Better lighting & mirrors", "Storage & organisation"],
    },
    "Living room": {
        q: "How will you mostly use the living room?",
        options: ["Relaxing", "Hosting guests", "Family time", "Watching TV / entertainment", "Multi-use space"],
    },
    "Flooring throughout": {
        q: "What flooring need is most important?",
        options: ["Easy to clean", "Soft and comfortable", "Durable for children or pets", "Premium look", "Budget-friendly"],
    },
    "Storage & wardrobes": {
        q: "What storage problem do you want to solve most?",
        options: ["Clothes & wardrobe space", "Kitchen storage", "Children's items", "Work/study items", "General hidden storage"],
    },
    "Security & safety": {
        q: "What security or safety features matter most to you?",
        options: ["Video doorbell", "CCTV cameras", "Intruder alarm system", "Smart locks & access", "Security lighting", "Child safety fittings"],
    },
    "Garden / outdoor space": {
        q: "How do you plan to use the outdoor space?",
        options: ["Relaxing", "Family use", "Hosting guests", "Low-maintenance garden", "Pets or children playing"],
    },
};

const Q7_OPTIONS = [{
        value: "value",
        emoji: "💰",
        label: "Best value options",
        desc: "Ranked by price-to-benefit"
    },
    {
        value: "popular",
        emoji: "🔥",
        label: "Most popular with similar buyers",
        desc: "What buyers like you chose"
    },
    {
        value: "style",
        emoji: "🎨",
        label: "Based on my style",
        desc: "Matched to your design preference"
    },
    {
        value: "lifestyle",
        emoji: "🛋️",
        label: "Based on my lifestyle",
        desc: "Matched to how you use your home"
    },
    {
        value: "mix",
        emoji: "✨",
        label: "Show me a mix",
        desc: "Combines budget, style, lifestyle & popularity"
    },
];

export function buildBuyerProfile(answers, plot) {
  const hMap = {
    solo: "a single occupant",
    couple: "a couple",
    family_y: "a family with young children",
    family_t: "a family with teenagers",
    shared: "a shared household",
  };
  const uMap = {
    relax: "relaxing and family time",
    work: "working from home",
    cooking: "cooking and dining",
    hosting: "hosting guests",
    organised: "keeping things organised",
    mixed: "a balanced mix of everyday activities",
  };
  const sMap = {
    modern: "modern",
    minimal: "minimal",
    classic: "classic",
    scandi: "Scandinavian",
    cosy: "cosy and warm",
    bold: "bold and statement",
  };
  const pMap = {
    budget: "good value for money",
    durable: "long-lasting materials",
    maintain: "easy-to-clean surfaces",
    premium: "a premium finish",
    value_up: "strong resale appeal",
    comfort: "comfort and liveability",
    safety: "safety and security",
  };
  const bMap = {
    low: "a tight budget",
    little: "a modest budget",
    balanced: "a balanced budget",
    invest: "a premium budget",
    unsure: "a flexible budget",
  };
  const traitMap = {
    smart_home: "smart home technology",
    entertain: "entertaining guests",
    wfh_life: "a home office setup",
    young_kids: "young children",
    teen_kids: "teenagers",
    eco: "eco-friendly choices",
    security: "home security",
    outdoor_life: "outdoor living",
    minimalist: "clutter-free spaces",
    cosy_home: "a cosy atmosphere",
    pet_life: "pet-friendly features",
    accessibility: "accessibility",
  };

  const household = hMap[answers.household];
  const hasPets = answers.hasPets && answers.petPref !== "pet_no";
  const style = sMap[answers.style];
  const budget = bMap[answers.budget];

  const uses = (answers.homeUse || [])
    .filter(u => u !== "mixed")
    .map(u => uMap[u])
    .filter(Boolean)
    .slice(0, 3);
  const usesText = answers.homeUse?.includes("mixed")
    ? "a balanced mix of everyday activities"
    : uses.length ? fmt(uses) : null;

  const priorities = (answers.priorities || [])
    .map(p => pMap[p])
    .filter(Boolean)
    .slice(0, 2);

  const traits = (answers.lifestyleTraits || [])
    .map(t => traitMap[t])
    .filter(Boolean)
    .slice(0, 3);

  const sentences = [];

  let s1 = "";
  if (household) s1 = `You're part of ${household}${hasPets ? " with pets" : ""}`;
  else if (hasPets) s1 = "You have pets at home";
  if (usesText) s1 += s1 ? `, and your home is mainly for ${usesText}` : `Your home is mainly for ${usesText}`;
  if (s1) sentences.push(s1 + ".");

  const s2Bits = [];
  if (style) s2Bits.push(`drawn to a ${style} style`);
  else if (answers.style === "unsure") s2Bits.push("open to any style");
  if (budget) s2Bits.push(`working with ${budget}`);
  if (priorities.length) s2Bits.push(`care most about ${fmt(priorities)}`);
  if (s2Bits.length) sentences.push(`You're ${fmt(s2Bits)}.`);

  if (traits.length && plot?.bedrooms) {
    sentences.push(`${cap(fmt(traits))} matter${traits.length === 1 ? "s" : ""} to you too, all across your ${plot.bedrooms}-bed home.`);
  } else if (traits.length) {
    sentences.push(`${cap(fmt(traits))} matter${traits.length === 1 ? "s" : ""} to you too.`);
  } else if (plot?.bedrooms) {
    sentences.push(`It all comes together across your ${plot.bedrooms}-bed home.`);
  }

  return sentences.join(" ");
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fmt(arr) {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

function OptionCard({ emoji, label, desc, selected, onClick, tag, multi }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={`group w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border-2 text-left
        transition-all duration-200
        ${selected
          ? "border-teal-600 bg-teal-50 shadow-[0_0_0_3px_rgba(13,148,136,0.1)]"
          : "border-stone-200 bg-white hover:border-teal-300 hover:shadow-sm"
        }`}
    >
      {emoji && (
        <span className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 mt-0.5
          ${selected ? "bg-teal-100" : "bg-stone-100 group-hover:bg-teal-50"}`}>
          {emoji}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-stone-800 leading-snug">{label}</span>
          {tag && (
            <span className="text-[9px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          )}
        </span>
        {desc && <span className="block text-xs text-stone-500 mt-0.5 leading-relaxed">{desc}</span>}
      </span>
      <span className={`flex-shrink-0 mt-1 flex items-center justify-center transition-all
        ${multi ? "w-4 h-4 rounded border-2" : "w-4 h-4 rounded-full border-2"}
        ${selected ? "bg-teal-600 border-teal-600" : "border-stone-300"}`}>
        {selected && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
    </button>
  );
}

function InlineFollowUp({ title, options, selected, onChange }) {
  return (
    <div className="mt-5 pt-5 border-t border-dashed border-stone-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
        <p className="text-sm font-semibold text-teal-700">{title}</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const lbl = typeof opt === "string" ? opt : opt.label;
          const isSelected = Array.isArray(selected) ? selected.includes(val) : selected === val;
          return (
            <OptionCard key={val} label={lbl} multi={Array.isArray(selected)}
              selected={isSelected} onClick={() => onChange(val)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ step, total }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold tracking-widest uppercase text-teal-700">
          Question {step} of {total}
        </span>
        <span className="text-xs text-stone-400 font-medium">{pct}% done</span>
      </div>
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NavRow({ onBack, onNext, canNext, nextLabel = "Next →", showBack = true }) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-100">
      {showBack
        ? <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-700 border
            border-stone-200 rounded-xl px-4 py-2.5 bg-white hover:bg-stone-50 transition">
            ← Back
          </button>
        : <span />
      }
      <button onClick={onNext} disabled={!canNext}
        className={`text-sm font-semibold px-7 py-2.5 rounded-full transition-all
          ${canNext
            ? "bg-teal-700 text-white hover:bg-teal-800 shadow-md hover:-translate-y-0.5"
            : "bg-stone-200 text-stone-400 cursor-not-allowed"
          }`}>
        {nextLabel}
      </button>
    </div>
  );
}

function PlotBanner({ plot }) {
  if (!plot) return null;
  return (
    <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 mb-6">
      <span className="text-lg">🏠</span>
      <div>
        <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">Your Plot</p>
        <p className="text-sm text-stone-700 font-medium">
          {plot.plotNumber} · {plot.development} ·{" "}
          <span className="text-stone-500">{plot.bedrooms} bed, {plot.bathrooms} bath</span>
        </p>
      </div>
    </div>
  );
}


function StartScreen({ onStart, plot, showReward }) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-800 text-xs font-semibold
        uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
        ✨ Your home, your way
      </div>
      <h1 className="text-3xl font-bold text-stone-800 leading-tight mb-3">
        Help us personalise<br />your home choices
      </h1>
      <p className="text-stone-500 text-sm leading-relaxed mx-auto mb-6">
        Answer a few quick questions so we can recommend finishes and extras
        that suit your lifestyle, budget and home needs.
      </p>
      {plot && (
        <div className="flex items-center justify-center gap-2 text-sm text-stone-600 mb-6">
          <span>🏠</span>
          <span className="font-medium">{plot.plotNumber} · {plot.development}</span>
          <span className="text-stone-400">·</span>
          <span className="text-stone-500">{plot.bedrooms} bed, {plot.bathrooms} bath</span>
        </div>
      )}
      <div className="flex items-center justify-center gap-4 text-xs text-stone-400 mb-8">
        <span>⏱ Under 2 minutes</span>
        <span>·</span>
        <span>7 questions</span>
        <span>·</span>
        <span>No commitment</span>
      </div>
      {showReward && (
        <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800
          text-xs font-medium px-4 py-2 rounded-full mb-4">
          🎁 Complete this quiz for the first time and unlock a reward
        </div>
      )}
      <button onClick={onStart}
        className="bg-teal-700 text-white font-semibold px-10 py-3 rounded-full
          hover:bg-teal-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
        Let's get started →
      </button>
    </div>
  );
}

function Q1Screen({ answers, setAnswers, onNext, onBack, plot }) {
  const hasPets = answers.hasPets || false;
  const canNext = !!answers.household && (!hasPets || !!answers.petPref);

  return (
    <div>
      <ProgressBar step={1} total={7} />
      <PlotBanner plot={plot} />
      <h2 className="text-xl font-bold text-stone-800 mb-1">Who will be living in your new home?</h2>
      <p className="text-sm text-stone-500 mb-5">Select the option that best describes your household.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Q1_OPTIONS.map((o) => (
          <OptionCard key={o.value} emoji={o.emoji} label={o.label} desc={o.desc}
            selected={answers.household === o.value}
            onClick={() => setAnswers((a) => ({ ...a, household: o.value }))}
          />
        ))}
      </div>

      <div className="mt-4"
        onClick={() => setAnswers((a) => ({ ...a, hasPets: !a.hasPets, petPref: !a.hasPets ? "" : a.petPref }))}>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all
          ${hasPets ? "border-teal-600 bg-teal-50" : "border-stone-200 bg-white hover:border-teal-300"}`}>
          <span className="text-xl">🐾</span>
          <span className="flex-1 text-sm font-medium text-stone-700">I have pets</span>
          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
            ${hasPets ? "bg-teal-600 border-teal-600" : "border-stone-300"}`}>
            {hasPets && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        </div>
      </div>

      {hasPets && (
        <InlineFollowUp
          title="Do you want your choices to be pet-friendly?"
          options={Q1_PET_OPTIONS}
          selected={answers.petPref || ""}
          onChange={(val) => setAnswers((a) => ({ ...a, petPref: val }))}
        />
      )}

      <NavRow showBack={false} canNext={canNext} onNext={onNext} />
    </div>
  );
}

function Q2Screen({ answers, setAnswers, onNext, onBack }) {
  const selected = answers.homeUse || [];
  const showWfh  = selected.includes("work");
  const canNext  = selected.length > 0 && (!showWfh || !!answers.wfhFreq);

  function toggle(val) {
    setAnswers((a) => {
      const cur = a.homeUse || [];
      let next;
      if (val === "mixed") {
        next = cur.includes("mixed") ? [] : ["mixed"];
      } else {
        const without = cur.filter((x) => x !== "mixed");
        next = without.includes(val) ? without.filter((x) => x !== val) : [...without, val];
      }
      return { ...a, homeUse: next, wfhFreq: next.includes("work") ? a.wfhFreq : undefined };
    });
  }

  return (
    <div>
      <ProgressBar step={2} total={7} />
      <h2 className="text-xl font-bold text-stone-800 mb-1">How do you mostly use your home?</h2>
      <p className="text-sm text-stone-500 mb-5">
        Select all that apply.{" "}
        <span className="text-stone-600 font-medium">"A bit of everything"</span> clears other selections.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Q2_OPTIONS.map((o) => (
          <OptionCard key={o.value} emoji={o.emoji} label={o.label} desc={o.desc}
            multi selected={selected.includes(o.value)}
            onClick={() => toggle(o.value)}
          />
        ))}
      </div>

      {showWfh && (
        <InlineFollowUp
          title="How often do you work or study from home?"
          options={Q2A_OPTIONS}
          selected={answers.wfhFreq || ""}
          onChange={(val) => setAnswers((a) => ({ ...a, wfhFreq: val }))}
        />
      )}

      <NavRow onBack={onBack} canNext={canNext} onNext={onNext} />
    </div>
  );
}

function Q3Screen({ answers, setAnswers, onNext, onBack }) {
  return (
    <div>
      <ProgressBar step={3} total={7} />
      <h2 className="text-xl font-bold text-stone-800 mb-1">Which style feels most like you?</h2>
      <p className="text-sm text-stone-500 mb-5">We'll match finishes and extras to your aesthetic.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Q3_OPTIONS.map((o) => (
          <OptionCard key={o.value} emoji={o.emoji} label={o.label} desc={o.desc}
            selected={answers.style === o.value}
            onClick={() => setAnswers((a) => ({ ...a, style: o.value }))}
          />
        ))}
      </div>
      <NavRow onBack={onBack} canNext={!!answers.style} onNext={onNext} />
    </div>
  );
}

function Q4Screen({ answers, setAnswers, onNext, onBack }) {
  const selected = answers.priorities || [];

  function toggle(val) {
    setAnswers((a) => {
      const cur  = a.priorities || [];
      const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      return { ...a, priorities: next };
    });
  }

  return (
    <div>
      <ProgressBar step={4} total={7} />
      <h2 className="text-xl font-bold text-stone-800 mb-1">What matters most when choosing upgrades?</h2>
      <p className="text-sm text-stone-500 mb-5">
        Select all that apply, this determines how we rank your recommendations.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Q4_OPTIONS.map((o) => (
          <OptionCard key={o.value} emoji={o.emoji} label={o.label} desc={o.desc}
            multi selected={selected.includes(o.value)}
            onClick={() => toggle(o.value)}
          />
        ))}
      </div>
      <NavRow onBack={onBack} canNext={selected.length > 0} onNext={onNext} />
    </div>
  );
}

function Q5Screen({ answers, setAnswers, onNext, onBack }) {
  return (
    <div>
      <ProgressBar step={5} total={7} />
      <h2 className="text-xl font-bold text-stone-800 mb-1">What is your upgrade budget preference?</h2>
      <p className="text-sm text-stone-500 mb-5">
        No commitment, this just helps us show the right tier of options.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {Q5_OPTIONS.map((o) => (
          <OptionCard key={o.value} emoji={o.emoji} label={o.label} desc={o.desc}
            selected={answers.budget === o.value}
            onClick={() => setAnswers((a) => ({ ...a, budget: o.value }))}
          />
        ))}
      </div>
      <NavRow onBack={onBack} canNext={!!answers.budget} onNext={onNext} />
    </div>
  );
}

const Q6_OPTIONS = [
  {
    value: "smart_home",
    emoji: "📱",
    label: "Smart home & tech",
    desc: "Devices, EV charging, automation",
  },
  {
    value: "entertain",
    emoji: "🥂",
    label: "I love entertaining",
    desc: "Guests, open spaces, kitchen and living focus",
  },
  {
    value: "wfh_life",
    emoji: "💻",
    label: "I work from home regularly",
    desc: "Dedicated workspace, extra sockets, lighting",
  },
  {
    value: "young_kids",
    emoji: "🧸",
    label: "Young children at home",
    desc: "Safety, durable surfaces, easy-clean finishes",
  },
  {
    value: "teen_kids",
    emoji: "🎮",
    label: "Teenagers at home",
    desc: "Study space, storage, flexible rooms",
  },
  {
    value: "eco",
    emoji: "🌱",
    label: "Eco & sustainability",
    desc: "Solar, EV, energy-efficient choices",
  },
  {
    value: "security",
    emoji: "🔒",
    label: "Home security matters",
    desc: "Alarms, cameras, smart access, lighting",
  },
  {
    value: "outdoor_life",
    emoji: "🌿",
    label: "Outdoor living",
    desc: "Garden, patio, lighting, fencing",
  },
  {
    value: "minimalist",
    emoji: "✨",
    label: "Clutter-free living",
    desc: "Hidden storage, clean lines, less is more",
  },
  {
    value: "cosy_home",
    emoji: "🕯️",
    label: "Cosy, warm home feel",
    desc: "Soft furnishings, warm lighting, carpets",
  },
  {
    value: "pet_life",
    emoji: "🐾",
    label: "Pets are part of the family",
    desc: "Durable, scratch-resistant, easy-clean",
  },
  {
    value: "accessibility",
    emoji: "♿",
    label: "Accessibility needs",
    desc: "Level access, wider doors, practical layout",
  },
];

function Q6Screen({ answers, setAnswers, onNext, onBack }) {
  const selected = answers.lifestyleTraits || [];

  function toggle(val) {
    setAnswers((a) => {
      const cur  = a.lifestyleTraits || [];
      const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      return { ...a, lifestyleTraits: next };
    });
  }

  return (
    <div>
      <ProgressBar step={6} total={7} />
      <h2 className="text-xl font-bold text-stone-800 mb-1">Which of these describe your home life?</h2>
      <p className="text-sm text-stone-500 mb-5">
        Select all that apply, this helps us fine-tune your recommendations.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Q6_OPTIONS.map((o) => (
          <OptionCard key={o.value} emoji={o.emoji} label={o.label} desc={o.desc}
            multi selected={selected.includes(o.value)}
            onClick={() => toggle(o.value)}
          />
        ))}
      </div>
      <NavRow onBack={onBack} canNext={selected.length > 0} onNext={onNext} />
    </div>
  );
}

function Q7Screen({ answers, setAnswers, onNext, onBack }) {
  return (
    <div>
      <ProgressBar step={7} total={7} />
      <h2 className="text-xl font-bold text-stone-800 mb-1">How would you like recommendations shown?</h2>
      <p className="text-sm text-stone-500 mb-5">Choose how we rank and sort results for you.</p>
      <div className="grid grid-cols-1 gap-3">
        {Q7_OPTIONS.map((o) => (
          <OptionCard key={o.value} emoji={o.emoji} label={o.label} desc={o.desc}
            selected={answers.sortPref === o.value}
            onClick={() => setAnswers((a) => ({ ...a, sortPref: o.value }))}
          />
        ))}
      </div>
      <NavRow onBack={onBack} canNext={!!answers.sortPref} onNext={onNext} />
    </div>
  );
}

function EndScreen({ buyerProfile, onSubmit, loading }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl">🏡</span>
      </div>
      <h2 className="text-2xl font-bold text-stone-800 mb-3">Your home preference profile is ready</h2>
      <p className="text-stone-500 text-sm leading-relaxed mx-auto mb-6">
        We'll use this to suggest choices and extras that match your lifestyle,
        budget and room priorities.
      </p>
      {buyerProfile && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 mb-8 text-left">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Your profile</p>
          <p className="text-sm text-stone-700 leading-relaxed">{buyerProfile}</p>
        </div>
      )}
      <button onClick={onSubmit} disabled={loading}
        className={`font-semibold px-10 py-3 rounded-full transition-all shadow-md
          ${loading
            ? "bg-stone-300 text-stone-500 cursor-not-allowed"
            : "bg-teal-700 text-white hover:bg-teal-800 hover:shadow-lg hover:-translate-y-0.5"
          }`}>
        {loading ? "Building your recommendations…" : "See My Recommendations →"}
      </button>
    </div>
  );
}

function RewardScreen({ reward, onContinue }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ["#0d9488", "#14b8a6", "#f0fdfa", "#ffd700", "#ffffff"],
    });

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ["#0d9488", "#ffd700", "#ffffff"],
      });
    }, 200);

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ["#0d9488", "#ffd700", "#ffffff"],
      });
    }, 400);

    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { y: 0.3 },
        gravity: 0.6,
        scalar: 0.8,
        colors: ["#0d9488", "#14b8a6", "#ffd700"],
      });
    }, 1000);
  }, []);

  function copyCode() {
    navigator.clipboard.writeText(reward?.promoCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const expiry = reward?.expiresAt
    ? new Date(reward.expiresAt).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div className="text-center py-6">
      <div className="relative inline-block mb-4">
        <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600
          rounded-full flex items-center justify-center mx-auto shadow-lg
          animate-[bounce_0.8s_ease-in-out_2]">
          <span className="text-4xl">🎉</span>
        </div>
        <span className="absolute inset-0 rounded-full bg-teal-400 opacity-30
          animate-ping" />
      </div>

      <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-800
        text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4
        animate-[fadeIn_0.5s_ease-in]">
        🏆 Your rewards are unlocked
      </div>

      <h2 className="text-2xl font-bold text-stone-800 mb-2">
        Nice work! Your home profile is ready!
      </h2>
      <p className="text-stone-500 text-sm mx-auto mb-8">
        We've personalised your recommendations and unlocked two rewards below.
      </p>

      <div className="space-y-4 mb-8 text-left">
        {reward?.credit > 0 && (
          <div className="flex items-center gap-4 bg-gradient-to-r from-teal-600
            to-teal-700 rounded-2xl px-5 py-4 text-white shadow-lg
            animate-[slideUp_0.4s_ease-out]">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center
              justify-center flex-shrink-0">
              <span className="text-2xl">💳</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-0.5">
                Personalisation Credit
              </p>
              <p className="text-2xl font-bold">£{reward.credit.toLocaleString()}</p>
              <p className="text-xs opacity-70 mt-0.5">Applied automatically at checkout</p>
            </div>
          </div>
        )}

        {reward?.promoCode && (
          <div className="border-2 border-dashed border-teal-300 bg-teal-50
            rounded-2xl px-5 py-4 animate-[slideUp_0.5s_ease-out]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-0.5">
                  First Order Discount
                </p>
                <p className="text-sm text-stone-600">
                  10% off extras above your credit · max £200
                </p>
              </div>
              <span className="text-2xl">🏷️</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-teal-200 rounded-xl
                px-4 py-2.5 font-mono text-lg font-bold text-stone-800
                tracking-widest text-center">
                {reward.promoCode}
              </div>
              <button onClick={copyCode}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold
                  transition-all flex-shrink-0
                  ${copied
                    ? "bg-teal-600 text-white scale-95"
                    : "bg-white border border-teal-200 text-teal-700 hover:bg-teal-100"
                  }`}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            {expiry && (
              <p className="text-xs text-stone-400 mt-2 text-center">
                Valid on your first order · expires {expiry}
              </p>
            )}
          </div>
        )}
      </div>

      <button onClick={onContinue}
        className="w-full bg-teal-700 text-white font-semibold py-3.5 rounded-full
          hover:bg-teal-800 shadow-md hover:shadow-lg hover:-translate-y-0.5
          transition-all">
        See My Personalised Recommendations →
      </button>

      <p className="text-xs text-stone-400 mt-4">
        Your credit and promo code are also saved in your account dashboard.
      </p>
    </div>
  );
}

const FLOW = ["start", "q1", "q2", "q3", "q4", "q5", "q6", "q7", "end", "reward"];

export default function Questionnaire() {
  const [screen, setScreen] = useState("start");
  const [answers, setAnswers] = useState({});
  const [plot, setPlot] = useState(null);
  const [plotLoading, setPlotLoading] = useState(true);
  const [reward, setReward] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const { updateProfile, fetchRecommendations, loading } = useApp();
  const { user } = useAuth();
  const { refreshReward } = useBasket();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/plots/my`, { withCredentials: true })
      .then((r) => setPlot(r.data.plot))
      .catch(() => setPlot(null))
      .finally(() => setPlotLoading(false));
    
    axios.get(`${API}/questionnaire/status`, { withCredentials: true })
      .then((r) => setAlreadyCompleted(r.data.completed || false))
      .catch(() => setAlreadyCompleted(false));
  }, []);

  const plotCtx = derivePlotContext(plot);
  const buyerProfile = buildBuyerProfile(answers, plot);

  function next() {
    const idx = FLOW.indexOf(screen);
    if (idx < FLOW.length - 1) setScreen(FLOW[idx + 1]);
  }

  function back() {
    const idx = FLOW.indexOf(screen);
    if (idx > 0) setScreen(FLOW[idx - 1]);
  }

  // async function handleSubmit() {
  //   updateProfile({
  //     bedrooms:     plot?.bedrooms,
  //     bathrooms:    plot?.bathrooms,
  //     plotNumber:   plot?.plotNumber,
  //     development:  plot?.development,
  //     ...answers,
  //     buyerProfile,
  //   });
  //   await fetchRecommendations();
  //   navigate("/buyer/recommendations");
  // }



async function handleSubmit() {
  try {
    //localStorage.setItem('questionnaireAnswers', JSON.stringify(answers));

    const { data } = await axios.post(
      `${API}/questionnaire/submit`,
      { answers, buyerProfile },
      { withCredentials: true }
    );

    console.log('submit response:', data);

    if (data.alreadyCompleted && data.rewardExpired) {
      navigate("/buyer/recommendations");
      return;
    }
    
    const rewardData = {
      credit: data.credit || 0,
      promoCode: data.promoCode || null,
      discount: data.discount ?? 10,
      maxDiscount: data.maxDiscount ?? 200,
      expiresAt: data.expiresAt || null,
    };

    setReward(rewardData);

    localStorage.setItem(
      `questionnaireReward_${user._id}`,
      JSON.stringify({ credit: data.credit, promoCode: data.promoCode, expiresAt: data.expiresAt })
    );
    refreshReward();

    setScreen("reward");
  } catch (err) {
    console.error("Submit error:", err.message);
  }
}

  if (plotLoading) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (plot?.selectionsLocked) {
    return <SelectionsLockedNotice />;
  }

  const SCREEN_MAP = {
    start: <StartScreen onStart={next} plot={plot} showReward={!alreadyCompleted} />,
    q1: (
      <Q1Screen
        answers={answers}
        setAnswers={setAnswers}
        onNext={next}
        onBack={back}
        plot={plot}
      />
    ),
    q2: (
      <Q2Screen
        answers={answers}
        setAnswers={setAnswers}
        onNext={next}
        onBack={back}
      />
    ),
    q3: (
      <Q3Screen
        answers={answers}
        setAnswers={setAnswers}
        onNext={next}
        onBack={back}
      />
    ),
    q4: (
      <Q4Screen
        answers={answers}
        setAnswers={setAnswers}
        onNext={next}
        onBack={back}
      />
    ),
    q5: (
      <Q5Screen
        answers={answers}
        setAnswers={setAnswers}
        onNext={next}
        onBack={back}
      />
    ),
    q6: (
      <Q6Screen
        answers={answers}
        setAnswers={setAnswers}
        onNext={next}
        onBack={back}
      />
    ),
    q7: (
      <Q7Screen
        answers={answers}
        setAnswers={setAnswers}
        onNext={next}
        onBack={back}
      />
    ),
    reward: (
      <RewardScreen
        reward={reward}
        onContinue={() => {
          // localStorage.setItem("questionnaireAnswers", JSON.stringify(answers));
          navigate("/buyer/recommendations");
        }}
      />
    ),
    end: (
      <EndScreen
        buyerProfile={buyerProfile}
        onSubmit={handleSubmit}
        loading={loading}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-md px-6 py-8 sm:px-10 sm:py-10">
        {SCREEN_MAP[screen]}
      </div>
      <p className="text-xs text-stone-400 mt-6 text-center">
        Your answers are only used to personalise your recommendations.
      </p>
    </div>
  );
}