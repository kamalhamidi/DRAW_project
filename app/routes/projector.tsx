import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Team {
  id: number;
  name: string;
  potId: number;
  countryCode?: string;
  countryFlag?: string;
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
  capacity: number;
  teams: (Team | null)[];
}

interface DrawState {
  pots: Pot[];
  groups: Group[];
  selectedTeam: Team | null;
  showProjectorPots: boolean;
}

export default function ProjectorView() {
  const [drawState, setDrawState] = useState<DrawState>({
    pots: [],
    groups: [],
    selectedTeam: null,
    showProjectorPots: true,
  });

  const [hydrated, setHydrated] = useState(false);
  const [bgAnimation, setBgAnimation] = useState<"none" | "slide" | "zoom" | "fade">("slide");

  useEffect(() => {
    setHydrated(true);

    // Subscribe to the Broadcast Channel
    const channel = new BroadcastChannel("draw_sync");

    const handleMessage = (event: MessageEvent) => {
      const { pots, groups, selectedTeam, showProjectorPots, bgAnimation } = event.data;
      setDrawState({
        pots: pots || [],
        groups: groups || [],
        selectedTeam: selectedTeam || null,
        showProjectorPots: showProjectorPots !== undefined ? showProjectorPots : true,
      });
      if (bgAnimation !== undefined) {
        console.log("[projector] received bgAnimation via BroadcastChannel:", bgAnimation);
        setBgAnimation(bgAnimation);
      }
    };

    channel.addEventListener("message", handleMessage);

    // Cleanup on unmount
    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, []);

  useEffect(() => {
    // Apply background animation
    console.log("[projector] applying bgAnimation:", bgAnimation, "current body classes:", document.body.className);
    document.body.classList.remove("bg-slide", "bg-zoom", "bg-fade", "bg-none");
    document.body.classList.add(`bg-${bgAnimation}`);
    console.log("[projector] body classes after apply:", document.body.className);
  }, [bgAnimation]);

  if (!hydrated) {
    return <div className="projector-loading">Initializing Projector...</div>;
  }

  const { pots, groups, selectedTeam } = drawState;
  const totalTeams = pots.reduce((acc, pot) => acc + pot.teams.length, 0);
  const assignedTeams = groups.reduce(
    (acc, group) => acc + group.teams.filter((t) => t !== null).length,
    0
  );
  const allTeamsAssigned = totalTeams > 0 && totalTeams === assignedTeams;

  // Animation variants
  const slideInVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 80, damping: 12 },
    },
  };

  const teamCardVariants = {
    idle: { scale: 1, y: 0 },
    hover: {
      scale: 1.08,
      y: -6,
      transition: { type: "spring" as const, stiffness: 400, damping: 10 },
    },
  };

  return (
    <div className="projector-container">
      {/* Projector Header */}
      <motion.header
        className="projector-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1
          className="projector-title"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Tournament Draw - Live Display
        </motion.h1>

        <motion.div
          className="projector-status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <AnimatePresence mode="wait">
            {selectedTeam ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                className="selected-team-showcase"
              >
                <div className="showcase-label">SELECTED TEAM</div>
                <div className="showcase-content">
                  <span className="showcase-flag">{selectedTeam.countryFlag || "🏴"}</span>
                  <span className="showcase-name">{selectedTeam.name}</span>
                </div>
              </motion.div>
            ) : (
              <motion.h2
                key="unselected"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="status-text waiting"
              >
                Waiting for selection...
              </motion.h2>
            )}
          </AnimatePresence>
          <p className="progress-text">
            {allTeamsAssigned
              ? "✅ Draw Complete! All teams assigned."
              : `Progress: ${assignedTeams}/${totalTeams} teams assigned`}
          </p>
        </motion.div>
      </motion.header>

      <div className="projector-content">
        {/* Pots Section */}
        <AnimatePresence mode="wait">
          {pots.length > 0 && drawState.showProjectorPots && (
            <motion.div
              key="pots-section"
              className="projector-pots-section"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <div className="projector-section-title red">
                <h2>Pots</h2>
              </div>
              <div className="projector-pots-grid">
                {pots.map((pot, index) => (
                  <motion.div
                    key={pot.id}
                    className="projector-pot-card"
                    variants={slideInVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.15 }}
                  >
                    <h3 className="projector-pot-title">
                      {pot.name}
                      <span className="pot-count">({pot.teams.length})</span>
                    </h3>
                    <div className="projector-teams-grid">
                      <AnimatePresence>
                        {pot.teams.map((team) => (
                          <motion.div
                            key={team.id}
                            className={`projector-team-card ${selectedTeam?.id === team.id ? "selected" : ""
                              } ${team.assigned ? "assigned" : ""}`}
                            layout
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{
                              opacity: 0,
                              scale: 0.7,
                              transition: { duration: 0.3 },
                            }}
                            variants={teamCardVariants}
                            whileHover="hover"
                          >
                            <span className="team-flag">{team.countryFlag || "🏴"}</span>
                            <span className="team-name">{team.name}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {pot.teams.length === 0 && (
                        <p className="empty-pot">All teams assigned ✓</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Groups Section */}
        {groups.length > 0 && (
          <motion.div
            className="projector-groups-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="projector-section-title green">
              <h2>Groups</h2>
            </div>
            <div className="projector-groups-grid">
              {groups.map((group, index) => {
                const filledSlots = group.teams.filter(
                  (t) => t !== null
                ).length;
                const isGroupComplete = filledSlots === group.capacity;

                return (
                  <motion.div
                    key={group.id}
                    className={`projector-group-card ${isGroupComplete ? "complete" : ""
                      }`}
                    variants={slideInVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.15 }}
                  >
                    <div className="projector-group-header">
                      <h3 className="projector-group-title">{group.name}</h3>
                      <span
                        className={`group-progress-badge ${isGroupComplete ? "complete" : "pending"
                          }`}
                      >
                        {filledSlots}/{group.capacity}
                      </span>
                    </div>
                    <div className="projector-slots-grid">
                      {group.teams.map((team, slotIndex) => (
                        <motion.div
                          key={slotIndex}
                          className={`projector-slot ${team ? "filled" : "empty"
                            }`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: slotIndex * 0.05 }}
                          layout
                        >
                          {team ? (
                            <motion.div
                              className="slot-team-content"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                            >
                              <span className="slot-flag">{team.countryFlag || "🏴"}</span>
                              <span className="slot-team-name">{team.name}</span>
                            </motion.div>
                          ) : (
                            <span className="slot-empty">{group.name.charAt(group.name.length - 1)}{slotIndex + 1}</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {pots.length === 0 && groups.length === 0 && (
          <motion.div
            className="projector-empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h2>Waiting for draw to start...</h2>
            <p>The projector will display the tournament draw once it begins.</p>
          </motion.div>
        )}
      </div>

      {/* Sync Indicator */}
      <motion.div
        className="sync-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <span className="sync-dot"></span>
        <span className="sync-text">Live Sync Active</span>
      </motion.div>
    </div>
  );
}
