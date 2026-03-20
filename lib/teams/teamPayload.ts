import type { Prisma } from "@prisma/client";

export const teamListInclude = {
  owner: { select: { id: true, name: true, email: true } as const },
  teamMembers: {
    orderBy: { createdAt: "asc" as const },
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  subTeams: {
    orderBy: { createdAt: "asc" as const },
    include: {
      subTeamMembers: {
        orderBy: { createdAt: "asc" as const },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  },
} satisfies Prisma.TeamInclude;

export type TeamWithRelations = Prisma.TeamGetPayload<{
  include: typeof teamListInclude;
}>;

export function buildTeamsPayload(teams: TeamWithRelations[]) {
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    projectId: team.projectId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    owner: team.owner,
    members: team.teamMembers.map((tm) => ({
      id: tm.id,
      userId: tm.userId,
      role: tm.role,
      user: tm.user,
    })),
    subTeams: team.subTeams.map((st) => ({
      id: st.id,
      name: st.name,
      phase: st.phase,
      teamId: st.teamId,
      projectId: st.projectId,
      createdAt: st.createdAt,
      members: st.subTeamMembers.map((sm) => ({
        id: sm.id,
        userId: sm.userId,
        role: sm.role,
        user: sm.user,
      })),
    })),
  }));
}
