/** 子团队研发阶段（与 SubTeam.phase 字符串一致） */
export const DEV_PHASES = [
  { value: "RESEARCH", label: "研究" },
  { value: "DEVELOPMENT", label: "开发" },
  { value: "VALIDATION", label: "验证" },
  { value: "CLINICAL", label: "临床" },
  { value: "POST_MARKET", label: "上市后" },
] as const;

export type DevPhaseValue = (typeof DEV_PHASES)[number]["value"];

/** 团队/子团队成员权限（存入 TeamMember.role / SubTeamMember.role） */
export const TEAM_MEMBER_ROLES = [
  { value: "admin", label: "管理员" },
  { value: "editor", label: "编辑" },
  { value: "readonly", label: "只读" },
] as const;

export type TeamMemberRoleValue = (typeof TEAM_MEMBER_ROLES)[number]["value"];

export function phaseLabel(value: string) {
  return DEV_PHASES.find((p) => p.value === value)?.label ?? value;
}

export function teamRoleLabel(value: string) {
  return TEAM_MEMBER_ROLES.find((r) => r.value === value)?.label ?? value;
}
