import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTournamentStore } from "zustand/tournament-store";
import { africaCountries } from "data/africaCountries";
import { extractColorsFromImage, applyColorPalette, resetColorPalette, type ColorPalette } from "~/utils/extractColors";

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
  const [bgAnimation, setBgAnimation] = useState<"none" | "slide" | "zoom" | "fade">("zoom");
  const [projectorLayout, setProjectorLayout] = useState<"classic" | "stadium" | "broadcast" | "gala" | "neon">("broadcast");
  const [projectorTitle, setProjectorTitle] = useState("Tournament Draw");
  const [showProjectorSettings, setShowProjectorSettings] = useState(false);
  const [bgImage, setBgImage] = useState<string>("/bg.png");
  const [competitionLogo, setCompetitionLogo] = useState<string>("");
  const [colorMode, setColorMode] = useState<"auto" | "manual">("manual");
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [manualPalette, setManualPalette] = useState<ColorPalette>({
    primary: "#8200C5",
    primaryDark: "#560A8F",
    accent1: "#FF3C49",
    accent2: "#0AFD09",
    accent2Text: "#560A8F",
    highlight: "#6CBD45",
  });

  // Broadcast Channel for projector sync
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    setHydrated(true);
    // Initialize Broadcast Channel
    broadcastChannelRef.current = new BroadcastChannel("draw_sync");
  }, []);

  useEffect(() => {
    document.body.classList.remove("bg-slide", "bg-zoom", "bg-fade", "bg-none");
    document.body.classList.add(`bg-${bgAnimation}`);
  }, [bgAnimation]);

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-image", `url("${bgImage}")`);

    // Only auto-extract when in auto mode
    if (colorMode === "auto") {
      extractColorsFromImage(bgImage).then((palette) => {
        if (palette) {
          setColorPalette(palette);
          applyColorPalette(palette);
        } else {
          setColorPalette(null);
          resetColorPalette();
        }
      });
    }
  }, [bgImage, colorMode]);

  // Apply manual palette when in manual mode or when manualPalette changes
  useEffect(() => {
    if (colorMode === "manual") {
      setColorPalette(manualPalette);
      applyColorPalette(manualPalette);
    }
  }, [colorMode, manualPalette]);

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
        projectorTitle,
        bgImage,
        colorPalette,
        competitionLogo,
      });
    }
  }, [pots, groups, selectedTeam, hydrated, showProjectorPots, bgAnimation, projectorLayout, projectorTitle, bgImage, colorPalette, competitionLogo]);

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

  const loadTestData = () => {
    resetTournament();
    const testPots = [
      { name: "Pot 1", teams: ["Egypt", "Morocco", "Senegal", "Nigeria"], codes: ["EG", "MA", "SN", "NG"], flags: ["🇪🇬", "🇲🇦", "🇸🇳", "🇳🇬"] },
      { name: "Pot 2", teams: ["Cameroon", "Algeria", "Tunisia", "Ivory Coast"], codes: ["CM", "DZ", "TN", "CI"], flags: ["🇨🇲", "🇩🇿", "🇹🇳", "🇨🇮"] },
      { name: "Pot 3", teams: ["Ghana", "Mali", "South Africa", "DR Congo"], codes: ["GH", "ML", "ZA", "CD"], flags: ["🇬🇭", "🇲🇱", "🇿🇦", "🇨🇩"] },
      { name: "Pot 4", teams: ["Guinea", "Gabon", "Cape Verde", "Mozambique"], codes: ["GN", "GA", "CV", "MZ"], flags: ["🇬🇳", "🇬🇦", "🇨🇻", "🇲🇿"] },
    ];
    testPots.forEach((pot, potIndex) => {
      const countries = pot.teams.map((_, i) => ({ code: pot.codes[i], flag: pot.flags[i] }));
      // Offset each pot's timestamp to avoid ID collisions
      const originalDateNow = Date.now;
      Date.now = () => originalDateNow() + potIndex * 1000;
      addPotWithTeams(pot.name, pot.teams, countries);
      Date.now = originalDateNow;
    });
    setTimeout(() => {
      finalizePots();
      createGroups(4, 4);
      setCurrentPhase("draw");
    }, 100);
  };

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
      {/* ===== NAVBAR ===== */}
      <motion.nav
        className="navbar"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="navbar-inner">
          {/* Left: Brand */}
          <div className="navbar-brand">
            <span className="navbar-logo">⚽</span>
            <span className="navbar-title">Tournament Draw</span>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="navbar-tabs">
            <motion.button
              className={`navbar-tab ${currentPhase === "setup" ? "active" : ""}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPhase("setup")}
            >
              <span className="tab-icon">🛠</span>
              <span className="tab-text">Setup</span>
              {!potsFinalized && pots.length > 0 && (
                <span className="tab-badge red">{pots.length}</span>
              )}
            </motion.button>
            <motion.button
              className={`navbar-tab ${currentPhase === "draw" ? "active" : ""} ${groups.length === 0 ? "disabled" : ""}`}
              whileHover={{ scale: groups.length > 0 ? 1.05 : 1 }}
              whileTap={{ scale: groups.length > 0 ? 0.95 : 1 }}
              onClick={() => groups.length > 0 && setCurrentPhase("draw")}
            >
              <span className="tab-icon">🎯</span>
              <span className="tab-text">Draw</span>
              {assignedTeams > 0 && (
                <span className="tab-badge green">{assignedTeams}/{totalTeams}</span>
              )}
            </motion.button>
          </div>

          {/* Right: Actions */}
          <div className="navbar-actions">
            <motion.button
              className="navbar-btn navbar-btn-test"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadTestData}
              title="Load test data: 4 pots × 4 teams + 4 groups"
            >
              🧪 Test
            </motion.button>
            <motion.button
              className="navbar-btn navbar-btn-projector"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.open("/projector", "projector", "width=1600,height=900")}
              title="Open Projector Window"
            >
              🎬 Projector
            </motion.button>
            <motion.button
              className={`navbar-btn navbar-btn-settings ${showProjectorSettings ? "active" : ""}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProjectorSettings(!showProjectorSettings)}
              title="Projector Settings"
            >
              ⚙️
            </motion.button>
            <motion.button
              className="navbar-btn navbar-btn-reset"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (window.confirm("Reset everything? This will clear all pots, groups, and assignments.")) {
                  resetTournament();
                }
              }}
              title="Reset Tournament"
            >
              ↺
            </motion.button>
          </div>
        </div>

        {/* Projector Settings Panel (slides down) */}
        <AnimatePresence>
          {showProjectorSettings && (
            <motion.div
              className="projector-settings-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="settings-panel-inner">
                {/* Title */}
                <div className="settings-group">
                  <label className="settings-label">Projector Title</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={projectorTitle}
                    onChange={(e) => setProjectorTitle(e.target.value)}
                    placeholder="Enter title..."
                  />
                </div>

                {/* Competition Logo */}
                <div className="settings-group">
                  <label className="settings-label">Competition Logo</label>
                  <div className="settings-bg-picker">
                    {competitionLogo && (
                      <img src={competitionLogo} alt="Logo" className="settings-logo-preview" />
                    )}
                    <label className="settings-file-btn">
                      🏆 {competitionLogo ? "Change" : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setCompetitionLogo(url);
                          }
                        }}
                      />
                    </label>
                    {competitionLogo && (
                      <motion.button
                        className="settings-layout-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCompetitionLogo("")}
                      >
                        ✕ Remove
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Layout */}
                <div className="settings-group">
                  <label className="settings-label">Layout</label>
                  <div className="settings-layout-btns">
                    {([
                      { key: "classic", icon: "🏛", label: "Classic" },
                      { key: "stadium", icon: "🏟", label: "Stadium" },
                      { key: "broadcast", icon: "📺", label: "Broadcast" },
                      { key: "gala", icon: "✨", label: "Gala" },
                      { key: "neon", icon: "⚡", label: "Neon" },
                    ] as const).map((layout) => (
                      <motion.button
                        key={layout.key}
                        className={`settings-layout-btn ${projectorLayout === layout.key ? "active" : ""}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setProjectorLayout(layout.key)}
                      >
                        <span>{layout.icon}</span>
                        <span>{layout.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Background Animation */}
                <div className="settings-group">
                  <label className="settings-label">Background</label>
                  <div className="settings-layout-btns">
                    {([
                      { key: "none", label: "None" },
                      { key: "slide", label: "Slide" },
                      { key: "zoom", label: "Zoom" },
                      { key: "fade", label: "Fade" },
                    ] as const).map((bg) => (
                      <motion.button
                        key={bg.key}
                        className={`settings-layout-btn ${bgAnimation === bg.key ? "active" : ""}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setBgAnimation(bg.key)}
                      >
                        {bg.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Background Image */}
                <div className="settings-group">
                  <label className="settings-label">Background Image</label>
                  <div className="settings-bg-picker">
                    <label className="settings-file-btn">
                      📁 Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setBgImage(url);
                          }
                        }}
                      />
                    </label>
                    {bgImage !== "/bg.png" && (
                      <motion.button
                        className="settings-layout-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setBgImage("/bg.png")}
                      >
                        ↺ Default
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Color Mode */}
                <div className="settings-group">
                  <label className="settings-label">Colors</label>
                  <div className="settings-layout-btns">
                    <motion.button
                      className={`settings-layout-btn ${colorMode === "auto" ? "active" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setColorMode("auto")}
                    >
                      🎨 Auto
                    </motion.button>
                    <motion.button
                      className={`settings-layout-btn ${colorMode === "manual" ? "active" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setColorMode("manual")}
                    >
                      ✏️ Manual
                    </motion.button>
                  </div>
                </div>

                {/* Manual Color Pickers */}
                {colorMode === "manual" && (
                  <div className="settings-group">
                    <label className="settings-label">Theme Colors</label>
                    <div className="settings-color-grid">
                      {([
                        { key: "primary" as const, label: "Primary" },
                        { key: "primaryDark" as const, label: "Dark" },
                        { key: "accent1" as const, label: "Accent 1" },
                        { key: "accent2" as const, label: "Accent 2" },
                        { key: "highlight" as const, label: "Highlight" },
                        { key: "accent2Text" as const, label: "A2 Text" },
                      ]).map((c) => (
                        <label key={c.key} className="settings-color-item">
                          <input
                            type="color"
                            className="settings-color-input"
                            value={manualPalette[c.key]}
                            onChange={(e) =>
                              setManualPalette((prev) => ({ ...prev, [c.key]: e.target.value }))
                            }
                          />
                          <span className="settings-color-label">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show/Hide Pots */}
                <div className="settings-group">
                  <label className="settings-label">Pots Visibility</label>
                  <motion.button
                    className={`settings-toggle ${showProjectorPots ? "on" : "off"}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowProjectorPots(!showProjectorPots)}
                  >
                    {showProjectorPots ? "✓ Pots Visible" : "🚫 Pots Hidden"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Progress Bar */}
      {totalTeams > 0 && (
        <div className="progress-bar-container">
          <motion.div
            className="progress-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: totalTeams > 0 ? `${(assignedTeams / totalTeams) * 100}%` : "0%" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

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
                  {selectedTeam && (
                    <motion.button
                      className="btn-toggle-projector-pots"
                      style={{ borderColor: '#0AFD09', color: '#0AFD09' }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectTeam(null)}
                    >
                      ✕ Deselect Team
                    </motion.button>
                  )}
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