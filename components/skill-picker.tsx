"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SKILL_CATEGORIES, normalizeSkill, type SkillLevel } from "@/lib/skill-categories";

export function SkillPicker({
  title,
  selected,
  otherSelected,
  onChange,
  levels,
  onLevelsChange,
}: {
  title: string;
  selected: string[];
  otherSelected: string[];
  onChange: (skills: string[]) => void;
  levels?: Record<string, SkillLevel>;
  onLevelsChange?: (levels: Record<string, SkillLevel>) => void;
}) {
  const [query, setQuery] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const search = query.trim().toLocaleLowerCase();
  const categories = useMemo(() => {
    const knownSkills = new Set(Object.values(SKILL_CATEGORIES).flat().map(normalizeSkill));
    return Object.entries(SKILL_CATEGORIES).map(([category, skills]) => [
      category,
      [
        ...skills,
        ...(category === "Other"
          ? selected.filter((skill) => !knownSkills.has(normalizeSkill(skill)))
          : []),
      ],
    ] as const);
  }, [selected]);

  function toggle(skill: string) {
    setMessage("");
    const key = normalizeSkill(skill);
    if (selected.some((item) => normalizeSkill(item) === key)) {
      onChange(selected.filter((item) => normalizeSkill(item) !== key));
      if (levels && onLevelsChange) {
        const next = { ...levels };
        delete next[skill];
        onLevelsChange(next);
      }
      return;
    }
    if (otherSelected.some((item) => normalizeSkill(item) === key)) {
      setMessage(`“${skill}” is already in the other skill list. A skill can only be offered or learned, not both.`);
      return;
    }
    onChange([...selected, skill]);
  }

  function addCustomSkill() {
    const skill = customSkill.trim();
    if (!skill) return;
    toggle(skill);
    if (!otherSelected.some((item) => normalizeSkill(item) === normalizeSkill(skill))) {
      setCustomSkill("");
    }
  }

  const visibleCategories = categories.filter(([category, skills]) => {
    if (activeCategory !== "All" && category !== activeCategory) return false;
    return skills.some((skill) => !search || skill.toLocaleLowerCase().includes(search));
  });

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <h3 className="text-sm font-medium text-white">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search any skill"
          aria-label={`Search ${title.toLowerCase()}`}
          className="min-w-40 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
        />
        <select
          aria-label="Filter skills by category"
          value={activeCategory}
          onChange={(event) => setActiveCategory(event.target.value)}
          className="rounded-lg border border-white/10 bg-[#07110c] px-3 py-2 text-sm text-white"
        >
          <option>All</option>
          {Object.keys(SKILL_CATEGORIES).map((category) => <option key={category}>{category}</option>)}
        </select>
      </div>
      <div className="mt-3 max-h-60 space-y-3 overflow-y-auto">
        {visibleCategories.map(([category, skills]) => (
          <section key={category}>
            <h4 className="mb-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">{category}</h4>
            <div className="flex flex-wrap gap-1.5">
              {skills.filter((skill) => !search || skill.toLocaleLowerCase().includes(search)).map((skill) => {
                const isSelected = selected.some((item) => normalizeSkill(item) === normalizeSkill(skill));
                return (
                  <button
                    key={`${category}:${skill}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(skill)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${isSelected ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {!visibleCategories.length ? <p className="text-xs text-slate-500">No matching skills in this category.</p> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={customSkill}
          onChange={(event) => setCustomSkill(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomSkill();
            }
          }}
          maxLength={80}
          placeholder="Add a custom skill"
          aria-label={`Add custom skill to ${title}`}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
        />
        <Button type="button" size="sm" variant="outline" onClick={addCustomSkill}>Add</Button>
      </div>
      {message ? <p role="alert" className="mt-2 text-xs text-amber-200">{message}</p> : null}
      {selected.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((skill) => (
            <span key={skill} className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-2.5 py-1 text-xs text-emerald-100">
              {skill}
              {levels && onLevelsChange ? (
                <select
                  aria-label={`${skill} level`}
                  value={levels[skill] ?? "Intermediate"}
                  onChange={(event) => onLevelsChange({ ...levels, [skill]: event.target.value as SkillLevel })}
                  className="bg-transparent text-[10px] text-slate-300 outline-none"
                >
                  {(["Beginner", "Intermediate", "Advanced"] as const).map((level) => <option className="bg-slate-900" key={level}>{level}</option>)}
                </select>
              ) : null}
              <button type="button" aria-label={`Remove ${skill}`} onClick={() => toggle(skill)} className="text-slate-400 hover:text-white">×</button>
            </span>
          ))}
        </div>
      ) : <p className="mt-3 text-xs text-slate-500">Choose or add skills above.</p>}
    </section>
  );
}
