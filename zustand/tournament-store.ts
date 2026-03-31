import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
interface Team {
  id: number;
  name: string;
  potId: number;
  countryCode?: string;
  countryFlag?: string;
  customFlagImage?: string;
  assigned?: boolean;
}

interface Pot {
  id: number;
  name: string;
  teams: Team[];
}

interface Group {
  id: number;
  name: string;
  capacity: number; // How many teams this group can hold
  teams: (Team | null)[]; // Array with slots, null = empty slot
}

interface Match {
  id: string;               // uuid
  tournamentId: string;
  round: number;            // 1-based
  matchNumber: number;      // global sequential
  group: string;            // "A", "B", "C", ...
  homeSlotIndex: number;    // 0-based index into group.teams
  awaySlotIndex: number;    // 0-based index into group.teams
  homePlaceholder: string;  // e.g. "A1"
  awayPlaceholder: string;  // e.g. "A4"
}

interface RoundConfig {
  round: number;
  pairings: [number, number][];  // index-based pairs, e.g. [0,3], [1,4], [2,5]
}

interface TournamentState {
  pots: Pot[];
  groups: Group[];
  matches: Match[];
  roundConfigs: RoundConfig[];
  selectedTeam: Team | null;
  potsFinalized: boolean; // Track if user finished creating pots
  addPotWithTeams: (potName: string, teamNames: string[], countries?: { code: string; flag: string; customFlagImage?: string }[]) => void;
  createGroups: (numberOfGroups: number, teamsPerGroup: number) => void;
  selectTeam: (team: Team | null) => void;
  assignTeamToSlot: (groupId: number, slotIndex: number) => void;
  removeTeamFromSlot: (groupId: number, slotIndex: number) => void;
  removeTeamFromPot: (potId: number, teamId: number) => void;
  deletePot: (potId: number) => void;
  updatePotName: (potId: number, newName: string) => void;
  finalizePots: () => void;
  unfinalizePots: () => void;
  setRoundConfig: (config: RoundConfig) => void;
  removeRoundConfig: (round: number) => void;
  generateMatchesForRound: (round: number) => void;
  clearMatchesForRound: (round: number) => void;
  resetTournament: () => void;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      pots: [],
      groups: [],
      matches: [],
      roundConfigs: [],
      selectedTeam: null,
      potsFinalized: false,

      addPotWithTeams: (potName: string, teamNames: string[], countries?: { code: string; flag: string; customFlagImage?: string }[]) => {
        const potId = Date.now();
        const teams: Team[] = teamNames.map((name, index) => ({
          id: potId + index + 1,
          name,
          potId,
          countryCode: countries?.[index]?.code,
          countryFlag: countries?.[index]?.flag,
          customFlagImage: countries?.[index]?.customFlagImage,
        }));

        set((state) => ({
          pots: [...state.pots, { id: potId, name: potName, teams }],
        }));
      },

      removeTeamFromPot: (potId: number, teamId: number) => {
        set((state) => {
          const updatedPots = state.pots
            .map((pot) =>
              pot.id === potId
                ? { ...pot, teams: pot.teams.filter((t) => t.id !== teamId) }
                : pot
            )
            .filter((pot) => pot.teams.length > 0); // Remove empty pots
          return { pots: updatedPots };
        });
      },

      deletePot: (potId: number) => {
        set((state) => ({
          pots: state.pots.filter((pot) => pot.id !== potId),
        }));
      },

      updatePotName: (potId: number, newName: string) => {
        set((state) => ({
          pots: state.pots.map((pot) =>
            pot.id === potId ? { ...pot, name: newName } : pot
          ),
        }));
      },

      finalizePots: () => set({ potsFinalized: true }),
      unfinalizePots: () => set({ potsFinalized: false }),

      createGroups: (numberOfGroups: number, teamsPerGroup: number) => {
        const newGroups: Group[] = [];
        for (let i = 0; i < numberOfGroups; i++) {
          newGroups.push({
            id: Date.now() + i,
            name: `Group ${String.fromCharCode(65 + i)}`,
            capacity: teamsPerGroup,
            teams: Array(teamsPerGroup).fill(null), // Create empty slots
          });
        }
        set((state) => ({
          groups: newGroups,
          selectedTeam: null,
          pots: state.pots.map((pot) => ({
            ...pot,
            teams: pot.teams.map((team) => ({
              ...team,
              assigned: false,
            })),
          })),
        }));
      },

