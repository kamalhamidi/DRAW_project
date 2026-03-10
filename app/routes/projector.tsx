import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { applyColorPalette, resetColorPalette, type ColorPalette } from "~/utils/extractColors";
import { getTeamColors } from "../../data/countryColors";

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
  const [bgAnimation, setBgAnimation] = useState<"none" | "slide" | "zoom" | "fade">("zoom");
  const [projectorLayout, setProjectorLayout] = useState<"classic" | "stadium" | "broadcast" | "gala" | "minimal" | "cinematic">("broadcast");
  const [projectorTitle, setProjectorTitle] = useState("Tournament Draw");
  const [bgImage, setBgImage] = useState<string>("/bg.png");
  const [competitionLogo, setCompetitionLogo] = useState<string>("");
  const [logoSize, setLogoSize] = useState<number>(70);
  const [footerText, setFooterText] = useState<string>("");
  const [footerSize, setFooterSize] = useState<number>(1.1);
  const [showSpotlight, setShowSpotlight] = useState(true);

  useEffect(() => {
    setHydrated(true);

    // Subscribe to the Broadcast Channel
    const channel = new BroadcastChannel("draw_sync");

    const handleMessage = (event: MessageEvent) => {
      const { pots, groups, selectedTeam, showProjectorPots, bgAnimation, projectorLayout, projectorTitle, bgImage, colorPalette, competitionLogo, logoSize, footerText, footerSize, showSpotlight } = event.data;
      setDrawState({
        pots: pots || [],
        groups: groups || [],
        selectedTeam: selectedTeam || null,
        showProjectorPots: showProjectorPots !== undefined ? showProjectorPots : true,
      });
      if (bgAnimation !== undefined) {
        setBgAnimation(bgAnimation);
      }
      if (projectorLayout !== undefined) {
        setProjectorLayout(projectorLayout);
      }
      if (projectorTitle !== undefined) {
        setProjectorTitle(projectorTitle);
      }
      if (bgImage !== undefined) {
        setBgImage(bgImage);
      }
      if (competitionLogo !== undefined) {
        setCompetitionLogo(competitionLogo);
      }
      if (logoSize !== undefined) {
        setLogoSize(logoSize);
      }
      if (footerText !== undefined) {
        setFooterText(footerText);
      }
      if (footerSize !== undefined) {
        setFooterSize(footerSize);
      }
      if (showSpotlight !== undefined) {
        setShowSpotlight(showSpotlight);
      }
      // Apply color palette from the home page
      if (colorPalette) {
        applyColorPalette(colorPalette as ColorPalette);
      } else {
        resetColorPalette();
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
    document.body.classList.remove("bg-slide", "bg-zoom", "bg-fade", "bg-none");
    document.body.classList.add(`bg-${bgAnimation}`);
  }, [bgAnimation]);

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-image", `url("${bgImage}")`);
  }, [bgImage]);

  if (!hydrated) {
    return <div className="projector-loading">Initializing Projector...</div>;
  }

  const { pots, groups, selectedTeam } = drawState;
  const assignedTeamIds = new Set<number>();
  groups.forEach((group) => {
    group.teams.forEach((team) => {
      if (team) assignedTeamIds.add(team.id);
    });
  });
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

  // ============ CLASSIC LAYOUT ============
  const renderClassicLayout = () => (
    <>
      {/* Projector Header */}
      <motion.header
        className="projector-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="projector-title-row">
          {competitionLogo && <img src={competitionLogo} alt="" className="projector-logo" style={{ height: `${logoSize}px` }} />}
          <motion.h1
            className="projector-title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {projectorTitle}
          </motion.h1>
          {competitionLogo && <img src={competitionLogo} alt="" className="projector-logo" style={{ height: `${logoSize}px` }} />}
        </div>

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

        {/* Footer Text */}
        {footerText && (
          <motion.div
            className="projector-footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="projector-footer-text" style={{ fontSize: `${footerSize}rem` }}>{footerText}</span>
          </motion.div>
        )}

        {/* Empty State */}
        {pots.length === 0 && groups.length === 0 && (
          <motion.div
            className="projector-empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {competitionLogo && (
              <motion.img
                src={competitionLogo}
                alt=""
                className="empty-state-logo"
                style={{ height: `${logoSize * 1.5}px` }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <h2>{projectorTitle || "Tournament Draw"}</h2>
            <div className="empty-state-dots">
              <span className="empty-dot" />
              <span className="empty-dot" />
              <span className="empty-dot" />
            </div>
            <p>Waiting for the draw to begin</p>
          </motion.div>
        )}
      </div>
    </>
  );

  // ============ STADIUM LAYOUT ============
  const renderStadiumLayout = () => {
    return (
      <>
        {/* Stadium Header — full-width top bar */}
        <motion.div
          className="stadium-header"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={`stadium-header-inner ${!projectorTitle.trim() && competitionLogo ? 'centered-logo' : ''}`}>
            {competitionLogo && <img src={competitionLogo} alt="" className="projector-logo" style={{ height: `${logoSize}px` }} />}
            {projectorTitle.trim() && <h1 className="stadium-title">{projectorTitle}</h1>}
          </div>
        </motion.div>

        {/* Selected Team Spotlight */}
        <AnimatePresence mode="wait">
          {showSpotlight && selectedTeam && (() => {
            const [tc1, tc2] = getTeamColors(selectedTeam.countryCode);
            return (
            <motion.div
              key="stadium-spotlight-wrapper"
              className="stadium-spotlight-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                key="stadium-spotlight"
                className="stadium-spotlight"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{
                  type: "spring", stiffness: 300, damping: 20,
                  exit: { duration: 0.2, ease: "easeIn" }
                }}
                style={{
                  "--team-color-1": tc1,
                  "--team-color-2": tc2,
                } as React.CSSProperties}
              >
                <div className="stadium-spotlight-glow" />
                <div className="stadium-spotlight-content">
                  <span className="stadium-spotlight-flag">{selectedTeam.countryFlag || "🏴"}</span>
                  <div className="stadium-spotlight-info">
                    <span className="stadium-spotlight-label">SELECTED</span>
                    <span className="stadium-spotlight-name">{selectedTeam.name}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Main Content — Side by Side */}
        <div className={`stadium-content ${!drawState.showProjectorPots ? 'pots-hidden' : ''}`}>
          {/* Left: Groups */}
          <motion.div
            className="stadium-groups-panel"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="stadium-panel-header green">
              <h2>Groups</h2>
            </div>
            {groups.length > 0 ? (
              <div className="stadium-groups-grid">
                {groups.map((group, index) => {
                  const filledSlots = group.teams.filter((t) => t !== null).length;
                  const isGroupComplete = filledSlots === group.capacity;

                  return (
                    <motion.div
                      key={group.id}
                      className={`stadium-group-card ${isGroupComplete ? "complete" : ""}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="stadium-group-top">
                        <h3 className="stadium-group-name">{group.name}</h3>
                        <span className={`stadium-group-badge ${isGroupComplete ? "complete" : ""}`}>
                          {filledSlots}/{group.capacity}
                        </span>
                      </div>
                      <div className="stadium-group-slots">
                        {group.teams.map((team, slotIndex) => (
                          <motion.div
                            key={slotIndex}
                            className={`stadium-slot ${team ? "filled" : "empty"}`}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: slotIndex * 0.05 }}
                          >
                            {team ? (
                              <motion.div
                                className="stadium-slot-team"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              >
                                <span className="stadium-slot-number">{slotIndex + 1}</span>
                                <span className="stadium-slot-flag">{team.countryFlag || "🏴"}</span>
                                <span className="stadium-slot-name">{team.name}</span>
                              </motion.div>
                            ) : (
                              <div className="stadium-slot-empty">
                                <span className="stadium-slot-number">{slotIndex + 1}</span>
                                <span className="stadium-slot-dash">—</span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="stadium-empty-panel">
                <p>Groups will appear here once created</p>
              </div>
            )}
          </motion.div>

          {/* Right: Pots */}
          <AnimatePresence mode="wait">
            {drawState.showProjectorPots && pots.length > 0 && (
              <motion.div
                className="stadium-pots-panel"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="stadium-panel-header red">
                  <h2>Pots</h2>
                </div>
                <div className="stadium-pots-list">
                  {pots.map((pot, potIndex) => (
                    <motion.div
                      key={pot.id}
                      className="stadium-pot-card"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: potIndex * 0.1 }}
                    >
                      <h4 className="stadium-pot-name">{pot.name}</h4>
                      <div className="stadium-pot-teams">
                        {pot.teams.map((team) => (
                          <motion.div
                            key={team.id}
                            className={`stadium-pot-pill ${selectedTeam?.id === team.id ? "selected" : ""} ${team.assigned ? "assigned" : ""}`}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            whileHover={{ scale: team.assigned ? 1 : 1.05 }}
                          >
                            <span className="pill-flag">{team.countryFlag || "🏴"}</span>
                            <span className="pill-name">{team.name}</span>
                          </motion.div>
                        ))}
                        {pot.teams.length === 0 && (
                          <span className="stadium-pot-done">All assigned ✓</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Text */}
        {footerText && (
          <motion.div
            className="projector-footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="projector-footer-text" style={{ fontSize: `${footerSize}rem` }}>{footerText}</span>
          </motion.div>
        )}

        {/* Empty State */}
        {pots.length === 0 && groups.length === 0 && (
          <motion.div
            className="stadium-empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {competitionLogo ? (
              <motion.img
                src={competitionLogo}
                alt=""
                className="empty-state-logo"
                style={{ height: `${logoSize * 1.5}px` }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <div className="stadium-empty-icon">🏟</div>
            )}
            <h2>{projectorTitle || "Tournament Draw"}</h2>
            <div className="empty-state-dots">
              <span className="empty-dot" />
              <span className="empty-dot" />
              <span className="empty-dot" />
            </div>
            <p>The stadium awaits the draw</p>
          </motion.div>
        )}
      </>
    );
  };

  // ============ BROADCAST LAYOUT ============
  const renderBroadcastLayout = () => {
    return (
      <div className="broadcast-wrapper">
        {/* Competition Logo */}
        {competitionLogo && (
          <div className="broadcast-logo-container">
            <img src={competitionLogo} alt="" className="projector-logo broadcast-logo" style={{ height: `${logoSize}px` }} />
          </div>
        )}
        {/* Pots Section */}
        {pots.length > 0 && drawState.showProjectorPots && (
          <motion.div
            className="broadcast-section broadcast-pots-section"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {pots.map((pot, index) => (
              <motion.div
                key={pot.id}
                className="broadcast-card"
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Floating Pill Header */}
                <div className="broadcast-card-header red">
                  <h3>{pot.name}</h3>
                </div>
                {/* Card Body */}
                <div className="broadcast-card-body">
                  {pot.teams.map((team) => {
                    const isAssigned = team.assigned || assignedTeamIds.has(team.id);

                    return (
                      <motion.div
                        key={team.id}
                        className={`broadcast-team-row ${selectedTeam?.id === team.id ? "selected" : ""} ${isAssigned ? "assigned" : ""}`}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        aria-disabled={isAssigned}
                      >
                        <span className="broadcast-team-flag">{team.countryFlag || "\ud83c\udff4"}</span>
                        <span className="broadcast-team-name">{team.name}</span>
                      </motion.div>
                    );
                  })}
                  {pot.teams.length === 0 && (
                    <div className="broadcast-empty-text">All assigned \u2713</div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Groups Section */}
        {groups.length > 0 && (
          <motion.div
            className="broadcast-section broadcast-groups-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {groups.map((group, index) => {
              const filledSlots = group.teams.filter((t) => t !== null).length;
              const isGroupComplete = filledSlots === group.capacity;

              return (
                <motion.div
                  key={group.id}
                  className={`broadcast-card ${isGroupComplete ? "complete" : ""}`}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Floating Pill Header */}
                  <div className="broadcast-card-header green">
                    <h3>{group.name}</h3>
                  </div>
                  {/* Card Body */}
                  <div className="broadcast-card-body">
                    {group.teams.map((team, slotIndex) => (
                      <motion.div
                        key={slotIndex}
                        className={`broadcast-team-row ${team ? "filled" : "empty-slot"}`}
                        layout
                      >
                        {team ? (
                          <motion.div
                            className="broadcast-slot-filled"
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <span className="broadcast-team-flag">{team.countryFlag || "\ud83c\udff4"}</span>
                            <span className="broadcast-team-name">{team.name}</span>
                          </motion.div>
                        ) : (
                          <span className="broadcast-slot-label">
                            {group.name.charAt(group.name.length - 1)}{slotIndex + 1}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Footer Text */}
        {footerText && (
          <motion.div
            className="projector-footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="projector-footer-text" style={{ fontSize: `${footerSize}rem` }}>{footerText}</span>
          </motion.div>
        )}

        {/* Empty State */}
        {pots.length === 0 && groups.length === 0 && (
          <motion.div
            className="broadcast-empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {competitionLogo ? (
              <motion.img
                src={competitionLogo}
                alt=""
                className="empty-state-logo"
                style={{ height: `${logoSize * 1.5}px` }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <div className="broadcast-empty-icon">📺</div>
            )}
            <h2>{projectorTitle || "Tournament Draw"}</h2>
            <div className="empty-state-dots">
              <span className="empty-dot" />
              <span className="empty-dot" />
              <span className="empty-dot" />
            </div>
            <p>Broadcasting will begin shortly</p>
          </motion.div>
        )}
      </div>
    );
  };

  // ============ GALA LAYOUT ============
  const renderGalaLayout = () => {
    return (
      <div className="gala-wrapper">
        {/* Gala Title Bar */}
        <motion.div
          className="gala-title-bar"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="gala-title-ornament">✦</div>
          {competitionLogo && <img src={competitionLogo} alt="" className="projector-logo gala-logo" style={{ height: `${logoSize}px` }} />}
          <h1 className="gala-title">{projectorTitle}</h1>
          {competitionLogo && <img src={competitionLogo} alt="" className="projector-logo gala-logo" style={{ height: `${logoSize}px` }} />}
          <div className="gala-title-ornament">✦</div>
        </motion.div>

        {/* Selected Team Spotlight */}
        <AnimatePresence mode="wait">
          {showSpotlight && selectedTeam && (() => {
            const [tc1, tc2] = getTeamColors(selectedTeam.countryCode);
            return (
            <motion.div
              key="gala-spotlight-wrapper"
              className="gala-spotlight-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                key="gala-selected"
                className="gala-spotlight"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{
                  type: "spring", stiffness: 300, damping: 20,
                  exit: { duration: 0.2, ease: "easeIn" }
                }}
                style={{
                  "--team-color-1": tc1,
                  "--team-color-2": tc2,
                } as React.CSSProperties}
              >
                <div className="gala-spotlight-border" />
                <div className="gala-spotlight-glow" />
                <div className="gala-spotlight-inner">
                  <span className="gala-spotlight-flag">{selectedTeam.countryFlag || "🏴"}</span>
                  <div className="gala-spotlight-text">
                    <span className="gala-spotlight-sub">SELECTED</span>
                    <span className="gala-spotlight-name">{selectedTeam.name}</span>
                  </div>
                  <span className="gala-spotlight-flag">{selectedTeam.countryFlag || "🏴"}</span>
                </div>
              </motion.div>
            </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Decorative Divider */}
        <div className="gala-divider">
          <span className="gala-divider-line" />
          <span className="gala-divider-diamond">◇</span>
          <span className="gala-divider-line" />
        </div>

        {/* Two-Panel Content */}
        <div className={`gala-content ${!drawState.showProjectorPots ? 'pots-hidden' : ''}`}>
          {/* Groups Panel */}
          <div className="gala-panel gala-groups-panel">
            {groups.length > 0 ? (
              <div className="gala-groups-list">
                {groups.map((group, index) => {
                  const filledSlots = group.teams.filter((t) => t !== null).length;
                  const isGroupComplete = filledSlots === group.capacity;

                  return (
                    <motion.div
                      key={group.id}
                      className={`gala-group-card ${isGroupComplete ? "complete" : ""}`}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.12 }}
                    >
                      <div className="gala-group-header">
                        <h3>{group.name}</h3>
                        <span className={`gala-group-count ${isGroupComplete ? "done" : ""}`}>
                          {filledSlots}/{group.capacity}
                        </span>
                      </div>
                      <div className="gala-group-rows">
                        {group.teams.map((team, slotIndex) => (
                          <motion.div
                            key={slotIndex}
                            className={`gala-row ${team ? "filled" : "empty"}`}
                            layout
                          >
                            <span className="gala-row-num">{slotIndex + 1}</span>
                            {team ? (
                              <motion.div
                                className="gala-row-team"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: "spring", stiffness: 250 }}
                              >
                                <span className="gala-row-flag">{team.countryFlag || "🏴"}</span>
                                <span className="gala-row-name">{team.name}</span>
                              </motion.div>
                            ) : (
                              <span className="gala-row-empty">—</span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="gala-empty-panel">
                <p>Groups will appear once created</p>
              </div>
            )}
          </div>

          {/* Pots Panel */}
          <AnimatePresence>
            {drawState.showProjectorPots && pots.length > 0 && (
              <motion.div
                className="gala-panel gala-pots-panel"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.4 }}
              >
                {pots.map((pot, potIndex) => (
                  <motion.div
                    key={pot.id}
                    className="gala-pot-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: potIndex * 0.1 }}
                  >
                    <div className="gala-pot-header">
                      <h4>{pot.name}</h4>
                    </div>
                    <div className="gala-pot-teams">
                      {pot.teams.map((team) => (
                        <motion.div
                          key={team.id}
                          className={`gala-pot-team ${selectedTeam?.id === team.id ? "active" : ""} ${team.assigned ? "used" : ""}`}
                          layout
                        >
                          <span className="gala-pot-flag">{team.countryFlag || "🏴"}</span>
                          <span className="gala-pot-name">{team.name}</span>
                        </motion.div>
                      ))}
                      {pot.teams.length === 0 && (
                        <span className="gala-pot-done">All assigned ✓</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Text */}
        {footerText && (
          <motion.div
            className="projector-footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="projector-footer-text" style={{ fontSize: `${footerSize}rem` }}>{footerText}</span>
          </motion.div>
        )}

        {/* Empty State */}
        {pots.length === 0 && groups.length === 0 && (
          <motion.div
            className="gala-empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {competitionLogo ? (
              <motion.img
                src={competitionLogo}
                alt=""
                className="empty-state-logo gala-empty-logo"
                style={{ height: `${logoSize * 1.5}px` }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <div className="gala-empty-star">✨</div>
            )}
            <h2>{projectorTitle || "The Stage Is Set"}</h2>
            <div className="empty-state-dots gala-dots">
              <span className="empty-dot" />
              <span className="empty-dot" />
              <span className="empty-dot" />
            </div>
            <p>Awaiting the ceremony to begin</p>
          </motion.div>
        )}
      </div>
    );
  };

  // ============ MINIMAL LAYOUT ============
  const renderMinimalLayout = () => {
    return (
      <div className="minimal-wrapper">
        {/* Subtle ambient light */}
        <div className="minimal-ambient" />

        {/* Header */}
        <motion.header
          className="minimal-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className={`minimal-header-inner ${!projectorTitle.trim() && competitionLogo ? 'centered-logo' : ''}`}>
            {competitionLogo && <img src={competitionLogo} alt="" className="projector-logo minimal-logo" style={{ height: `${logoSize}px` }} />}
            {projectorTitle.trim() && <h1 className="minimal-title">{projectorTitle}</h1>}
          </div>
          {(pots.length > 0 || groups.length > 0) && (
            <div className="minimal-progress">
              <span className="minimal-progress-text">
                {allTeamsAssigned ? "Complete" : "In Progress"}
              </span>
              <div className="minimal-progress-bar">
                <motion.div
                  className="minimal-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${groups.length > 0 ? (groups.reduce((acc, g) => acc + g.teams.filter(t => t !== null).length, 0) / groups.reduce((acc, g) => acc + g.capacity, 0)) * 100 : 0}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </motion.header>

        {/* Selected Team Banner */}
        <AnimatePresence mode="wait">
          {selectedTeam && (
            <motion.div
              key="minimal-selected"
              className="minimal-selected"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <span className="minimal-selected-flag">{selectedTeam.countryFlag || "🏴"}</span>
              <div className="minimal-selected-info">
                <span className="minimal-selected-label">Selected</span>
                <span className="minimal-selected-name">{selectedTeam.name}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className={`minimal-content ${!drawState.showProjectorPots ? 'pots-hidden' : ''}`}>
          {/* Groups */}
          {groups.length > 0 && (
            <motion.div
              className="minimal-groups"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="minimal-groups-grid">
                {groups.map((group, index) => {
                  const filledSlots = group.teams.filter((t) => t !== null).length;
                  const isComplete = filledSlots === group.capacity;

                  return (
                    <motion.div
                      key={group.id}
                      className={`minimal-group-card ${isComplete ? "complete" : ""}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.4 }}
                    >
                      <div className="minimal-group-top">
                        <h3 className="minimal-group-name">{group.name}</h3>
                        <span className={`minimal-group-badge ${isComplete ? "done" : ""}`}>
                          {filledSlots}/{group.capacity}
                        </span>
                      </div>
                      <div className="minimal-group-teams">
                        {group.teams.map((team, slotIndex) => (
                          <motion.div
                            key={slotIndex}
                            className={`minimal-team-row ${team ? "filled" : "empty"}`}
                            layout
                          >
                            <span className="minimal-row-num">{slotIndex + 1}</span>
                            {team ? (
                              <motion.div
                                className="minimal-row-team"
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <span className="minimal-row-flag">{team.countryFlag || "🏴"}</span>
                                <span className="minimal-row-name">{team.name}</span>
                              </motion.div>
                            ) : (
                              <span className="minimal-row-empty">—</span>
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

          {/* Pots */}
          <AnimatePresence>
            {drawState.showProjectorPots && pots.length > 0 && (
              <motion.div
                className="minimal-pots"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
              >
                {pots.map((pot, potIndex) => (
                  <motion.div
                    key={pot.id}
                    className="minimal-pot-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: potIndex * 0.08 }}
                  >
                    <div className="minimal-pot-header">
                      <h4>{pot.name}</h4>
                    </div>
                    <div className="minimal-pot-teams">
                      {pot.teams.map((team) => (
                        <motion.div
                          key={team.id}
                          className={`minimal-pot-team ${selectedTeam?.id === team.id ? "active" : ""} ${team.assigned ? "used" : ""}`}
                          layout
                        >
                          <span className="minimal-pot-flag">{team.countryFlag || "🏴"}</span>
                          <span className="minimal-pot-name">{team.name}</span>
                        </motion.div>
                      ))}
                      {pot.teams.length === 0 && (
                        <div className="minimal-pot-done">All assigned ✓</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {footerText && (
          <motion.div
            className="projector-footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="projector-footer-text" style={{ fontSize: `${footerSize}rem` }}>{footerText}</span>
          </motion.div>
        )}

        {/* Empty State */}
        {pots.length === 0 && groups.length === 0 && (
          <motion.div
            className="minimal-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {competitionLogo ? (
              <motion.img
                src={competitionLogo}
                alt=""
                className="empty-state-logo minimal-empty-logo"
                style={{ height: `${logoSize * 1.5}px` }}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <div className="minimal-empty-icon">◈</div>
            )}
            <h2>{projectorTitle || "Tournament Draw"}</h2>
            <div className="empty-state-dots minimal-dots">
              <span className="empty-dot" />
              <span className="empty-dot" />
              <span className="empty-dot" />
            </div>
            <p>Waiting for the draw to begin</p>
          </motion.div>
        )}
      </div>
    );
  };

  // ============ CINEMATIC LAYOUT ============
  const renderCinematicLayout = () => {
    const maxSlots = groups.length > 0 ? Math.max(...groups.map(g => g.capacity)) : 0;

    return (
      <div className="cine-wrapper">
        {/* Film grain */}
        <div className="cine-grain" />
        {/* Letterbox bars */}
        <div className="cine-bar cine-bar-top" />
        <div className="cine-bar cine-bar-bottom" />
        {/* Floating bokeh */}
        <div className="cine-bokeh">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className={`cine-orb cine-orb-${i + 1}`} />
          ))}
        </div>

        {/* Logo + Title — centered */}
        <motion.div
          className="cine-brand"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {competitionLogo && (
            <img src={competitionLogo} alt="" className="projector-logo cine-brand-logo" style={{ height: `${logoSize}px` }} />
          )}
          {projectorTitle.trim() && <h1 className="cine-brand-title">{projectorTitle}</h1>}
        </motion.div>

        {/* Pots — horizontal compact tabs at top */}
        <AnimatePresence>
          {drawState.showProjectorPots && pots.length > 0 && (
            <motion.div
              className="cine-pots-strip"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
            >
              {pots.map((pot) => (
                <div key={pot.id} className="cine-pot-tab">
                  <span className="cine-pot-tab-name">{pot.name}</span>
                  <div className="cine-pot-tab-teams">
                    {pot.teams.map((team) => (
                      <motion.span
                        key={team.id}
                        className={`cine-pot-pill ${selectedTeam?.id === team.id ? "active" : ""} ${team.assigned ? "used" : ""}`}
                        layout
                      >
                        <span className="cine-pot-pill-flag">{team.countryFlag || "🏴"}</span>
                        <span className="cine-pot-pill-name">{team.name}</span>
                      </motion.span>
                    ))}
                    {pot.teams.length === 0 && (
                      <span className="cine-pot-tab-done">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Team — FULL SCREEN TAKEOVER */}
        <AnimatePresence mode="wait">
          {selectedTeam && (() => {
            const [tc1, tc2] = getTeamColors(selectedTeam.countryCode);
            return (
              <motion.div
                key={`cine-take-${selectedTeam.id}`}
                className="cine-takeover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  "--cine-tc1": tc1,
                  "--cine-tc2": tc2,
                } as React.CSSProperties}
              >
                <motion.div
                  className="cine-takeover-inner"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.15, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <div className="cine-takeover-glow" />
                  <motion.span
                    className="cine-takeover-flag"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 250, damping: 15, delay: 0.1 }}
                  >
                    {selectedTeam.countryFlag || "🏴"}
                  </motion.span>
                  <motion.span
                    className="cine-takeover-name"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    {selectedTeam.name}
                  </motion.span>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* THE DRAW BOARD — unified table, groups as columns */}
        {groups.length > 0 && (
          <motion.div
            className="cine-board"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <table className="cine-table">
              <thead>
                <tr>
                  {groups.map((group) => {
                    const filled = group.teams.filter(t => t !== null).length;
                    const done = filled === group.capacity;
                    return (
                      <th key={group.id} className={done ? "complete" : ""}>
                        <span className="cine-th-name">{group.name}</span>
                        <span className={`cine-th-count ${done ? "done" : ""}`}>{filled}/{group.capacity}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxSlots }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {groups.map((group) => {
                      const team = group.teams[rowIdx] || null;
                      return (
                        <td key={group.id} className={team ? "filled" : "empty"}>
                          {team ? (
                            <motion.div
                              className="cine-cell"
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <span className="cine-cell-flag">{team.countryFlag || "🏴"}</span>
                              <span className="cine-cell-name">{team.name}</span>
                            </motion.div>
                          ) : (
                            <div className="cine-cell-empty">
                              <span className="cine-cell-num">{rowIdx + 1}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Footer */}
        {footerText && (
          <motion.div
            className="projector-footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="projector-footer-text" style={{ fontSize: `${footerSize}rem` }}>{footerText}</span>
          </motion.div>
        )}

        {/* Empty State */}
        {pots.length === 0 && groups.length === 0 && (
          <motion.div
            className="cine-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          >
            {competitionLogo ? (
              <motion.img
                src={competitionLogo}
                alt=""
                className="empty-state-logo cine-empty-logo"
                style={{ height: `${logoSize * 1.8}px` }}
                animate={{ scale: [1, 1.03, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <div className="cine-empty-icon">🎬</div>
            )}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              {projectorTitle || "The Stage Is Set"}
            </motion.h2>
            <div className="empty-state-dots cine-dots">
              <span className="empty-dot" />
              <span className="empty-dot" />
              <span className="empty-dot" />
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // Determine container class
  const containerClass = [
    "projector-container",
    projectorLayout === "stadium" ? "stadium-mode" : "",
    projectorLayout === "broadcast" ? "broadcast-mode" : "",
    projectorLayout === "gala" ? "gala-mode" : "",
    projectorLayout === "minimal" ? "minimal-mode" : "",
    projectorLayout === "cinematic" ? "cinematic-mode" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={containerClass}>
      <AnimatePresence mode="wait">
        {projectorLayout === "classic" && (
          <motion.div
            key="classic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {renderClassicLayout()}
          </motion.div>
        )}
        {projectorLayout === "stadium" && (
          <motion.div
            key="stadium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {renderStadiumLayout()}
          </motion.div>
        )}
        {projectorLayout === "broadcast" && (
          <motion.div
            key="broadcast"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {renderBroadcastLayout()}
          </motion.div>
        )}
        {projectorLayout === "gala" && (
          <motion.div
            key="gala"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {renderGalaLayout()}
          </motion.div>
        )}
        {projectorLayout === "minimal" && (
          <motion.div
            key="minimal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {renderMinimalLayout()}
          </motion.div>
        )}
        {projectorLayout === "cinematic" && (
          <motion.div
            key="cinematic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {renderCinematicLayout()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Indicator */}
      <motion.div
        className="sync-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <span className="sync-dot"></span>
        <span className="sync-text">Live Sync Active </span>
      </motion.div>
    </div>
  );
}
