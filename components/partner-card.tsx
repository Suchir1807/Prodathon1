import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import type { MatchInsight, Partner } from "@/lib/types";
import { cn } from "@/lib/utils";

function SkillRow({
  label,
  skills,
  highlighted,
}: {
  label: string;
  skills: string[];
  highlighted: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] tracking-wide text-slate-500 uppercase">{label}</span>
      {skills.map((skill) => {
        const match = highlighted.includes(skill);
        return (
          <span
            key={skill}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px]",
              match
                ? "text-[#ccff00] ring-1 ring-[#ccff00]/40"
                : "bg-slate-800/80 text-slate-400",
            )}
          >
            {skill}
          </span>
        );
      })}
    </div>
  );
}

export function PartnerCard({
  partner,
  insight,
  onPropose,
  onSendInvite,
  invitePending,
  inviteSent,
}: {
  partner: Partner;
  insight: MatchInsight;
  onPropose: () => void;
  onSendInvite?: () => void;
  invitePending?: boolean;
  inviteSent?: boolean;
}) {
  return (
    <article className="glass glow-card grid gap-3 rounded-xl p-4 md:grid-cols-[200px_1fr] md:grid-rows-[auto_auto]">
      <div className="flex items-center gap-3 md:row-span-2">
        <UserAvatar name={partner.name} className="size-9 text-[10px]" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-white">{partner.name}</h2>
          <p className="truncate text-[11px] text-slate-500">
            {partner.role} · {partner.location}
          </p>
          <p className="text-[11px] text-[#ccff00]">{insight.score}% fit</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <SkillRow label="Can teach" skills={partner.canTeach} highlighted={insight.theyTeachYou} />
        <SkillRow label="Wants to learn" skills={partner.wantsToLearn} highlighted={insight.youTeachThem} />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onSendInvite ? (
          <Button
            size="sm"
            variant="outline"
            disabled={invitePending || inviteSent}
            onClick={onSendInvite}
          >
            {inviteSent ? "Invite sent" : invitePending ? "Sending…" : "Send Invite"}
          </Button>
        ) : null}
        <Button size="sm" onClick={onPropose}>
          Propose Match
        </Button>
      </div>
    </article>
  );
}