      selectTeam: (team: Team | null) => set({ selectedTeam: team }),

      assignTeamToSlot: (groupId: number, slotIndex: number) =>
        set((state) => {
          if (!state.selectedTeam) return state;

          const targetGroup = state.groups.find((g) => g.id === groupId);
          if (!targetGroup) return state;

          // Check if slot is already occupied
          if (targetGroup.teams[slotIndex] !== null) {
            alert("This slot is already occupied!");
            return state;
          }

          // Check if this team is already in the group
          if (targetGroup.teams.some((t) => t?.id === state.selectedTeam!.id)) {
            alert("This team is already in this group!");
            return state;
          }

          return {
            pots: state.pots.map((pot) => ({
              ...pot,
              teams: pot.teams.map((t) =>
                t.id === state.selectedTeam!.id ? { ...t, assigned: true } : t
              ),
            })),
            groups: state.groups.map((group) => {
              if (group.id === groupId) {
                const newTeams = [...group.teams];
                newTeams[slotIndex] = state.selectedTeam!;
                return { ...group, teams: newTeams };
              }
              return group;
            }),
            selectedTeam: null,
          };
        }),

      removeTeamFromSlot: (groupId: number, slotIndex: number) =>
        set((state) => {
          const group = state.groups.find((g) => g.id === groupId);
          if (!group) return state;

          const team = group.teams[slotIndex];
          if (!team) return state;

          return {
            groups: state.groups.map((g) => {
              if (g.id === groupId) {
                const newTeams = [...g.teams];
                newTeams[slotIndex] = null;
                return { ...g, teams: newTeams };
              }
              return g;
            }),
            pots: state.pots.map((pot) =>
              pot.id === team.potId
                ? {
                  ...pot,
                  teams: pot.teams.map((t) =>
                    t.id === team.id ? { ...t, assigned: false } : t
                  ),
                }
                : pot
            ),
          };
        }),

      setRoundConfig: (config: RoundConfig) =>
        set((state) => {
          const existing = state.roundConfigs.findIndex((rc) => rc.round === config.round);
          if (existing >= 0) {
            const updated = [...state.roundConfigs];
            updated[existing] = config;
            return { roundConfigs: updated };
          }
          return { roundConfigs: [...state.roundConfigs, config].sort((a, b) => a.round - b.round) };
        }),

      removeRoundConfig: (round: number) =>
        set((state) => ({
          roundConfigs: state.roundConfigs.filter((rc) => rc.round !== round),
          matches: state.matches.filter((m) => m.round !== round),
        })),

      generateMatchesForRound: (round: number) =>
        set((state) => {
          const config = state.roundConfigs.find((rc) => rc.round === round);
          if (!config) return state;

          // Remove existing matches for this round (idempotent)
          const otherMatches = state.matches.filter((m) => m.round !== round);

          // Calculate starting match number
          const maxExistingMatchNum = otherMatches.length > 0
            ? Math.max(...otherMatches.map((m) => m.matchNumber))
            : 0;

          let matchNumber = maxExistingMatchNum + 1;
          const newMatches: Match[] = [];
          const tournamentId = 'tournament-' + Date.now();

          for (const group of state.groups) {
            const groupLetter = group.name.charAt(group.name.length - 1); // "A", "B", etc.

            for (const [homeIdx, awayIdx] of config.pairings) {
              // Skip if indices are out of bounds for this group
              if (homeIdx >= group.teams.length || awayIdx >= group.teams.length) continue;

              newMatches.push({
                id: generateUUID(),
                tournamentId,
                round,
                matchNumber: matchNumber++,
                group: groupLetter,
                homeSlotIndex: homeIdx,
                awaySlotIndex: awayIdx,
                homePlaceholder: `${groupLetter}${homeIdx + 1}`,
                awayPlaceholder: `${groupLetter}${awayIdx + 1}`,
              });
            }
          }

          return { matches: [...otherMatches, ...newMatches] };
        }),

      clearMatchesForRound: (round: number) =>
        set((state) => ({
          matches: state.matches.filter((m) => m.round !== round),
        })),

      resetTournament: () =>
        set({
          pots: [],
          groups: [],
          matches: [],
          roundConfigs: [],
          selectedTeam: null,
          potsFinalized: false,
        }),
    }),
    {
      name: "tournament-storage",
    }
  )
);

export type { Team, Pot, Group, Match, RoundConfig, TournamentState };