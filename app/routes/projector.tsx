import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import { applyColorPalette, resetColorPalette, extractColorsFromImage, type ColorPalette } from "~/utils/extractColors";
import { getTeamColors } from "../../data/countryColors";
import { FlagImg } from "~/components/FlagImg";

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
  capacity: number;
  teams: (Team | null)[];
}

interface Match {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  group: string;
  homeSlotIndex: number;
  awaySlotIndex: number;
  homePlaceholder: string;
  awayPlaceholder: string;
}

interface DrawState {
  pots: Pot[];
  groups: Group[];
  selectedTeam: Team | null;
  showProjectorPots: boolean;
}

export default function ProjectorView() {
  const projectorCaptureRef = useRef<HTMLDivElement | null>(null);
  const isExportingRef = useRef(false);
  const [drawState, setDrawState] = useState<DrawState>({
    pots: [],
    groups: [],
    selectedTeam: null,
    showProjectorPots: true,
  });

  const [hydrated, setHydrated] = useState(false);
  const [bgAnimation, setBgAnimation] = useState<"none" | "slide" | "zoom" | "fade" | "rotate">("zoom");
  const [projectorLayout, setProjectorLayout] = useState<"classic" | "stadium" | "broadcast" | "gala" | "minimal" | "cinematic">("broadcast");
  const [projectorTitle, setProjectorTitle] = useState("Tournament Draw");
  const [bgImage, setBgImage] = useState<string>("/bg.png");
  const [competitionLogo, setCompetitionLogo] = useState<string>("");
  const [logoSize, setLogoSize] = useState<number>(70);
  const [footerText, setFooterText] = useState<string>("");
  const [footerSize, setFooterSize] = useState<number>(1.1);
  const [teamFontScale, setTeamFontScale] = useState<number>(1);
  const [potFontScale, setPotFontScale] = useState<number>(1);
  const [broadcastPotRows, setBroadcastPotRows] = useState<number>(6);
  const [showSpotlight, setShowSpotlight] = useState(true);
  const [selectedTeamColors, setSelectedTeamColors] = useState<[string, string]>(["#ffffff", "#cccccc"]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [roundNotes, setRoundNotes] = useState<Record<number, string>>({});
  const [projectorDisplayMode, setProjectorDisplayMode] = useState<"groups" | "matches">("groups");
  const [matchesLayout, setMatchesLayout] = useState<"default" | "gala" | "ultra" | "broadcast">("default");
  const [galaOrientation, setGalaOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [galaColorSwap, setGalaColorSwap] = useState(false);

  const getGroupSlotPrefix = (groupName: string) =>
    (groupName.match(/[A-Za-z]+$/)?.[0] ?? groupName.match(/[A-Za-z]/)?.[0] ?? "G").toUpperCase();

  const exportProjectorImage = async () => {
    if (!projectorCaptureRef.current) return;
    if (isExportingRef.current) return;

    isExportingRef.current = true;

    try {
      const canvas = await html2canvas(projectorCaptureRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
        windowWidth: projectorCaptureRef.current.clientWidth || window.innerWidth,
        windowHeight: projectorCaptureRef.current.clientHeight || window.innerHeight,
        onclone: (clonedDoc) => {
          const cloneRoot = clonedDoc.getElementById("projector-export-root") as HTMLDivElement | null;
          if (cloneRoot) {
            cloneRoot.style.backgroundImage = `url("${bgImage}")`;
            cloneRoot.style.backgroundSize = "cover";
            cloneRoot.style.backgroundPosition = "center center";
            cloneRoot.style.backgroundRepeat = "no-repeat";

            cloneRoot.querySelectorAll<HTMLElement>("*").forEach((el) => {
              el.style.animation = "none";
              el.style.transition = "none";
              if (el.style.opacity === "0") {
                el.style.opacity = "1";
              }
              if (el.style.transform && el.style.transform !== "none") {
                el.style.transform = "none";
              }
            });
          }
        },
      });

      const rawTitle = (projectorTitle || "projector-design").trim().toLowerCase();
      const slugTitle = rawTitle
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "projector-design";
      const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
      const fileName = `${slugTitle}-${timestamp}.png`;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), "image/png", 1);
      });

      if (!blob) {
        throw new Error("Could not generate image blob");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      const feedback = new BroadcastChannel("draw_sync");
      feedback.postMessage({ event: "export-projector-image-result", ok: true, fileName });
      feedback.close();
    } catch (error) {
      console.error("Failed to export projector image:", error);
      const feedback = new BroadcastChannel("draw_sync");
      feedback.postMessage({ event: "export-projector-image-result", ok: false });
      feedback.close();
    } finally {
      isExportingRef.current = false;
    }
  };

  useEffect(() => {
    setHydrated(true);

    // Subscribe to the Broadcast Channel
    const channel = new BroadcastChannel("draw_sync");

    const applyIncomingState = (data: any) => {
      const { pots, groups, selectedTeam, showProjectorPots, bgAnimation, projectorLayout, projectorTitle, bgImage, colorPalette, competitionLogo, logoSize, footerText, footerSize, teamFontScale, potFontScale: incomingPotFontScale, broadcastPotRows: incomingBroadcastPotRows, showSpotlight, matches: incomingMatches, roundNotes: incomingRoundNotes, projectorDisplayMode: incomingDisplayMode, matchesLayout: incomingMatchesLayout, galaOrientation: incomingGalaOrientation, galaColorSwap: incomingGalaColorSwap } = data;
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
      if (teamFontScale !== undefined) {
        setTeamFontScale(teamFontScale);
      }
      if (incomingPotFontScale !== undefined) {
        setPotFontScale(incomingPotFontScale);
      }
      if (incomingBroadcastPotRows !== undefined) {
        setBroadcastPotRows(incomingBroadcastPotRows);
      }
      if (showSpotlight !== undefined) {
        setShowSpotlight(showSpotlight);
      }
      if (incomingMatches !== undefined) {
        setMatches(incomingMatches);
      }
      if (incomingRoundNotes !== undefined) {
        setRoundNotes(incomingRoundNotes);
      }
      if (incomingDisplayMode !== undefined) {
        setProjectorDisplayMode(incomingDisplayMode);
      }
      if (incomingMatchesLayout !== undefined) {
        setMatchesLayout(incomingMatchesLayout);
      }
      if (incomingGalaOrientation !== undefined) {
        setGalaOrientation(incomingGalaOrientation);
      }
      if (incomingGalaColorSwap !== undefined) {
        setGalaColorSwap(Boolean(incomingGalaColorSwap));
      }
      // Apply color palette from the home page
      if (colorPalette) {
        applyColorPalette(colorPalette as ColorPalette);
      } else {
        resetColorPalette();
      }
    };

    try {
      const persisted = localStorage.getItem("projector-last-state");
      if (persisted) {
        applyIncomingState(JSON.parse(persisted));
      }
    } catch {
      // Ignore invalid persisted projector state
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data || {};

      if (data.command === "export-projector-image") {
        void exportProjectorImage();
        return;
      }

      applyIncomingState(data);
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
    document.body.classList.remove("bg-slide", "bg-zoom", "bg-fade", "bg-rotate", "bg-none");
    document.body.classList.add(`bg-${bgAnimation}`);
  }, [bgAnimation]);

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-image", `url("${bgImage}")`);
  }, [bgImage]);

  useEffect(() => {
    let cancelled = false;

    const resolveSelectedTeamColors = async () => {
      if (!drawState.selectedTeam) {
        return;
      }

      const fallback = getTeamColors(drawState.selectedTeam.countryCode);

      if (drawState.selectedTeam.customFlagImage) {
        const palette = await extractColorsFromImage(drawState.selectedTeam.customFlagImage);
        if (cancelled) return;

        if (palette) {
          setSelectedTeamColors([palette.accent1, palette.accent2]);
          return;
        }
      }

      if (!cancelled) {
        setSelectedTeamColors(fallback);
      }
    };

    resolveSelectedTeamColors();

    return () => {
      cancelled = true;
    };
  }, [drawState.selectedTeam]);

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
                  <FlagImg src={selectedTeam.customFlagImage} code={selectedTeam.countryCode} size="xl" className="showcase-flag" />
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
                            <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="team-flag" />
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
                              <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="slot-flag" />
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
            const [tc1, tc2] = selectedTeamColors;
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
                exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2, ease: "easeIn" } }}
                transition={{
                  type: "spring", stiffness: 300, damping: 20,
                }}
                style={{
                  "--team-color-1": tc1,
                  "--team-color-2": tc2,
                } as React.CSSProperties}
              >
                <div className="stadium-spotlight-glow" />
                <div className="stadium-spotlight-content">
                  <FlagImg src={selectedTeam.customFlagImage} code={selectedTeam.countryCode} size="xl" className="stadium-spotlight-flag" />
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
            
            {groups.length > 0 ? (
              <div className="stadium-groups-grid">
                {groups.map((group, index) => {
                  const filledSlots = group.teams.filter((t) => t !== null).length;
                  const isGroupComplete = filledSlots === group.capacity;
                  const groupPrefix = getGroupSlotPrefix(group.name);

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
                                <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="stadium-slot-flag" />
                                <span className="stadium-slot-name">{team.name}</span>
                              </motion.div>
                            ) : (
                              <div className="stadium-slot-empty">
                                <span className="stadium-slot-number">{`${groupPrefix}${slotIndex + 1}`}</span>
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
                            <FlagImg src={team.customFlagImage} code={team.countryCode} size="xs" className="pill-flag" />
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
            className={`broadcast-section broadcast-pots-section ${broadcastPotRows === 1 ? "rows-one-cards" : ""}`}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {pots.map((pot, index) => (
              (() => {
                const safeRows = Math.max(1, Math.min(broadcastPotRows, Math.max(1, pot.teams.length)));
                const safeCols = Math.max(1, Math.ceil(pot.teams.length / safeRows));

                return (
              <motion.div
                key={pot.id}
                className="broadcast-card broadcast-pot-card"
                data-pot-cols={safeCols}
                data-pot-rows={safeRows}
                style={{
                  "--broadcast-pot-cols": safeCols,
                } as React.CSSProperties}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Floating Pill Header */}
                <div className="broadcast-card-header red">
                  <h3>{pot.name}</h3>
                </div>
                {/* Card Body */}
                <div
                  className="broadcast-card-body broadcast-card-body-pot-grid"
                  style={{
                    "--broadcast-pot-rows": safeRows,
                    "--broadcast-pot-cols": safeCols,
                  } as React.CSSProperties}
                >
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
                        <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="broadcast-team-flag" />
                        <span className="broadcast-team-name">{team.name}</span>
                      </motion.div>
                    );
                  })}
                  {pot.teams.length === 0 && (
                    <div className="broadcast-empty-text">All assigned \u2713</div>
                  )}
                </div>
              </motion.div>
                );
              })()
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
                            <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="broadcast-team-flag" />
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
          className={`gala-title-bar ${!projectorTitle.trim() && competitionLogo ? "centered-logo" : ""}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          {projectorTitle.trim() && <div className="gala-title-ornament">✦</div>}
          {competitionLogo && <img src={competitionLogo} alt="" className="projector-logo gala-logo" style={{ height: `${logoSize}px` }} />}
          {projectorTitle.trim() && <h1 className="gala-title">{projectorTitle}</h1>}
          {projectorTitle.trim() && <div className="gala-title-ornament">✦</div>}
        </motion.div>

        {/* Selected Team Spotlight */}
        <AnimatePresence mode="wait">
          {showSpotlight && selectedTeam && (() => {
            const [tc1, tc2] = selectedTeamColors;
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
                exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2, ease: "easeIn" } }}
                transition={{
                  type: "spring", stiffness: 300, damping: 20,
                }}
                style={{
                  "--team-color-1": tc1,
                  "--team-color-2": tc2,
                } as React.CSSProperties}
              >
                <div className="gala-spotlight-border" />
                <div className="gala-spotlight-glow" />
                <div className="gala-spotlight-inner">
                  <FlagImg src={selectedTeam.customFlagImage} code={selectedTeam.countryCode} size="xl" className="gala-spotlight-flag" />
                  <div className="gala-spotlight-text">
                    <span className="gala-spotlight-sub">SELECTED</span>
                    <span className="gala-spotlight-name">{selectedTeam.name}</span>
                  </div>
                  <FlagImg src={selectedTeam.customFlagImage} code={selectedTeam.countryCode} size="xl" className="gala-spotlight-flag" />
                </div>
              </motion.div>
            </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Decorative Divider */}
        {/* <div className="gala-divider">
          <span className="gala-divider-line" />
          <span className="gala-divider-diamond">◇</span>
          <span className="gala-divider-line" />
        </div> */}

        {/* Two-Panel Content */}
        <div className={`gala-content ${!drawState.showProjectorPots ? 'pots-hidden' : ''} ${galaOrientation === 'vertical' ? 'vertical' : ''}`}>
          {/* Groups Panel */}
          <div className="gala-panel gala-groups-panel">
            {groups.length > 0 ? (
              <div className="gala-groups-list">
                {groups.map((group, index) => {
                  const filledSlots = group.teams.filter((t) => t !== null).length;
                  const isGroupComplete = filledSlots === group.capacity;
                  const groupPrefix = getGroupSlotPrefix(group.name);

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
                            {team ? (
                              <motion.div
                                className="gala-row-team"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: "spring", stiffness: 250 }}
                              >
                                <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="gala-row-flag" />
                                <span className="gala-row-name">{team.name}</span>
                              </motion.div>
                            ) : (
                              <>
                                <span className="gala-row-num">{`${groupPrefix}${slotIndex + 1}`}</span>
                                <span className="gala-row-empty">—</span>
                              </>
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
                          <FlagImg src={team.customFlagImage} code={team.countryCode} size="xs" className="gala-pot-flag" />
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
          {/* {(pots.length > 0 || groups.length > 0) && (
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
          )} */}
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
              <FlagImg src={selectedTeam.customFlagImage} code={selectedTeam.countryCode} size="xl" className="minimal-selected-flag" />
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
                  const groupPrefix = getGroupSlotPrefix(group.name);

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
                            {team ? (
                              <motion.div
                                className="minimal-row-team"
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="minimal-row-flag" />
                                <span className="minimal-row-name">{team.name}</span>
                              </motion.div>
                            ) : (
                              <>
                                <span className="minimal-row-num">{`${groupPrefix}${slotIndex + 1}`}</span>
                                <span className="minimal-row-empty">—</span>
                              </>
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
                          <FlagImg src={team.customFlagImage} code={team.countryCode} size="xs" className="minimal-pot-flag" />
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

  // ============ CINEMATIC LAYOUT ==========
  const renderCinematicLayout = () => {
    const maxSlots = groups.length > 0 ? Math.max(...groups.map((group) => group.capacity)) : 0;
    const spotlightActive = showSpotlight && selectedTeam !== null;

    return (
      <div className="cine-wrapper">
        <div className="cine-grain" />
        <div className="cine-bokeh">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} className={`cine-orb cine-orb-${index + 1}`} />
          ))}
        </div>

        <div className={`cine-backdrop ${spotlightActive ? "dimmed" : ""}`}>
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
                          <FlagImg src={team.customFlagImage} code={team.countryCode} size="xs" className="cine-pot-pill-flag" />
                          <span className="cine-pot-pill-name">{team.name}</span>
                        </motion.span>
                      ))}
                      {pot.teams.length === 0 && <span className="cine-pot-tab-done">✓</span>}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

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
                      const filled = group.teams.filter((team) => team !== null).length;
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
                        const groupPrefix = getGroupSlotPrefix(group.name);
                        return (
                          <td key={group.id} className={team ? "filled" : "empty"}>
                            {team ? (
                              <motion.div
                                className="cine-cell"
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="cine-cell-flag" />
                                <span className="cine-cell-name">{team.name}</span>
                              </motion.div>
                            ) : (
                              <div className="cine-cell-empty">
                                <span className="cine-cell-num">{`${groupPrefix}${rowIdx + 1}`}</span>
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

        <AnimatePresence mode="wait">
          {showSpotlight && selectedTeam ? (
            <motion.div
              key={`cine-take-${selectedTeam.id}`}
              className="cine-takeover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                "--cine-tc1": selectedTeamColors[0],
                "--cine-tc2": selectedTeamColors[1],
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
                <motion.div
                  className="cine-takeover-flag"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 250, damping: 15, delay: 0.1 }}
                >
                  <FlagImg src={selectedTeam.customFlagImage} code={selectedTeam.countryCode} size="xl" />
                </motion.div>
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
          ) : null}
        </AnimatePresence>
      </div>
    );
  };

  // ============ MATCHES VIEW — PREMIUM BROADCAST LAYOUT ============
  const renderMatchesView = () => {
    const rounds = [...new Set(matches.map(m => m.round))].sort();
    const groupLetters = [...new Set(matches.map(m => m.group))].sort();

    return (
      <div className="pm-wrapper">
        {/* Ambient Background Effects */}
        <div className="pm-ambient">
          <div className="pm-orb pm-orb-1" />
          <div className="pm-orb pm-orb-2" />
          <div className="pm-orb pm-orb-3" />
          <div className="pm-orb pm-orb-4" />
        </div>

        {/* Top Gradient Bar */}
        <div className="pm-bar pm-bar-top" />

        {/* Header */}
        <motion.div
          className="pm-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="pm-header-line" />
          <div className="pm-header-content">
            {competitionLogo && <img src={competitionLogo} alt="" className="pm-logo" style={{ height: `${logoSize * 0.65}px` }} />}
            {projectorTitle.trim() && <h1 className="pm-title">{projectorTitle}</h1>}
            {/* {competitionLogo && <img src={competitionLogo} alt="" className="pm-logo" style={{ height: `${logoSize * 0.65}px` }} />} */}
          </div>
          <div className="pm-header-line" />
          <div className="pm-header-sub">
            <span className="pm-header-badge">{rounds.length} Round{rounds.length !== 1 ? "s" : ""}</span>
            <span className="pm-header-dot">·</span>
            <span className="pm-header-badge">{groupLetters.length} Group{groupLetters.length !== 1 ? "s" : ""}</span>
            <span className="pm-header-dot">·</span>
            <span className="pm-header-badge">{matches.length} Match{matches.length !== 1 ? "es" : ""}</span>
          </div>
        </motion.div>

        {/* Match Content */}
        <div className="pm-content">
          {rounds.map((round, roundIdx) => (
            <motion.div
              key={round}
              className="pm-round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: roundIdx * 0.15, duration: 0.4 }}
            >
              <div className="pm-round-header">
                <div className="pm-round-line" />
                <span className="pm-round-label">
                  {/* <span className="pm-round-icon"></span> */}
                  Round {round}
                </span>
                <div className="pm-round-line" />
              </div>
              

              <div className="pm-groups">
                {groupLetters.map((gl, glIdx) => {
                  const roundGroupMatches = matches.filter(m => m.round === round && m.group === gl);
                  if (roundGroupMatches.length === 0) return null;

                  return (
                    <motion.div
                      key={gl}
                      className="pm-group"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: roundIdx * 0.15 + glIdx * 0.08, duration: 0.35 }}
                    >
                      <div className="pm-group-header">
                        <span className="pm-group-letter">{gl}</span>
                        <span className="pm-group-name">Group {gl}</span>
                      </div>

                      <div className="pm-match-list">
                        {roundGroupMatches.map((match, matchIdx) => {
                          const matchGroup = drawState.groups.find(g => g.name.charAt(g.name.length - 1) === match.group);
                          const homeTeam = matchGroup?.teams[match.homeSlotIndex] || null;
                          const awayTeam = matchGroup?.teams[match.awaySlotIndex] || null;

                          return (
                            <motion.div
                              key={match.id}
                              className="pm-match"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: roundIdx * 0.15 + glIdx * 0.08 + matchIdx * 0.05, duration: 0.3 }}
                            >
                              {/* Home Team */}
                              <div className={`pm-team pm-team-home ${homeTeam ? "assigned" : ""}`}>
                                {homeTeam ? (
                                  <>
                                    <FlagImg src={homeTeam.customFlagImage} code={homeTeam.countryCode} size="sm" className="pm-flag" />
                                    <span className="pm-name">{homeTeam.name}</span>
                                  </>
                                ) : (
                                  <span className="pm-placeholder">{match.homePlaceholder}</span>
                                )}
                              </div>

                              {/* VS Diamond */}
                              <div className="pm-vs-wrap">
                                <div className="pm-vs-diamond">
                                  <span>VS</span>
                                </div>
                              </div>

                              {/* Away Team */}
                              <div className={`pm-team pm-team-away ${awayTeam ? "assigned" : ""}`}>
                                {awayTeam ? (
                                  <>
                                    <span className="pm-name">{awayTeam.name}</span>
                                    <FlagImg src={awayTeam.customFlagImage} code={awayTeam.countryCode} size="sm" className="pm-flag" />
                                  </>
                                ) : (
                                  <span className="pm-placeholder">{match.awayPlaceholder}</span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {roundNotes[round]?.trim() && (
                <div className="pm-round-note">{roundNotes[round].trim()}</div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        {footerText && (
          <motion.div
            className="pm-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="pm-footer-line" />
            <span style={{ fontSize: `${footerSize * 0.85}rem` }}>{footerText}</span>
            <div className="pm-footer-line" />
          </motion.div>
        )}

        {/* Bottom Gradient Bar */}
        <div className="pm-bar pm-bar-bottom" />
      </div>
    );
  };

  // ============ MATCHES GALA VIEW — CEREMONY STYLE ============
  const renderMatchesGalaView = () => {
    const rounds = [...new Set(matches.map(m => m.round))].sort();
    const groupLetters = [...new Set(matches.map(m => m.group))].sort();

    return (
      <div className="pmg-wrapper">
        {/* Film Grain */}
        <div className="pmg-grain" />

        {/* Ambient Glow */}
        <div className="pmg-glow pmg-glow-1" />
        <div className="pmg-glow pmg-glow-2" />

        {/* Header */}
        <motion.div
          className="pmg-header"
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="pmg-header-ornament">
            <div className="pmg-ornament-line" />
            <div className="pmg-ornament-diamond" />
            <div className="pmg-ornament-line" />
          </div>
          <div className="pmg-header-content">
            {competitionLogo && <img src={competitionLogo} alt="" className="pmg-logo" style={{ height: `${logoSize * 0.6}px` }} />}
            {projectorTitle.trim() && <h1 className="pmg-title">{projectorTitle}</h1>}
            {/* {competitionLogo && <img src={competitionLogo} alt="" className="pmg-logo" style={{ height: `${logoSize * 0.6}px` }} />} */}
          </div>
          <div className="pmg-header-ornament">
            <div className="pmg-ornament-line" />
            <div className="pmg-ornament-diamond" />
            <div className="pmg-ornament-line" />
          </div>
          <div className="pmg-header-subtitle">Match Schedule</div>
        </motion.div>

        {/* Content */}
        <div className="pmg-content">
          {rounds.map((round, roundIdx) => (
            <motion.div
              key={round}
              className="pmg-round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: roundIdx * 0.2, duration: 0.5 }}
            >
              <div className="pmg-round-badge">
                <span className="pmg-round-text">Round {round}</span>
              </div>
              

              <div className="pmg-tables">
                {groupLetters.map((gl, glIdx) => {
                  const roundGroupMatches = matches.filter(m => m.round === round && m.group === gl);
                  if (roundGroupMatches.length === 0) return null;

                  return (
                    <motion.div
                      key={gl}
                      className="pmg-table"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: roundIdx * 0.2 + glIdx * 0.1, duration: 0.4 }}
                    >
                      <div className="pmg-table-header">
                        <div className="pmg-table-crest">{gl}</div>
                        <span className="pmg-table-name">Group {gl}</span>
                      </div>

                      <div className="pmg-table-body">
                        {roundGroupMatches.map((match, matchIdx) => {
                          const matchGroup = drawState.groups.find(g => g.name.charAt(g.name.length - 1) === match.group);
                          const homeTeam = matchGroup?.teams[match.homeSlotIndex] || null;
                          const awayTeam = matchGroup?.teams[match.awaySlotIndex] || null;

                          return (
                            <motion.div
                              key={match.id}
                              className={`pmg-row ${matchIdx % 2 === 0 ? "even" : "odd"}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: roundIdx * 0.2 + glIdx * 0.1 + matchIdx * 0.06, duration: 0.3 }}
                            >
                              <div className="pmg-cell pmg-cell-home">
                                {homeTeam ? (
                                  <>
                                    <FlagImg src={homeTeam.customFlagImage} code={homeTeam.countryCode} size="sm" className="pmg-flag" />
                                    <span className="pmg-team-name">{homeTeam.name}</span>
                                  </>
                                ) : (
                                  <span className="pmg-team-ph">{match.homePlaceholder}</span>
                                )}
                              </div>

                              <div className="pmg-cell pmg-cell-vs">
                                <span className="pmg-vs">v</span>
                              </div>

                              <div className="pmg-cell pmg-cell-away">
                                {awayTeam ? (
                                  <>
                                    <span className="pmg-team-name">{awayTeam.name}</span>
                                    <FlagImg src={awayTeam.customFlagImage} code={awayTeam.countryCode} size="sm" className="pmg-flag" />
                                  </>
                                ) : (
                                  <span className="pmg-team-ph">{match.awayPlaceholder}</span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {roundNotes[round]?.trim() && (
                <div className="pmg-round-note">{roundNotes[round].trim()}</div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        {footerText && (
          <motion.div
            className="pmg-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <span style={{ fontSize: `${footerSize * 0.85}rem` }}>{footerText}</span>
          </motion.div>
        )}
      </div>
    );
  };

  // ============ MATCHES ULTRA VIEW — FUTURISTIC TICKET WALL ============
  const renderMatchesUltraView = () => {
    const rounds = [...new Set(matches.map(m => m.round))].sort();
    const groupLetters = [...new Set(matches.map(m => m.group))].sort();

    return (
      <div className="pmu-wrapper">
        <div className="pmu-bg-grid" />
        <div className="pmu-bg-glow pmu-bg-glow-a" />
        <div className="pmu-bg-glow pmu-bg-glow-b" />

        <motion.header
          className="pmu-header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="pmu-header-top">
            {competitionLogo && <img src={competitionLogo} alt="" className="pmu-logo" style={{ height: `${logoSize * 0.6}px` }} />}
            {/* <h1 className="pmu-title">{projectorTitle || "Match Center"}</h1> */}
          </div>
          <div className="pmu-meta">
            <span>{rounds.length} ROUND{rounds.length !== 1 ? "S" : ""}</span>
            <span>•</span>
            <span>{groupLetters.length} GROUP{groupLetters.length !== 1 ? "S" : ""}</span>
            <span>•</span>
            <span>{matches.length} MATCH{matches.length !== 1 ? "ES" : ""}</span>
          </div>
        </motion.header>

        <div className="pmu-content">
          {rounds.map((round, roundIdx) => (
            <motion.section
              key={round}
              className="pmu-round"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: roundIdx * 0.12 }}
            >
              <div className="pmu-round-head">
                <span className="pmu-round-pill">ROUND {round}</span>
              </div>

              {roundNotes[round]?.trim() && (
                <div className="pmu-round-note">{roundNotes[round].trim()}</div>
              )}

              <div className="pmu-groups">
                {groupLetters.map((gl, glIdx) => {
                  const roundGroupMatches = matches.filter((m) => m.round === round && m.group === gl);
                  if (roundGroupMatches.length === 0) return null;

                  return (
                    <motion.div
                      key={`${round}-${gl}`}
                      className="pmu-group"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: roundIdx * 0.12 + glIdx * 0.05, duration: 0.3 }}
                    >
                      <div className="pmu-group-header">
                        <span className="pmu-group-badge">{gl}</span>
                        <span className="pmu-group-name">Group {gl}</span>
                      </div>

                      <div className="pmu-list">
                        {roundGroupMatches.map((match, matchIdx) => {
                          const matchGroup = drawState.groups.find((g) => g.name.charAt(g.name.length - 1) === match.group);
                          const homeTeam = matchGroup?.teams[match.homeSlotIndex] || null;
                          const awayTeam = matchGroup?.teams[match.awaySlotIndex] || null;

                          return (
                            <motion.article
                              key={match.id}
                              className="pmu-ticket"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.25, delay: roundIdx * 0.12 + glIdx * 0.05 + matchIdx * 0.04 }}
                            >
                              <div className="pmu-ticket-side" />
                              <div className="pmu-ticket-body">
                                <div className="pmu-team pmu-team-home">
                                  {homeTeam ? (
                                    <>
                                      <FlagImg src={homeTeam.customFlagImage} code={homeTeam.countryCode} size="sm" className="pmu-flag" />
                                      <span className="pmu-name">{homeTeam.name}</span>
                                    </>
                                  ) : (
                                    <span className="pmu-placeholder">{match.homePlaceholder}</span>
                                  )}
                                </div>

                                <div className="pmu-mid">
                                  <span className="pmu-vs">VS</span>
                                  <span className="pmu-match-no">#{match.matchNumber}</span>
                                </div>

                                <div className="pmu-team pmu-team-away">
                                  {awayTeam ? (
                                    <>
                                      <span className="pmu-name">{awayTeam.name}</span>
                                      <FlagImg src={awayTeam.customFlagImage} code={awayTeam.countryCode} size="sm" className="pmu-flag" />
                                    </>
                                  ) : (
                                    <span className="pmu-placeholder">{match.awayPlaceholder}</span>
                                  )}
                                </div>
                              </div>
                              <div className="pmu-ticket-side" />
                            </motion.article>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>

        {footerText && <div className="pmu-footer" style={{ fontSize: `${footerSize * 0.85}rem` }}>{footerText}</div>}
      </div>
    );
  };

  // ============ MATCHES BROADCAST VIEW ============
  const renderMatchesBroadcastView = () => {
    const renderBroadcastTeamName = (name: string) => {
      const words = name.trim().split(/\s+/).filter(Boolean);
      if (words.length === 2) {
        return (
          <span className="broadcast-team-name two-rows">
            <span>{words[0]}</span>
            <span>{words[1]}</span>
          </span>
        );
      }
      return <span className="broadcast-team-name">{name}</span>;
    };

    const rounds = [...new Set(matches.map(m => m.round))].sort();
    const groupLetters = [...new Set(matches.map(m => m.group))].sort();

    return (
      <div className="broadcast-matches-wrapper">
        {competitionLogo && (
          <div className="broadcast-logo-container">
            <img src={competitionLogo} alt="" className="projector-logo broadcast-logo" style={{ height: `${logoSize}px` }} />
          </div>
        )}

        {rounds.map((round, roundIdx) => (
          <motion.div
            key={round}
            className="broadcast-matches-round"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: roundIdx * 0.14, duration: 0.4 }}
          >
            <div className="broadcast-matches-round-title-wrap">
              <div className="broadcast-card-header red broadcast-matches-round-title">
                <h3>Round {round}</h3>
              </div>
            </div>

            {roundNotes[round]?.trim() && (
              <div className="broadcast-matches-round-note">{roundNotes[round].trim()}</div>
            )}

            <div className="broadcast-section broadcast-matches-groups">
              {groupLetters.map((gl, glIdx) => {
                const roundGroupMatches = matches.filter(m => m.round === round && m.group === gl);
                if (roundGroupMatches.length === 0) return null;

                return (
                  <motion.div
                    key={`${round}-${gl}`}
                    className="broadcast-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: roundIdx * 0.14 + glIdx * 0.08, duration: 0.35 }}
                  >
                    <div className="broadcast-card-header green">
                      <h3>Group {gl}</h3>
                    </div>

                    <div className="broadcast-card-body broadcast-match-list">
                      {roundGroupMatches.map((match, matchIdx) => {
                        const matchGroup = drawState.groups.find(g => g.name.charAt(g.name.length - 1) === match.group);
                        const homeTeam = matchGroup?.teams[match.homeSlotIndex] || null;
                        const awayTeam = matchGroup?.teams[match.awaySlotIndex] || null;

                        return (
                          <motion.div
                            key={match.id}
                            className="broadcast-match-row"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: roundIdx * 0.14 + glIdx * 0.08 + matchIdx * 0.05, duration: 0.25 }}
                          >
                            <div className="broadcast-match-team home">
                              {homeTeam ? (
                                <>
                                  <FlagImg src={homeTeam.customFlagImage} code={homeTeam.countryCode} size="sm" className="broadcast-team-flag" />
                                  {renderBroadcastTeamName(homeTeam.name)}
                                </>
                              ) : (
                                <span className="broadcast-slot-label">{match.homePlaceholder}</span>
                              )}
                            </div>

                            <div className="broadcast-match-mid">
                              <span className="broadcast-match-vs">VS</span>
                              <span className="broadcast-match-number">#{match.matchNumber}</span>
                            </div>

                            <div className="broadcast-match-team away">
                              {awayTeam ? (
                                <>
                                  {renderBroadcastTeamName(awayTeam.name)}
                                  <FlagImg src={awayTeam.customFlagImage} code={awayTeam.countryCode} size="sm" className="broadcast-team-flag" />
                                </>
                              ) : (
                                <span className="broadcast-slot-label">{match.awayPlaceholder}</span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}

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
      </div>
    );
  };

  // Determine container class
  const containerClass = [
    "projector-container",
    projectorLayout === "stadium" ? "stadium-mode" : "",
    projectorLayout === "broadcast" ? "broadcast-mode" : "",
    projectorLayout === "gala" ? "gala-mode" : "",
    projectorLayout === "gala" && galaColorSwap ? "gala-colors-swapped" : "",
    projectorLayout === "minimal" ? "minimal-mode" : "",
    projectorLayout === "cinematic" ? "cinematic-mode" : "",
    projectorDisplayMode === "matches" ? "matches-mode" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      id="projector-export-root"
      ref={projectorCaptureRef}
      className={containerClass}
      style={{
        "--projector-team-font-scale": teamFontScale,
        "--projector-pot-font-scale": potFontScale,
      } as React.CSSProperties}
    >
      <AnimatePresence mode="wait">
        {/* Matches Display Mode */}
        {projectorDisplayMode === "matches" && matches.length > 0 ? (
          <motion.div
            key={`matches-${matchesLayout}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {matchesLayout === "gala"
              ? renderMatchesGalaView()
              : matchesLayout === "ultra"
                ? renderMatchesUltraView()
                : matchesLayout === "broadcast"
                  ? renderMatchesBroadcastView()
                  : renderMatchesView()}
          </motion.div>
        ) : (
          <>
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
