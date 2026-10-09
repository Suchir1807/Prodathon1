"use client";

import { SlidersHorizontal } from "lucide-react";

import { ToggleChip, toggleInList } from "@/components/toggle-chip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DOMAIN_INTERESTS, SKILLS_I_HAVE, SKILLS_I_WANT } from "@/lib/catalog";
import { PARTNERS } from "@/lib/users";
import { cn } from "@/lib/utils";

function unique(values: string[]) {
  return [...new Set(values)];
}

const TEACH_OPTIONS = unique([
  ...SKILLS_I_HAVE,
  ...PARTNERS.flatMap((partner) => partner.canTeach),
]);
const LEARN_OPTIONS = unique([
  ...SKILLS_I_WANT,
  ...PARTNERS.flatMap((partner) => partner.wantsToLearn),
]);

export type PartnerFiltersState = {
  query: string;
  complementaryOnly: boolean;
  domains: string[];
  canTeach: string[];
  wantsToLearn: string[];
};

export const EMPTY_FILTERS: PartnerFiltersState = {
  query: "",
  complementaryOnly: true,
  domains: [],
  canTeach: [],
  wantsToLearn: [],
};

function FilterGroup({
  id,
  title,
  options,
  selected,
  onToggle,
}: {
  id: string;
  title: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <AccordionItem value={id} className="border-white/8">
      <AccordionTrigger className="py-2 text-xs tracking-wide text-slate-400 uppercase hover:no-underline">
        <span className="flex items-center gap-2">
          {title}
          {selected.length > 0 ? (
            <span className="text-[10px] text-[#ccff00]">{selected.length}</span>
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => (
            <ToggleChip
              key={option}
              selected={selected.includes(option)}
              onClick={() => onToggle(option)}
            >
              {option}
            </ToggleChip>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function PartnerFilters({
  filters,
  onChange,
}: {
  filters: PartnerFiltersState;
  onChange: (filters: PartnerFiltersState) => void;
}) {
  return (
    <div className="glass space-y-4 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="size-4 text-primary" />
          Filters
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Reset
        </Button>
      </div>

      <Input
        value={filters.query}
        placeholder="Search by name"
        aria-label="Search partners by name"
        onChange={(event) => onChange({ ...filters, query: event.target.value })}
      />

      <button
        type="button"
        role="switch"
        aria-checked={filters.complementaryOnly}
        onClick={() =>
          onChange({ ...filters, complementaryOnly: !filters.complementaryOnly })
        }
        className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-background/40 p-3 text-left"
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
            filters.complementaryOnly ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "size-4 rounded-full bg-white transition",
              filters.complementaryOnly && "translate-x-4",
            )}
          />
        </span>
        <span>
          <span className="block text-sm font-medium">Complementary matches</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            They can teach something you want, or you can teach something they want.
          </span>
        </span>
      </button>

      <Accordion type="multiple" defaultValue={["domains"]} className="border-t border-white/8">
        <FilterGroup
          id="domains"
          title="Domain interests"
          options={DOMAIN_INTERESTS}
          selected={filters.domains}
          onToggle={(value) =>
            onChange({ ...filters, domains: toggleInList(filters.domains, value) })
          }
        />
        <FilterGroup
          id="teach"
          title="Can teach"
          options={TEACH_OPTIONS}
          selected={filters.canTeach}
          onToggle={(value) =>
            onChange({ ...filters, canTeach: toggleInList(filters.canTeach, value) })
          }
        />
        <FilterGroup
          id="learn"
          title="Wants to learn"
          options={LEARN_OPTIONS}
          selected={filters.wantsToLearn}
          onToggle={(value) =>
            onChange({
              ...filters,
              wantsToLearn: toggleInList(filters.wantsToLearn, value),
            })
          }
        />
      </Accordion>
    </div>
  );
}
