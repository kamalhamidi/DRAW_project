import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTournamentStore } from "zustand/tournament-store";
import { africaCountries } from "data/africaCountries";

export default function TournamentManager() {
  const {
    pots,
    groups,
    selectedTeam,
    potsFinalized,
    addPotWithTeams,
    createGroups,
    finalizePots,
    unfinalizePots,
    selectTeam,
    assignTeamToSlot,
    removeTeamFromSlot,
    removeTeamFromPot,
    deletePot,
    resetTournament,
  } = useTournamentStore();

  const [showPotForm, setShowPotForm] = useState(false);
  const [potName, setPotName] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState(4);
  const [teamInputs, setTeamInputs] = useState<string[]>(["", "", "", ""]);
  const [teamCountries, setTeamCountries] = useState<{ code: string; flag: string }[]>([
    { code: "", flag: "" },
    { code: "", flag: "" },
    { code: "", flag: "" },
    { code: "", flag: "" },
  ]);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [numberOfGroups, setNumberOfGroups] = useState(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);

  const [currentPhase, setCurrentPhase] = useState<"setup" | "draw">("setup");
  const [hydrated, setHydrated] = useState(false);
  const [showProjectorPots, setShowProjectorPots] = useState(true);
  const [bgAnimation, setBgAnimation] = useState<"none" | "slide" | "zoom" | "fade">("slide");
  const [projectorLayout, setProjectorLayout] = useState<"classic" | "stadium" | "broadcast" | "gala" | "neon">("classic");

  // Broadcast Channel for projector sync
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    setHydrated(true);
    // Initialize Broadcast Channel
    broadcastChannelRef.current = new BroadcastChannel("draw_sync");
  }, []);

  useEffect(() => {
    // Apply background animation
    console.log("[home] applying bgAnimation:", bgAnimation, "current body classes:", document.body.className);
    document.body.classList.remove("bg-slide", "bg-zoom", "bg-fade", "bg-none");
    document.body.classList.add(`bg-${bgAnimation}`);
    console.log("[home] body classes after apply:", document.body.className);
  }, [bgAnimation]);

  useEffect(() => {
    setTeamInputs(Array(numberOfTeams).fill(""));
    setTeamCountries(Array(numberOfTeams).fill({ code: "", flag: "" }));
  }, [numberOfTeams]);

  // Broadcast state changes to projector
  useEffect(() => {
    if (broadcastChannelRef.current && hydrated) {
      broadcastChannelRef.current.postMessage({
        pots,
        groups,
        selectedTeam,
        showProjectorPots,
        bgAnimation,
        projectorLayout,
      });
    }
  }, [pots, groups, selectedTeam, hydrated, showProjectorPots, bgAnimation, projectorLayout]);

  const handleCreatePot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!potName.trim()) return;

    const filledTeams = teamInputs.filter((t) => t.trim());
    if (filledTeams.length !== numberOfTeams) {
      alert(`Please enter exactly ${numberOfTeams} teams`);
      return;
    }

    addPotWithTeams(potName, filledTeams, teamCountries.slice(0, filledTeams.length));

    setPotName("");
    setTeamInputs(Array(numberOfTeams).fill(""));
    setTeamCountries(Array(numberOfTeams).fill({ code: "", flag: "" }));
    setShowPotForm(false);
  };

  const handleCreateGroups = (e: React.FormEvent) => {
    e.preventDefault();
    createGroups(numberOfGroups, teamsPerGroup);
    setShowGroupForm(false);
  };

  const totalTeams = pots.reduce((acc, pot) => acc + pot.teams.length, 0);
  const assignedTeams = groups.reduce(
    (acc, group) => acc + group.teams.filter((t) => t !== null).length,
    0
  );
  const allTeamsAssigned = totalTeams > 0 && totalTeams === assignedTeams;

  // Animation variants
  const slideInVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring" as const, stiffness: 80, damping: 12 },
    },
    exit: { opacity: 0, x: 30, transition: { duration: 0.2 } },
  };

  const teamCardVariants = {
    idle: { scale: 1, y: 0 },
    hover: {
      scale: 1.05,
      y: -4,
      transition: { type: "spring" as const, stiffness: 400, damping: 10 },
    },
    tap: { scale: 0.95 },
  };

  if (!hydrated) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="tournament-container">
      {/* Header */}
      <motion.header
        className="tournament-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.h1
          className="tournament-title"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Tournament Draw
        </motion.h1>

        <motion.div
          className="header-buttons"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <motion.button
            className={`btn-setup ${currentPhase === "setup" ? "active" : ""}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPhase("setup")}
          >
            Setup Tournament
          </motion.button>
          <motion.button
            className={`btn-draw ${currentPhase === "draw" ? "active" : ""}`}
            whileHover={{ scale: groups.length > 0 ? 1.05 : 1 }}
            whileTap={{ scale: groups.length > 0 ? 0.95 : 1 }}
            onClick={() => setCurrentPhase("draw")}
            disabled={groups.length === 0}
          >
            Perform Draw
          </motion.button>
          <motion.button
            className="btn-reset"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetTournament}
          >
            Reset All
          </motion.button>
          <motion.button
            className="btn-projector"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.open("/projector", "projector", "width=1600,height=900")}
          >
            🎬 Open Projector
          </motion.button>
          <div className="bg-animation-selector">
            <label className="animation-label">Background: </label>
            <select
              className="animation-select"
              value={bgAnimation}
              onChange={(e) => setBgAnimation(e.target.value as "none" | "slide" | "zoom" | "fade")}
            >
              <option value="none">None</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
              <option value="fade">Fade</option>
            </select>
          </div>
        </motion.div>
      </motion.header>

      <div className="tournament-content">
        <AnimatePresence mode="wait">
          {/* Setup Phase */}
          {currentPhase === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: Create Pots */}
              {!potsFinalized && (
                <>
                  <div className="step-header red">
                    <h2>Step 1: Create Pots with Teams</h2>
                  </div>

                  <AnimatePresence>
                    {!showPotForm && (
                      <motion.button
                        className="btn-create red-border"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowPotForm(true)}
                      >
                        + Create New Pot
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* Pot Creation Form */}
                  <AnimatePresence>
                    {showPotForm && (
                      <motion.div
                        className="form-container red-border"
                        variants={slideInVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <h3 className="form-title">Create New Pot</h3>

                        <form onSubmit={handleCreatePot}>
                          <div className="form-group">
                            <label className="form-label">Pot Name</label>
                            <input
                              className="form-input"
                              type="text"
                              value={potName}
                              onChange={(e) => setPotName(e.target.value)}
                              placeholder="e.g., Pot 1"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">
                              Number of Teams
                            </label>
                            <input
                              className="form-input"
                              type="number"
                              min="1"
                              max="20"
                              value={numberOfTeams}
                              onChange={(e) =>
                                setNumberOfTeams(parseInt(e.target.value) || 1)
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">
                              Teams ({numberOfTeams} required)
                            </label>
                            <div className="teams-grid">
                              {teamInputs.map((team, index) => (
                                <div key={index} className="team-input-group">
                                  <input
                                    className="team-input"
                                    type="text"
                                    value={team}
                                    onChange={(e) => {
                                      const newTeams = [...teamInputs];
                                      newTeams[index] = e.target.value;
                                      setTeamInputs(newTeams);
                                    }}
                                    placeholder={`Team ${index + 1}`}
                                  />
                                  <select
                                    className="team-country-select"
                                    value={teamCountries[index]?.code || ""}
                                    onChange={(e) => {
                                      const country = africaCountries.find((c: { code: string }) => c.code === e.target.value);
                                      const newCountries = [...teamCountries];
                                      newCountries[index] = country ? { code: country.code, flag: country.flag } : { code: "", flag: "" };
                                      setTeamCountries(newCountries);
                                    }}
                                  >
                                    <option value="">Select Country</option>
                                    {africaCountries.map((country: { code: string; flag: string; name: string }) => (
                                      <option key={country.code} value={country.code}>
                                        {country.flag} {country.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="form-buttons">
                            <motion.button
                              className="btn-submit"
                              type="submit"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              Create Pot
                            </motion.button>
                            <motion.button
                              className="btn-cancel"
                              type="button"
                              onClick={() => {
                                setShowPotForm(false);
                                setPotName("");
                                setTeamInputs(Array(numberOfTeams).fill(""));
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Display Created Pots */}
                  {pots.length > 0 && (
                    <div>
                      <div className="section-title red">
                        <h2>Created Pots ({pots.length})</h2>
                      </div>
                      <div className="pots-grid">
                        {pots.map((pot, index) => (
                          <motion.div
                            key={pot.id}
                            className="pot-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="pot-card-header">
                              <h3 className="pot-title">{pot.name}</h3>
                              <motion.button
                                className="btn-delete-pot"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  if (window.confirm(`Delete entire "${pot.name}" and all its teams?`)) {
                                    deletePot(pot.id);
                                  }
                                }}
                                title={`Delete ${pot.name}`}
                              >
                                🗑
                              </motion.button>
                            </div>
                            <div className="teams-list">
                              {pot.teams.map((team) => (
                                <div key={team.id} className="team-card">
                                  <span className="team-flag">{team.countryFlag || "🏴"}</span>
                                  <span className="team-name-text">{team.name}</span>
                                  <motion.button
                                    className="team-remove-btn"
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      if (window.confirm(`Remove "${team.name}" from ${pot.name}?`)) {
                                        removeTeamFromPot(pot.id, team.id);
                                      }
                                    }}
                                    title={`Remove ${team.name}`}
                                  >
                                    ✕
                                  </motion.button>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <motion.button
                        className="btn-finalize"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={finalizePots}
                      >
                        ✓ Finalize Pots & Create Groups
                      </motion.button>
                    </div>
                  )}
                </>
              )}

              {/* Unlock Step 1 */}
              {potsFinalized && (
                <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                  <div className="step-header" style={{ background: "rgba(255, 60, 73, 0.2)", border: "2px solid #FF3C49", padding: "0.5rem", width: "50%", margin: "0 auto" }}>
                    <h2 style={{ fontSize: "1.2rem", margin: 0, color: "#fff" }}>Step 1: Pots Finalized ({pots.length} created)</h2>
                  </div>
                  <motion.button
                    style={{
                      marginTop: "1rem",
                      background: "transparent",
                      border: "2px solid #FF3C49",
                      borderRadius: "25px",
                      color: "#FF3C49",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      padding: "0.75rem 2rem",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      fontFamily: "Inter, sans-serif"
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (window.confirm("Do you want to unlock Step 1 to edit pots and teams?")) {
                        unfinalizePots();
                      }
                    }}
                  >
                    🔓 Edit Pots
                  </motion.button>
                </div>
              )}

              {/* Step 2: Create Groups */}
              {potsFinalized && groups.length === 0 && (
                <>
                  <div className="step-header green">
                    <h2>Step 2: Create Groups</h2>
                  </div>

                  <AnimatePresence>
                    {!showGroupForm && (
                      <motion.button
                        className="btn-create green-border"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowGroupForm(true)}
                      >
                        + Create Groups
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showGroupForm && (
                      <motion.div
                        className="form-container green-border"
                        variants={slideInVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <h3 className="form-title">Create Groups</h3>

                        <form onSubmit={handleCreateGroups}>
                          <div className="form-group">
                            <label className="form-label">
                              Number of Groups
                            </label>
                            <input
                              className="form-input"
                              type="number"
                              min="1"
                              max="20"
                              value={numberOfGroups}
                              onChange={(e) =>
                                setNumberOfGroups(parseInt(e.target.value) || 1)
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">
                              Teams Per Group
                            </label>
                            <input
                              className="form-input"
                              type="number"
                              min="1"
                              max="20"
                              value={teamsPerGroup}
                              onChange={(e) =>
                                setTeamsPerGroup(parseInt(e.target.value) || 1)
                              }
                            />
                          </div>

                          <div className="info-box">
                            <p>
                              <strong>Total capacity:</strong> {numberOfGroups}{" "}
                              groups × {teamsPerGroup} teams ={" "}
                              {numberOfGroups * teamsPerGroup} teams
                            </p>
                            <p>
                              <strong>Available teams:</strong> {totalTeams}{" "}
                              teams
                            </p>
                          </div>

                          <div className="form-buttons">
                            <motion.button
                              className="btn-submit"
                              type="submit"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              Create Groups
                            </motion.button>
                            <motion.button
                              className="btn-cancel"
                              type="button"
                              onClick={() => setShowGroupForm(false)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Display Groups (Setup View) */}
              {groups.length > 0 && (
                <div>
                  <div className="section-title green">
                    <h2>Created Groups ({groups.length})</h2>
                  </div>
                  <div className="groups-grid">
                    {groups.map((group, index) => (
                      <motion.div
                        key={group.id}
                        className="group-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <h3 className="group-title">{group.name}</h3>
                        <p className="group-capacity">
                          Capacity: {group.capacity} teams
                        </p>
                        <div className="slots-grid">
                          {Array(group.capacity)
                            .fill(null)
                            .map((_, i) => (
                              <div key={i} className="slot-placeholder">
                                Slot {i + 1}
                              </div>
                            ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.button
                    className="btn-finalize"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentPhase("draw")}
                  >
                    ✓ Start Team Assignment
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* Draw Phase */}
          {currentPhase === "draw" && (
            <motion.div
              key="draw"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className={`draw-status ${selectedTeam ? "selected" : "default"}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={selectedTeam ? "selected" : "unselected"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    {selectedTeam
                      ? `Selected: ${selectedTeam.name}`
                      : "Click a team, then click a slot"}
                  </motion.h2>
                </AnimatePresence>
                <p>
                  {allTeamsAssigned
                    ? "✅ All teams have been assigned!"
                    : `${assignedTeams}/${totalTeams} teams assigned`}
                </p>
                <div className="draw-control-buttons">
                  <motion.button
                    className="btn-toggle-projector-pots"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowProjectorPots(!showProjectorPots)}
                  >
                    {showProjectorPots ? "🚫 Hide Pots on Projector" : "✓ Show Pots on Projector"}
                  </motion.button>
                  <div className="layout-selector">
                    <span className="layout-label">Projector Layout:</span>
                    <motion.button
                      className={`btn-layout ${projectorLayout === "classic" ? "active" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setProjectorLayout("classic")}
                    >
                      🏛 Classic
                    </motion.button>
                    <motion.button
                      className={`btn-layout ${projectorLayout === "stadium" ? "active" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setProjectorLayout("stadium")}
                    >
                      🏟 Stadium
                    </motion.button>
                    <motion.button
                      className={`btn-layout ${projectorLayout === "broadcast" ? "active" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setProjectorLayout("broadcast")}
                    >
                      📺 Broadcast
                    </motion.button>
                    <motion.button
                      className={`btn-layout ${projectorLayout === "gala" ? "active" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setProjectorLayout("gala")}
                    >
                      ✨ Gala
                    </motion.button>
                    <motion.button
                      className={`btn-layout ${projectorLayout === "neon" ? "active" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setProjectorLayout("neon")}
                    >
                      ⚡ Neon
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              <div className="draw-sections-wrapper">
                {/* Left Pots Section */}
                <div className="pots-section">
                  <div className="section-title red">
                    <h2>Pots</h2>
                  </div>
                  <div className="draw-pots-grid">
                    {pots.slice(0, Math.ceil(pots.length / 2)).map((pot, index) => (
                      <motion.div
                        key={pot.id}
                        className="draw-pot-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <h3 className="draw-pot-title">
                          {pot.name} ({pot.teams.length})
                        </h3>
                        <div className="draw-teams-list">
                          <AnimatePresence>
                            {pot.teams.map((team) => (
                              <motion.div
                                key={team.id}
                                className={`draw-team-card ${selectedTeam?.id === team.id ? "selected" : ""} ${team.assigned ? "assigned" : ""}`}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.8,
                                  transition: { duration: 0.2 },
                                }}
                                variants={teamCardVariants}
                                whileHover="hover"
                                whileTap="tap"
                                onClick={() => !team.assigned && selectTeam(team)}
                              >
                                <span className="team-flag">{team.countryFlag || "🏴"}</span>
                                <span className="team-name-text">{team.name}</span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          {pot.teams.length === 0 && (
                            <p className="empty-pot">All teams assigned</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Groups Section */}
                <div className="groups-section">
                  <div className="section-title green">
                    <h2>Groups</h2>
                  </div>
                  <div className="draw-groups-grid">
                    {groups.map((group, index) => {
                      const filledSlots = group.teams.filter(
                        (t) => t !== null
                      ).length;
                      const isGroupComplete = filledSlots === group.capacity;

                      return (
                        <motion.div
                          key={group.id}
                          className={`draw-group-card ${isGroupComplete ? "complete" : ""}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="group-header">
                            <h3 className="draw-group-title">{group.name}</h3>
                            <span
                              className={`group-progress ${isGroupComplete ? "complete" : "incomplete"}`}
                            >
                              {filledSlots}/{group.capacity}
                            </span>
                          </div>
                          <div className="slots-list">
                            {group.teams.map((team, slotIndex) => (
                              <motion.div
                                key={slotIndex}
                                className={`slot-item ${team ? "filled" : "empty"} ${!team && selectedTeam ? "hoverable" : ""}`}
                                whileHover={
                                  team
                                    ? {
                                      x: -4,
                                      transition: { duration: 0.2 },
                                    }
                                    : selectedTeam
                                      ? {
                                        transition: { duration: 0.2 },
                                      }
                                      : {}
                                }
                                onClick={() => {
                                  if (team) {
                                    removeTeamFromSlot(group.id, slotIndex);
                                  } else if (selectedTeam) {
                                    assignTeamToSlot(group.id, slotIndex);
                                  }
                                }}
                              >
                                {team ? (
                                  <>
                                    <span className="slot-flag">{team.countryFlag || "🏴"}</span>
                                    <span>{team.name}</span>
                                  </>
                                ) : (
                                  <span>{group.name.charAt(group.name.length - 1)}{slotIndex + 1}</span>
                                )}
                                {team && <span className="slot-remove">✕</span>}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Pots Section */}
                <div className="pots-section">
                  <div className="section-title red">
                    <h2>Pots</h2>
                  </div>
                  <div className="draw-pots-grid">
                    {pots.slice(Math.ceil(pots.length / 2)).map((pot, index) => (
                      <motion.div
                        key={pot.id}
                        className="draw-pot-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (Math.ceil(pots.length / 2) + index) * 0.1 }}
                      >
                        <h3 className="draw-pot-title">
                          {pot.name} ({pot.teams.length})
                        </h3>
                        <div className="draw-teams-list">
                          <AnimatePresence>
                            {pot.teams.map((team) => (
                              <motion.div
                                key={team.id}
                                className={`draw-team-card ${selectedTeam?.id === team.id ? "selected" : ""} ${team.assigned ? "assigned" : ""}`}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.8,
                                  transition: { duration: 0.2 },
                                }}
                                variants={teamCardVariants}
                                whileHover="hover"
                                whileTap="tap"
                                onClick={() => !team.assigned && selectTeam(team)}
                              >
                                <span className="team-flag">{team.countryFlag || "🏴"}</span>
                                <span className="team-name-text">{team.name}</span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          {pot.teams.length === 0 && (
                            <p className="empty-pot">All teams assigned</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}