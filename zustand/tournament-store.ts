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

interface TournamentState {
  pots: Pot[];
  groups: Group[];
  selectedTeam: Team | null;
  potsFinalized: boolean; // Track if user finished creating pots
  addPotWithTeams: (potName: string, teamNames: string[], countries?: { code: string; flag: string; customFlagImage?: string }[]) => void;
  createGroups: (numberOfGroups: number, teamsPerGroup: number) => void;
  selectTeam: (team: Team | null) => void;
  assignTeamToSlot: (groupId: number, slotIndex: number) => void;
  removeTeamFromSlot: (groupId: number, slotIndex: number) => void;
  removeTeamFromPot: (potId: number, teamId: number) => void;
  deletePot: (potId: number) => void;
  finalizePots: () => void;
  unfinalizePots: () => void;
  resetTournament: () => void;
}

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      pots: [],
      groups: [],
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
        set({ groups: newGroups });
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

      resetTournament: () =>
        set({
          pots: [],
          groups: [],
          selectedTeam: null,
          potsFinalized: false,
        }),
    }),
    {
      name: "tournament-storage",
    }
  )
);

export type { Team, Pot, Group, TournamentState };