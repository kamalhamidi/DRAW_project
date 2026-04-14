import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTournamentStore, type Match, type RoundConfig } from "zustand/tournament-store";
import { africaCountries } from "data/africaCountries";
import { extractColorsFromImage, applyColorPalette, resetColorPalette, type ColorPalette } from "~/utils/extractColors";
import { FlagImg } from "~/components/FlagImg";

interface SavedTournament {
  id: string;
  name: string;
  savedAt: string;
  pots: any[];
  groups: any[];
  potsFinalized: boolean;
  bgAnimation: string;
  projectorLayout: string;
  projectorTitle: string;
  bgImage: string;
  competitionLogo: string;
  logoSize: number;
  footerText: string;
  footerSize: number;
  teamFontScale: number;
  potFontScale: number;
  broadcastPotRows?: number;
  showSpotlight: boolean;
  showProjectorPots: boolean;
  colorMode: string;
  manualPalette: ColorPalette;
  numberOfGroups: number;
  teamsPerGroup: number;
  galaOrientation?: "horizontal" | "vertical";
  galaColorSwap?: boolean;
  roundNotes?: Record<number, string>;
  customLayout?: CustomLayoutConfig;
}

type CustomLayoutElementKey = "header" | "pots" | "groups" | "footer";

interface CustomLayoutElement {
  id: CustomLayoutElementKey;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  border: string;
  accent: string;
  text: string;
}

interface CustomLayoutConfig {
  canvas: {
    width: number;
    height: number;
  };
  elements: CustomLayoutElement[];
}

const createDefaultCustomLayout = (): CustomLayoutConfig => ({
  canvas: { width: 1280, height: 720 },
  elements: [
    {
      id: "header",
      label: "Header",
      x: 3,
      y: 3,
      width: 94,
      height: 13,
      background: "rgba(255, 255, 255, 0.06)",
      border: "rgba(255, 255, 255, 0.12)",
      accent: "#38BDF8",
      text: "#FFFFFF",
    },
    {
      id: "pots",
      label: "Pots",
      x: 3,
      y: 19,
      width: 30,
      height: 60,
      background: "rgba(255, 60, 73, 0.12)",
      border: "rgba(255, 60, 73, 0.42)",
      accent: "#FF3C49",
      text: "#FFFFFF",
    },
    {
      id: "groups",
      label: "Groups",
      x: 35,
      y: 19,
      width: 62,
      height: 60,
      background: "rgba(10, 253, 9, 0.08)",
      border: "rgba(10, 253, 9, 0.35)",
      accent: "#0AFD09",
      text: "#FFFFFF",
    },
    {
      id: "footer",
      label: "Footer",
      x: 3,
      y: 84,
      width: 94,
      height: 10,
      background: "rgba(255, 255, 255, 0.04)",
      border: "rgba(255, 255, 255, 0.10)",
      accent: "#D4AF37",
      text: "#FFFFFF",
    },
  ],
});

const normalizeCustomLayout = (layout?: CustomLayoutConfig | null): CustomLayoutConfig => {
  const defaults = createDefaultCustomLayout();
  if (!layout) return defaults;

  return {
    canvas: {
      width: layout.canvas?.width ?? defaults.canvas.width,
      height: layout.canvas?.height ?? defaults.canvas.height,
    },
    elements: defaults.elements.map((fallback) => {
      const found = layout.elements?.find((element) => element.id === fallback.id);
      return found ? { ...fallback, ...found } : fallback;
    }),
  };
};

const toHexColor = (value: string) => {
  const hexMatch = value.trim().match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return `#${hex
        .split("")
        .map((char) => char + char)
        .join("")}`;
    }
    if (hex.length >= 6) {
      return `#${hex.slice(0, 6)}`;
    }
  }

  const rgbaMatch = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(",").map((part) => Number(part.trim()));
    const [red = 255, green = 255, blue = 255] = parts;
    const clamp = (input: number) => Math.max(0, Math.min(255, input));
    return `#${[clamp(red), clamp(green), clamp(blue)]
      .map((component) => component.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return "#ffffff";
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const red = Number.parseInt(expanded.slice(0, 2), 16) || 0;
  const green = Number.parseInt(expanded.slice(2, 4), 16) || 0;
  const blue = Number.parseInt(expanded.slice(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function TournamentManager() {
  const {
    pots,
    groups,
    matches,
    roundConfigs,
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
    reorderTeamInPot,
    deletePot,
    updatePotName,
    setRoundConfig,
    removeRoundConfig,
    generateMatchesForRound,
    clearMatchesForRound,
    resetTournament,
  } = useTournamentStore();

  const [showPotForm, setShowPotForm] = useState(false);
  const [potName, setPotName] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState(4);
  const [teamInputs, setTeamInputs] = useState<string[]>(["", "", "", ""]);
  const [teamCountries, setTeamCountries] = useState<{ code: string; flag: string; customFlagImage?: string }[]>([
    { code: "", flag: "", customFlagImage: "" },
    { code: "", flag: "", customFlagImage: "" },
    { code: "", flag: "", customFlagImage: "" },
    { code: "", flag: "", customFlagImage: "" },
  ]);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [numberOfGroups, setNumberOfGroups] = useState(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);

  const [currentPhase, setCurrentPhase] = useState<"setup" | "draw" | "matches">("setup");
  const [hydrated, setHydrated] = useState(false);
  const [showProjectorPots, setShowProjectorPots] = useState(true);
  const [bgAnimation, setBgAnimation] = useState<"none" | "slide" | "zoom" | "fade" | "rotate">("zoom");
  const [projectorLayout, setProjectorLayout] = useState<"stadium" | "broadcast" | "gala" | "minimal" | "cinematic" | "custom">("broadcast");
  const [projectorTitle, setProjectorTitle] = useState("Tournament Draw");
  const [showProjectorSettings, setShowProjectorSettings] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<"general" | "branding" | "visual" | "colors" | "behavior">("general");
  const [bgImage, setBgImage] = useState<string>("/bg.png");
  const [competitionLogo, setCompetitionLogo] = useState<string>("");
  const [logoSize, setLogoSize] = useState<number>(70);
  const [footerText, setFooterText] = useState<string>("");
  const [footerSize, setFooterSize] = useState<number>(1.1);
  const [teamFontScale, setTeamFontScale] = useState<number>(1);
  const [potFontScale, setPotFontScale] = useState<number>(1);
  const [broadcastPotRows, setBroadcastPotRows] = useState<number>(6);
  const [showSpotlight, setShowSpotlight] = useState(true);
  const [colorMode, setColorMode] = useState<"auto" | "manual">("manual");

  // Match Setup state
  const [currentRound, setCurrentRound] = useState(1);
  const [pairingSlotA, setPairingSlotA] = useState<number | null>(null);
  const [currentPairings, setCurrentPairings] = useState<[number, number][]>([]);
  const [roundNotes, setRoundNotes] = useState<Record<number, string>>({});
  const [showMatchesPanel, setShowMatchesPanel] = useState(false);
  const [matchesFilterRound, setMatchesFilterRound] = useState<number | "all">("all");
  const [projectorDisplayMode, setProjectorDisplayMode] = useState<"groups" | "matches">("groups");
  const [matchesLayout, setMatchesLayout] = useState<"default" | "gala" | "ultra" | "broadcast">("default");
  const [galaOrientation, setGalaOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [galaColorSwap, setGalaColorSwap] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [customLayout, setCustomLayout] = useState<CustomLayoutConfig>(() => createDefaultCustomLayout());
  const [selectedCustomElementId, setSelectedCustomElementId] = useState<CustomLayoutElementKey>("groups");
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [manualPalette, setManualPalette] = useState<ColorPalette>({
    primary: "#8200C5",
    primaryDark: "#560A8F",
    accent1: "#FF3C49",
    accent2: "#0AFD09",
    accent2Text: "#560A8F",
    highlight: "#6CBD45",
  });

  // Save/Load state
  const [savedTournaments, setSavedTournaments] = useState<SavedTournament[]>([]);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [draggedPotTeam, setDraggedPotTeam] = useState<{ potId: number; teamId: number } | null>(null);
  const [dragOverPotTeam, setDragOverPotTeam] = useState<{ potId: number; teamId: number } | null>(null);

  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const matchesButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const savePanelRef = useRef<HTMLDivElement | null>(null);
  const matchesPanelRef = useRef<HTMLDivElement | null>(null);
  const customEditorCanvasRef = useRef<HTMLDivElement | null>(null);
  const customInteractionRef = useRef<{
    id: CustomLayoutElementKey;
    mode: "drag" | "resize";
    startX: number;
    startY: number;
    startLayout: CustomLayoutConfig;
  } | null>(null);

  // Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
    isDestructive?: boolean;
  }>({
    show: false,
    title: "",
    message: "",
    action: null,
    isDestructive: false,
  });

  // Edit Pot Name Modal
  const [editPotModal, setEditPotModal] = useState<{
    show: boolean;
    potId: number | null;
    potName: string;
  }>({
    show: false,
    potId: null,
    potName: "",
  });

  const showConfirm = (title: string, message: string, action: () => void, isDestructive = false) => {
    setConfirmModal({
      show: true,
      title,
      message,
      action,
      isDestructive,
    });
  };

  const closeConfirm = () => {
    setConfirmModal({ show: false, title: "", message: "", action: null, isDestructive: false });
  };

  const confirmAction = () => {
    if (confirmModal.action) {
      confirmModal.action();
    }
    closeConfirm();
  };

  const openEditPotModal = (pot: any) => {
    setEditPotModal({
      show: true,
      potId: pot.id,
      potName: pot.name,
    });
  };

  const closeEditPotModal = () => {
    setEditPotModal({
      show: false,
      potId: null,
      potName: "",
    });
  };

  const saveEditPotName = () => {
    if (editPotModal.potId && editPotModal.potName.trim()) {
      updatePotName(editPotModal.potId, editPotModal.potName.trim());
      closeEditPotModal();
    }
  };

  const updateCustomElement = useCallback((elementId: CustomLayoutElementKey, patch: Partial<CustomLayoutElement>) => {
    setCustomLayout((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === elementId ? { ...element, ...patch } : element
      ),
    }));
  }, []);

  const clampLayoutNumber = (value: number, minValue: number, maxValue: number) =>
    Math.max(minValue, Math.min(maxValue, value));

  const startCustomInteraction = (event: React.PointerEvent<HTMLElement>, elementId: CustomLayoutElementKey, mode: "drag" | "resize") => {
    event.preventDefault();
    event.stopPropagation();
    const canvas = customEditorCanvasRef.current;
    if (!canvas) return;

    const layoutSnapshot = normalizeCustomLayout(customLayout);
    customInteractionRef.current = {
      id: elementId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLayout: layoutSnapshot,
    };
    setSelectedCustomElementId(elementId);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = customInteractionRef.current;
      const canvas = customEditorCanvasRef.current;
      if (!interaction || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dxPercent = ((event.clientX - interaction.startX) / rect.width) * 100;
      const dyPercent = ((event.clientY - interaction.startY) / rect.height) * 100;

      setCustomLayout((current) => ({
        ...current,
        elements: current.elements.map((element) => {
          if (element.id !== interaction.id) return element;

          if (interaction.mode === "drag") {
            return {
              ...element,
              x: clampLayoutNumber(interaction.startLayout.elements.find((item) => item.id === element.id)?.x ?? element.x + dxPercent, 0, 100 - element.width),
              y: clampLayoutNumber(interaction.startLayout.elements.find((item) => item.id === element.id)?.y ?? element.y + dyPercent, 0, 100 - element.height),
            };
          }

          const startElement = interaction.startLayout.elements.find((item) => item.id === element.id) ?? element;
          return {
            ...element,
            width: clampLayoutNumber(startElement.width + dxPercent, 12, 100 - startElement.x),
            height: clampLayoutNumber(startElement.height + dyPercent, 8, 100 - startElement.y),
          };
        }),
      }));
    };

    const handlePointerUp = () => {
      customInteractionRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [customLayout]);

  const renderCustomCanvasSection = (element: CustomLayoutElement) => {
    switch (element.id) {
      case "header":
        return (
          <div className="custom-header-content">
            {competitionLogo ? <img src={competitionLogo} alt="" className="custom-header-logo" /> : <div className="custom-header-logo-placeholder">📺</div>}
            <div className="custom-header-copy">
              <span className="custom-element-kicker">Editable Broadcast</span>
              <h3>{projectorTitle || "Tournament Draw"}</h3>
            </div>
          </div>
        );
      case "pots":
        return (
          <div className="custom-section-list">
            {pots.slice(0, 4).map((pot: any) => (
              <div key={pot.id} className="custom-mini-card">
                <strong>{pot.name}</strong>
                <span>{pot.teams.length} teams</span>
              </div>
            ))}
            {pots.length === 0 && <div className="custom-empty-copy">Add pots to preview this panel.</div>}
          </div>
        );
      case "groups":
        return (
          <div className="custom-groups-grid">
            {groups.slice(0, 4).map((group: any) => (
              <div key={group.id} className="custom-group-column">
                <div className="custom-group-label">{group.name}</div>
                <div className="custom-slot-list">
                  {group.teams.slice(0, 4).map((team: any, slotIndex: number) => (
                    <div key={`${group.id}-${slotIndex}`} className={`custom-slot-row ${team ? "filled" : "empty"}`}>
                      {team ? (
                        <>
                          <FlagImg src={team.customFlagImage} code={team.countryCode} size="xs" className="custom-slot-flag" />
                          <span>{team.name}</span>
                        </>
                      ) : (
                        <span>{`${group.name.charAt(group.name.length - 1)}${slotIndex + 1}`}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      case "footer":
        return <div className="custom-footer-copy">{footerText || "Customize this footer text from the controls."}</div>;
      default:
        return null;
    }
  };

  // Restore all settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("saved-tournaments");
    if (saved) {
      try { setSavedTournaments(JSON.parse(saved)); } catch { }
    }
    const settings = localStorage.getItem("tournament-settings");
    if (settings) {
      try {
        const s = JSON.parse(settings);
        if (s.showProjectorPots !== undefined) setShowProjectorPots(s.showProjectorPots);
        if (s.bgAnimation) setBgAnimation(s.bgAnimation);
        if (s.projectorLayout) setProjectorLayout(s.projectorLayout === "classic" ? "broadcast" : s.projectorLayout);
        if (s.projectorTitle !== undefined) setProjectorTitle(s.projectorTitle);
        if (s.bgImage) setBgImage(s.bgImage);
        if (s.competitionLogo !== undefined) setCompetitionLogo(s.competitionLogo);
        if (s.logoSize !== undefined) setLogoSize(s.logoSize);
        if (s.footerText !== undefined) setFooterText(s.footerText);
        if (s.footerSize !== undefined) setFooterSize(s.footerSize);
        if (s.teamFontScale !== undefined) setTeamFontScale(s.teamFontScale);
        if (s.potFontScale !== undefined) setPotFontScale(s.potFontScale);
        if (s.broadcastPotRows !== undefined) setBroadcastPotRows(s.broadcastPotRows);
        if (s.showSpotlight !== undefined) setShowSpotlight(s.showSpotlight);
        if (s.colorMode) setColorMode(s.colorMode);
        if (s.manualPalette) setManualPalette(s.manualPalette);
        if (s.currentPhase) setCurrentPhase(s.currentPhase);
        if (s.projectorDisplayMode) setProjectorDisplayMode(s.projectorDisplayMode);
        if (s.matchesLayout) setMatchesLayout(s.matchesLayout);
        if (s.galaOrientation) setGalaOrientation(s.galaOrientation);
        if (s.galaColorSwap !== undefined) setGalaColorSwap(Boolean(s.galaColorSwap));
        if (s.roundNotes) setRoundNotes(s.roundNotes);
        if (s.customLayout) setCustomLayout(normalizeCustomLayout(s.customLayout));
      } catch { }
    }
  }, []);

  // Auto-save settings to localStorage whenever they change
  useEffect(() => {
    if (!hydrated) return;
    const settings = {
      showProjectorPots,
      bgAnimation,
      projectorLayout,
      projectorTitle,
      bgImage,
      competitionLogo,
      logoSize,
      footerText,
      footerSize,
      teamFontScale,
      potFontScale,
      broadcastPotRows,
      showSpotlight,
      colorMode,
      manualPalette,
      currentPhase,
      projectorDisplayMode,
      matchesLayout,
      galaOrientation,
      galaColorSwap,
      roundNotes,
      customLayout,
    };
    localStorage.setItem("tournament-settings", JSON.stringify(settings));
  }, [hydrated, showProjectorPots, bgAnimation, projectorLayout, projectorTitle, bgImage, competitionLogo, logoSize, footerText, footerSize, teamFontScale, potFontScale, broadcastPotRows, showSpotlight, colorMode, manualPalette, currentPhase, projectorDisplayMode, matchesLayout, galaOrientation, galaColorSwap, roundNotes, customLayout]);

  const saveTournament = useCallback(() => {
    if (!saveName.trim()) return;
    const preset: SavedTournament = {
      id: Date.now().toString(),
      name: saveName.trim(),
      savedAt: new Date().toISOString(),
      pots,
      groups,
      potsFinalized,
      bgAnimation,
      projectorLayout,
      projectorTitle,
      bgImage,
      competitionLogo,
      logoSize,
      footerText,
      footerSize,
      teamFontScale,
      potFontScale,
      broadcastPotRows,
      showSpotlight,
      showProjectorPots,
      colorMode,
      manualPalette,
      numberOfGroups,
      teamsPerGroup,
      galaOrientation,
      galaColorSwap,
      roundNotes,
      customLayout,
    };
    const updated = [...savedTournaments, preset];
    setSavedTournaments(updated);
    localStorage.setItem("saved-tournaments", JSON.stringify(updated));
    setSaveName("");
  }, [saveName, pots, groups, potsFinalized, bgAnimation, projectorLayout, projectorTitle, bgImage, competitionLogo, logoSize, footerText, footerSize, teamFontScale, potFontScale, broadcastPotRows, showSpotlight, showProjectorPots, colorMode, manualPalette, numberOfGroups, teamsPerGroup, galaOrientation, galaColorSwap, roundNotes, customLayout, savedTournaments]);

  const loadTournament = useCallback((preset: SavedTournament) => {
    showConfirm(
      "Load Tournament",
      `Load "${preset.name}"? This will replace your current tournament.`,
      () => {
        // Reset store and repopulate
        resetTournament();
        // We need to set the zustand store directly
        useTournamentStore.setState({
          pots: preset.pots,
          groups: preset.groups,
          potsFinalized: preset.potsFinalized,
          selectedTeam: null,
        });
        setBgAnimation(preset.bgAnimation as any);
        setProjectorLayout(preset.projectorLayout === "classic" ? "broadcast" : (preset.projectorLayout as any));
        setProjectorTitle(preset.projectorTitle);
        setBgImage(preset.bgImage);
        setCompetitionLogo(preset.competitionLogo);
        setLogoSize(preset.logoSize);
        setFooterText(preset.footerText);
        setFooterSize(preset.footerSize);
        setTeamFontScale(preset.teamFontScale ?? 1);
        setPotFontScale(preset.potFontScale ?? 1);
        setBroadcastPotRows(preset.broadcastPotRows ?? 6);
        setShowSpotlight(preset.showSpotlight);
        setShowProjectorPots(preset.showProjectorPots);
        setColorMode(preset.colorMode as any);
        setManualPalette(preset.manualPalette);
        setNumberOfGroups(preset.numberOfGroups);
        setTeamsPerGroup(preset.teamsPerGroup);
        setGalaOrientation(preset.galaOrientation ?? "horizontal");
        setGalaColorSwap(preset.galaColorSwap ?? false);
        setRoundNotes(preset.roundNotes ?? {});
        setCustomLayout(normalizeCustomLayout(preset.customLayout));
        setCurrentPhase(preset.potsFinalized ? "draw" : "setup");
        setShowSavePanel(false);
      }
    );
  }, [resetTournament, showConfirm]);

  const deleteSavedTournament = useCallback((id: string) => {
    const updated = savedTournaments.filter(t => t.id !== id);
    setSavedTournaments(updated);
    localStorage.setItem("saved-tournaments", JSON.stringify(updated));
  }, [savedTournaments]);

  const exportProjectorDesign = useCallback(() => {
    if (!broadcastChannelRef.current) return;
    broadcastChannelRef.current.postMessage({ command: "export-projector-image" });
  }, []);

  // Broadcast Channel for projector sync
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    setHydrated(true);
    // Initialize Broadcast Channel
    broadcastChannelRef.current = new BroadcastChannel("draw_sync");

    const handleExportResult = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.event !== "export-projector-image-result") return;

      if (data.ok) {
        alert(`Projector image exported: ${data.fileName || "download started"}`);
      } else {
        alert("Export failed. Make sure the projector window is open and visible, then try again.");
      }
    };

    broadcastChannelRef.current.addEventListener("message", handleExportResult);

    return () => {
      broadcastChannelRef.current?.removeEventListener("message", handleExportResult);
      broadcastChannelRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const clickedSettingsPanel = settingsPanelRef.current?.contains(target);
      const clickedSettingsButton = settingsButtonRef.current?.contains(target);
      if (showProjectorSettings && !clickedSettingsPanel && !clickedSettingsButton) {
        setShowProjectorSettings(false);
      }

      const clickedSavePanel = savePanelRef.current?.contains(target);
      const clickedSaveButton = saveButtonRef.current?.contains(target);
      if (showSavePanel && !clickedSavePanel && !clickedSaveButton) {
        setShowSavePanel(false);
      }

      const clickedMatchesPanel = matchesPanelRef.current?.contains(target);
      const clickedMatchesButton = matchesButtonRef.current?.contains(target);
      if (showMatchesPanel && !clickedMatchesPanel && !clickedMatchesButton) {
        setShowMatchesPanel(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showProjectorSettings, showSavePanel, showMatchesPanel]);

  useEffect(() => {
    document.body.classList.remove("bg-slide", "bg-zoom", "bg-fade", "bg-rotate", "bg-none");
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
    setTeamCountries(Array.from({ length: numberOfTeams }, () => ({ code: "", flag: "", customFlagImage: "" })));
  }, [numberOfTeams]);

  // Broadcast state changes to projector
  useEffect(() => {
    if (broadcastChannelRef.current && hydrated) {
      const syncPayload = {
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
        logoSize,
        footerText,
        footerSize,
        teamFontScale,
        potFontScale,
        broadcastPotRows,
        showSpotlight,
        matches,
        roundNotes,
        projectorDisplayMode,
        matchesLayout,
        galaOrientation,
        galaColorSwap,
        customLayout,
      };

      broadcastChannelRef.current.postMessage(syncPayload);

      try {
        localStorage.setItem("projector-last-state", JSON.stringify(syncPayload));
      } catch {
        // Ignore storage errors
      }
    }
  }, [pots, groups, selectedTeam, hydrated, showProjectorPots, bgAnimation, projectorLayout, projectorTitle, bgImage, colorPalette, competitionLogo, logoSize, footerText, footerSize, teamFontScale, potFontScale, broadcastPotRows, showSpotlight, matches, roundNotes, projectorDisplayMode, matchesLayout, galaOrientation, galaColorSwap, customLayout]);

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
    setTeamCountries(Array.from({ length: numberOfTeams }, () => ({ code: "", flag: "", customFlagImage: "" })));
    setShowPotForm(false);
  };

  const handleCreateGroups = (e: React.FormEvent) => {
    e.preventDefault();

    if (groups.length > 0) {
      const hasAssignments = groups.some((group) => group.teams.some((team) => team !== null));
      const title = "Update Group Configuration";
      const message = hasAssignments
        ? "Recreate groups with these settings? This will clear all current group assignments."
        : "Recreate groups with these settings?";

      showConfirm(title, message, () => {
        createGroups(numberOfGroups, teamsPerGroup);
        setShowGroupForm(false);
      });
    } else {
      createGroups(numberOfGroups, teamsPerGroup);
      setShowGroupForm(false);
    }
  };

  const openGroupEditor = () => {
    if (groups.length > 0) {
      setNumberOfGroups(groups.length);
      setTeamsPerGroup(groups[0]?.capacity || 1);
    }
    setShowGroupForm(true);
  };

  const handleResetTournament = () => {
    resetTournament();
    setRoundNotes({});
    setCurrentPairings([]);
    setPairingSlotA(null);
    setCurrentRound(1);
  };

  const totalTeams = pots.reduce((acc, pot) => acc + pot.teams.length, 0);
  const assignedTeams = groups.reduce(
    (acc, group) => acc + group.teams.filter((t) => t !== null).length,
    0
  );
  const hasGroupAssignments = groups.some((group) =>
    group.teams.some((team) => team !== null)
  );
  const allTeamsAssigned = totalTeams > 0 && totalTeams === assignedTeams;

  const loadTestData = () => {
    resetTournament();
    setRoundNotes({});
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
            <motion.button
              className={`navbar-tab ${currentPhase === "matches" ? "active" : ""} ${groups.length === 0 ? "disabled" : ""}`}
              whileHover={{ scale: groups.length > 0 ? 1.05 : 1 }}
              whileTap={{ scale: groups.length > 0 ? 0.95 : 1 }}
              onClick={() => groups.length > 0 && setCurrentPhase("matches")}
            >
              <span className="tab-icon">⚔️</span>
              <span className="tab-text">Matches</span>
              {matches.length > 0 && (
                <span className="tab-badge green">{matches.length}</span>
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
              className="navbar-btn navbar-btn-export"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportProjectorDesign}
              title="Export current projector design as PNG"
            >
              📸 Export
            </motion.button>
            {matches.length > 0 && (
              <motion.button
                ref={matchesButtonRef}
                className={`navbar-btn navbar-btn-matches ${showMatchesPanel ? "active" : ""}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMatchesPanel(!showMatchesPanel)}
                title="View Matches"
              >
                📋 Matches
              </motion.button>
            )}
            <motion.button
              ref={settingsButtonRef}
              className={`navbar-btn navbar-btn-settings ${showProjectorSettings ? "active" : ""}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const next = !showProjectorSettings;
                setShowProjectorSettings(next);
                if (next) setActiveSettingsSection("general");
              }}
              title="Projector Settings"
            >
              ⚙️
            </motion.button>
            <motion.button
              ref={saveButtonRef}
              className={`navbar-btn navbar-btn-save ${showSavePanel ? "active" : ""}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSavePanel(!showSavePanel)}
              title="Save / Load Tournament"
            >
              💾
            </motion.button>
            <motion.button
              className="navbar-btn navbar-btn-reset"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                showConfirm(
                  "Reset Tournament",
                  "Reset everything? This will clear all pots, groups, and assignments.",
                  handleResetTournament,
                  true
                );
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
              ref={settingsPanelRef}
              className="projector-settings-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="settings-panel-inner settings-panel-grid">
                <aside className="settings-sidebar">
                  <div className="settings-sidebar-head">
                    <h3>Projector Settings</h3>
                    <p>Organized by section for faster setup</p>
                  </div>
                  <div className="settings-nav-list">
                    {([
                      { key: "general", icon: "🧩", label: "General" },
                      { key: "branding", icon: "🏆", label: "Branding" },
                      { key: "visual", icon: "🎬", label: "Visual" },
                      { key: "colors", icon: "🎨", label: "Colors" },
                      { key: "behavior", icon: "⚡", label: "Behavior" },
                    ] as const).map((item) => (
                      <button
                        key={item.key}
                        className={`settings-nav-btn ${activeSettingsSection === item.key ? "active" : ""}`}
                        onClick={() => setActiveSettingsSection(item.key)}
                        type="button"
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </aside>

                <div className="settings-content">
                  <AnimatePresence mode="wait">
                    {activeSettingsSection === "general" && (
                      <motion.div
                        key="general"
                        className="settings-section-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="settings-card">
                          <h4 className="settings-card-title">Text & Labels</h4>
                          <div className="settings-group">
                            <div className="settings-footer-size">
                              <label className="settings-label">Team Font Size: {teamFontScale.toFixed(2)}x</label>
                              <input
                                type="range"
                                min="0.75"
                                max="1.5"
                                step="0.05"
                                value={teamFontScale}
                                onChange={(e) => setTeamFontScale(parseFloat(e.target.value))}
                                className="settings-range"
                              />
                            </div>
                          </div>

                          <div className="settings-group">
                            <div className="settings-footer-size">
                              <label className="settings-label">Pot Font Size: {potFontScale.toFixed(2)}x</label>
                              <input
                                type="range"
                                min="0.75"
                                max="1.5"
                                step="0.05"
                                value={potFontScale}
                                onChange={(e) => setPotFontScale(parseFloat(e.target.value))}
                                className="settings-range"
                              />
                            </div>
                          </div>

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

                          <div className="settings-group">
                            <label className="settings-label">Footer Text</label>
                            <input
                              type="text"
                              className="settings-input"
                              value={footerText}
                              onChange={(e) => setFooterText(e.target.value)}
                              placeholder="Enter footer text..."
                            />
                            <div className="settings-footer-size">
                              <label className="settings-label">Footer Size: {footerSize}rem</label>
                              <input
                                type="range"
                                min="0.6"
                                max="3"
                                step="0.1"
                                value={footerSize}
                                onChange={(e) => setFooterSize(parseFloat(e.target.value))}
                                className="settings-range"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeSettingsSection === "branding" && (
                      <motion.div
                        key="branding"
                        className="settings-section-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="settings-card">
                          <h4 className="settings-card-title">Competition Logo</h4>
                          <div className="settings-group">
                            <label className="settings-label">Logo File</label>
                            <div className="settings-bg-picker">
                              {competitionLogo && (
                                <img src={competitionLogo} alt="Logo" className="settings-logo-preview" />
                              )}
                              <label className="settings-file-btn">
                                🏆 {competitionLogo ? "Change" : "Upload"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        const dataUrl = ev.target?.result as string;
                                        if (dataUrl) setCompetitionLogo(dataUrl);
                                      };
                                      reader.readAsDataURL(file);
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

                          {competitionLogo && (
                            <div className="settings-group">
                              <div className="settings-footer-size">
                                <label className="settings-label">Logo Size: {logoSize}px</label>
                                <input
                                  type="range"
                                  min="30"
                                  max="200"
                                  step="5"
                                  value={logoSize}
                                  onChange={(e) => setLogoSize(parseInt(e.target.value))}
                                  className="settings-range"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeSettingsSection === "visual" && (
                      <motion.div
                        key="visual"
                        className="settings-section-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="settings-card">
                          <h4 className="settings-card-title">Layout & Background</h4>

                          <div className="settings-group">
                            <label className="settings-label">Layout</label>
                            <div className="settings-layout-btns settings-layout-wrap">
                              {([
                                { key: "stadium", icon: "🏟", label: "Stadium" },
                                { key: "broadcast", icon: "📺", label: "Broadcast" },
                                { key: "gala", icon: "✨", label: "Gala" },
                                { key: "minimal", icon: "◈", label: "Minimal" },
                                { key: "cinematic", icon: "🎬", label: "Cinematic" },
                                { key: "custom", icon: "🧩", label: "Custom" },
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

                          {projectorLayout === "gala" && (
                            <>
                              <div className="settings-group settings-layout-option-card">
                                <label className="settings-label">Gala Orientation</label>
                                <div className="settings-layout-btns">
                                  <motion.button
                                    className={`settings-layout-btn ${galaOrientation === "horizontal" ? "active" : ""}`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setGalaOrientation("horizontal")}
                                  >
                                    ↔️ Horizontal
                                  </motion.button>
                                  <motion.button
                                    className={`settings-layout-btn ${galaOrientation === "vertical" ? "active" : ""}`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setGalaOrientation("vertical")}
                                  >
                                    ↕️ Vertical
                                  </motion.button>
                                </div>
                                <p className="settings-inline-help">
                                  Vertical mode places pots on top and groups below.
                                </p>
                              </div>

                              <div className="settings-group settings-layout-option-card">
                                <label className="settings-label">Gala Pot/Group Colors</label>
                                <div className="settings-layout-btns">
                                  <motion.button
                                    className={`settings-layout-btn ${!galaColorSwap ? "active" : ""}`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setGalaColorSwap(false)}
                                  >
                                    Default
                                  </motion.button>
                                  <motion.button
                                    className={`settings-layout-btn ${galaColorSwap ? "active" : ""}`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setGalaColorSwap(true)}
                                  >
                                    Swapped
                                  </motion.button>
                                </div>
                                <p className="settings-inline-help">
                                  Swap the highlight colors between the groups panel and pots panel.
                                </p>
                              </div>
                            </>
                          )}

                          {projectorLayout === "broadcast" && (
                            <div className="settings-group settings-layout-option-card">
                              <label className="settings-label">Broadcast Layout Options</label>
                              <div className="settings-inline-field-row">
                                <label className="settings-inline-field-label" htmlFor="broadcast-pot-rows-input">
                                  Pot Rows
                                </label>
                                <input
                                  id="broadcast-pot-rows-input"
                                  type="number"
                                  min={1}
                                  max={12}
                                  className="settings-input settings-inline-number"
                                  value={broadcastPotRows}
                                  onChange={(e) => setBroadcastPotRows(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                                />
                              </div>
                              <p className="settings-inline-help">
                                Set rows per pot card. Columns are calculated automatically.
                              </p>
                            </div>
                          )}

                          {projectorLayout === "custom" && (
                            <div className="settings-group settings-layout-option-card custom-layout-editor-card">
                              <div className="settings-layout-editor-header">
                                <div>
                                  <label className="settings-label">Custom Layout Editor</label>
                                  <p className="settings-inline-help">
                                    Drag the panels, resize them from the corner, and change colors from the controls.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="settings-layout-btn"
                                  onClick={() => setCustomLayout(createDefaultCustomLayout())}
                                >
                                  Reset Layout
                                </button>
                              </div>

                              <div className="custom-layout-editor">
                                <div className="custom-layout-canvas-wrap">
                                  <div className="custom-layout-canvas" ref={customEditorCanvasRef}>
                                    {customLayout.elements.map((element) => {
                                      const isActive = selectedCustomElementId === element.id;
                                      return (
                                        <motion.div
                                          key={element.id}
                                          className={`custom-layout-element ${isActive ? "active" : ""}`}
                                          style={{
                                            left: `${element.x}%`,
                                            top: `${element.y}%`,
                                            width: `${element.width}%`,
                                            height: `${element.height}%`,
                                            background: element.background,
                                            borderColor: element.border,
                                            color: element.text,
                                          }}
                                          onPointerDown={(event) => startCustomInteraction(event, element.id, "drag")}
                                          onClick={() => setSelectedCustomElementId(element.id)}
                                        >
                                          <div className="custom-layout-element-bar">
                                            <span>{element.label}</span>
                                            <button
                                              type="button"
                                              className="custom-layout-select-btn"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                setSelectedCustomElementId(element.id);
                                              }}
                                            >
                                              Edit
                                            </button>
                                          </div>
                                          <div className="custom-layout-element-body">
                                            {renderCustomCanvasSection(element)}
                                          </div>
                                          <button
                                            type="button"
                                            className="custom-layout-resize-handle"
                                            onPointerDown={(event) => startCustomInteraction(event, element.id, "resize")}
                                          >
                                            ↘
                                          </button>
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="custom-layout-controls">
                                  <div className="settings-group">
                                    <label className="settings-label">Selected Element</label>
                                    <div className="settings-layout-btns settings-layout-wrap">
                                      {customLayout.elements.map((element) => (
                                        <button
                                          key={element.id}
                                          type="button"
                                          className={`settings-layout-btn ${selectedCustomElementId === element.id ? "active" : ""}`}
                                          onClick={() => setSelectedCustomElementId(element.id)}
                                        >
                                          {element.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {(() => {
                                    const activeElement = customLayout.elements.find((element) => element.id === selectedCustomElementId) ?? customLayout.elements[0];
                                    if (!activeElement) return null;

                                    return (
                                      <>
                                        <div className="settings-group">
                                          <label className="settings-label">Position</label>
                                          <div className="settings-inline-field-row custom-range-row">
                                            <span className="settings-inline-field-label">X</span>
                                            <input
                                              type="range"
                                              min="0"
                                              max="100"
                                              step="1"
                                              value={activeElement.x}
                                              onChange={(event) => updateCustomElement(activeElement.id, { x: Number(event.target.value) })}
                                              className="settings-range"
                                            />
                                          </div>
                                          <div className="settings-inline-field-row custom-range-row">
                                            <span className="settings-inline-field-label">Y</span>
                                            <input
                                              type="range"
                                              min="0"
                                              max="100"
                                              step="1"
                                              value={activeElement.y}
                                              onChange={(event) => updateCustomElement(activeElement.id, { y: Number(event.target.value) })}
                                              className="settings-range"
                                            />
                                          </div>
                                        </div>

                                        <div className="settings-group">
                                          <label className="settings-label">Size</label>
                                          <div className="settings-inline-field-row custom-range-row">
                                            <span className="settings-inline-field-label">W</span>
                                            <input
                                              type="range"
                                              min="10"
                                              max="100"
                                              step="1"
                                              value={activeElement.width}
                                              onChange={(event) => updateCustomElement(activeElement.id, { width: Number(event.target.value) })}
                                              className="settings-range"
                                            />
                                          </div>
                                          <div className="settings-inline-field-row custom-range-row">
                                            <span className="settings-inline-field-label">H</span>
                                            <input
                                              type="range"
                                              min="8"
                                              max="100"
                                              step="1"
                                              value={activeElement.height}
                                              onChange={(event) => updateCustomElement(activeElement.id, { height: Number(event.target.value) })}
                                              className="settings-range"
                                            />
                                          </div>
                                        </div>

                                        <div className="settings-group custom-color-grid">
                                          <div>
                                            <label className="settings-label">Background</label>
                                            <input
                                              type="color"
                                              value={toHexColor(activeElement.background)}
                                              onChange={(event) => updateCustomElement(activeElement.id, { background: hexToRgba(event.target.value, 0.18) })}
                                              className="settings-color-input"
                                            />
                                          </div>
                                          <div>
                                            <label className="settings-label">Border</label>
                                            <input
                                              type="color"
                                              value={toHexColor(activeElement.border)}
                                              onChange={(event) => updateCustomElement(activeElement.id, { border: event.target.value })}
                                              className="settings-color-input"
                                            />
                                          </div>
                                          <div>
                                            <label className="settings-label">Accent</label>
                                            <input
                                              type="color"
                                              value={toHexColor(activeElement.accent)}
                                              onChange={(event) => updateCustomElement(activeElement.id, { accent: event.target.value })}
                                              className="settings-color-input"
                                            />
                                          </div>
                                          <div>
                                            <label className="settings-label">Text</label>
                                            <input
                                              type="color"
                                              value={toHexColor(activeElement.text)}
                                              onChange={(event) => updateCustomElement(activeElement.id, { text: event.target.value })}
                                              className="settings-color-input"
                                            />
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="settings-group">
                            <label className="settings-label">Background Animation</label>
                            <div className="settings-layout-btns settings-layout-wrap">
                              {([
                                { key: "none", label: "None" },
                                { key: "slide", label: "Slide" },
                                { key: "zoom", label: "Zoom" },
                                { key: "fade", label: "Fade" },
                                { key: "rotate", label: "Rotate" },
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

                          <div className="settings-group">
                            <label className="settings-label">Background Image</label>
                            <div className="settings-bg-picker">
                              <label className="settings-file-btn">
                                📁 Choose Image
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        const dataUrl = ev.target?.result as string;
                                        if (dataUrl) setBgImage(dataUrl);
                                      };
                                      reader.readAsDataURL(file);
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
                        </div>
                      </motion.div>
                    )}

                    {activeSettingsSection === "colors" && (
                      <motion.div
                        key="colors"
                        className="settings-section-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="settings-card">
                          <h4 className="settings-card-title">Theme & Palette</h4>
                          <div className="settings-group">
                            <label className="settings-label">Color Mode</label>
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
                        </div>
                      </motion.div>
                    )}

                    {activeSettingsSection === "behavior" && (
                      <motion.div
                        key="behavior"
                        className="settings-section-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="settings-card">
                          <h4 className="settings-card-title">Visibility Controls</h4>
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

                          <div className="settings-group">
                            <label className="settings-label">Selected Team Spotlight</label>
                            <motion.button
                              className={`settings-toggle ${showSpotlight ? "on" : "off"}`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setShowSpotlight(!showSpotlight)}
                            >
                              {showSpotlight ? "✓ Spotlight On" : "🚫 Spotlight Off"}
                            </motion.button>
                          </div>

                          {matches.length > 0 && (
                            <>
                              <div className="settings-group">
                                <label className="settings-label">Projector Display Mode</label>
                                <div className="settings-layout-btns">
                                  <motion.button
                                    className={`settings-layout-btn ${projectorDisplayMode === "groups" ? "active" : ""}`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setProjectorDisplayMode("groups")}
                                  >
                                    🏆 Groups
                                  </motion.button>
                                  <motion.button
                                    className={`settings-layout-btn ${projectorDisplayMode === "matches" ? "active" : ""}`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setProjectorDisplayMode("matches")}
                                  >
                                    ⚔️ Fixtures
                                  </motion.button>
                                </div>
                              </div>

                              {projectorDisplayMode === "matches" && (
                                <div className="settings-group">
                                  <label className="settings-label">Fixtures Theme</label>
                                  <div className="settings-layout-btns">
                                    <motion.button
                                      className={`settings-layout-btn ${matchesLayout === "default" ? "active" : ""}`}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setMatchesLayout("default")}
                                    >
                                      📋 Classic Board
                                    </motion.button>
                                    <motion.button
                                      className={`settings-layout-btn ${matchesLayout === "gala" ? "active" : ""}`}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setMatchesLayout("gala")}
                                    >
                                      ✨ Prestige
                                    </motion.button>
                                    <motion.button
                                      className={`settings-layout-btn ${matchesLayout === "ultra" ? "active" : ""}`}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setMatchesLayout("ultra")}
                                    >
                                      🚀 Velocity
                                    </motion.button>
                                    <motion.button
                                      className={`settings-layout-btn ${matchesLayout === "broadcast" ? "active" : ""}`}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setMatchesLayout("broadcast")}
                                    >
                                      📺 Studio Desk
                                    </motion.button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save / Load Panel */}
        <AnimatePresence>
          {showSavePanel && (
            <motion.div
              ref={savePanelRef}
              className="save-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="save-panel-inner">
                {/* Save Current */}
                <div className="save-section">
                  <h3 className="save-section-title">💾 Save Current Tournament</h3>
                  <div className="save-form">
                    <input
                      type="text"
                      className="settings-input save-name-input"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Tournament name..."
                      onKeyDown={(e) => e.key === "Enter" && saveTournament()}
                    />
                    <motion.button
                      className="save-btn save-btn-confirm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={saveTournament}
                      disabled={!saveName.trim()}
                    >
                      Save
                    </motion.button>
                  </div>
                </div>

                {/* Saved List */}
                <div className="save-section">
                  <h3 className="save-section-title">📂 Saved Tournaments ({savedTournaments.length})</h3>
                  {savedTournaments.length === 0 ? (
                    <p className="save-empty">No saved tournaments yet</p>
                  ) : (
                    <div className="save-list">
                      {savedTournaments.map((t) => (
                        <div key={t.id} className="save-item">
                          <div className="save-item-info">
                            <span className="save-item-name">{t.name}</span>
                            <span className="save-item-meta">
                              {t.pots.length} pots · {t.groups.length} groups · {new Date(t.savedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="save-item-actions">
                            <motion.button
                              className="save-btn save-btn-load"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => loadTournament(t)}
                            >
                              Load
                            </motion.button>
                            <motion.button
                              className="save-btn save-btn-delete"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => deleteSavedTournament(t.id)}
                            >
                              ✕
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Matches Panel */}
        <AnimatePresence>
          {showMatchesPanel && matches.length > 0 && (
            <motion.div
              ref={matchesPanelRef}
              className="matches-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="matches-panel-inner">
                <div className="matches-panel-header">
                  <h3 className="matches-panel-title">📋 Generated Matches ({matches.length})</h3>
                  <div className="matches-filter-tabs">
                    <button
                      className={`matches-filter-tab ${matchesFilterRound === "all" ? "active" : ""}`}
                      onClick={() => setMatchesFilterRound("all")}
                    >
                      All Rounds
                    </button>
                    {[...new Set(matches.map(m => m.round))].sort().map(r => (
                      <button
                        key={r}
                        className={`matches-filter-tab ${matchesFilterRound === r ? "active" : ""}`}
                        onClick={() => setMatchesFilterRound(r)}
                      >
                        Round {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="matches-cards-grid">
                  {(matchesFilterRound === "all" ? matches : matches.filter(m => m.round === matchesFilterRound))
                    .map((match) => {
                      const matchGroup = groups.find(g => g.name.charAt(g.name.length - 1) === match.group);
                      const homeTeam = matchGroup?.teams[match.homeSlotIndex] || null;
                      const awayTeam = matchGroup?.teams[match.awaySlotIndex] || null;
                      return (
                        <motion.div
                          key={match.id}
                          className="match-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          layout
                        >
                          <div className="match-card-badges">
                            <span className="match-badge match-badge-round">R{match.round}</span>
                            <span className="match-badge match-badge-group">Group {match.group}</span>
                            <span className="match-badge match-badge-num">#{match.matchNumber}</span>
                          </div>
                          <div className="match-card-teams">
                            <div className="match-team home">
                              {homeTeam ? (
                                <>
                                  <FlagImg src={homeTeam.customFlagImage} code={homeTeam.countryCode} size="sm" className="match-team-flag" />
                                  <span className="match-team-name">{homeTeam.name}</span>
                                </>
                              ) : (
                                <span className="match-team-placeholder">{match.homePlaceholder}</span>
                              )}
                            </div>
                            <span className="match-vs">VS</span>
                            <div className="match-team away">
                              {awayTeam ? (
                                <>
                                  <FlagImg src={awayTeam.customFlagImage} code={awayTeam.countryCode} size="sm" className="match-team-flag" />
                                  <span className="match-team-name">{awayTeam.name}</span>
                                </>
                              ) : (
                                <span className="match-team-placeholder">{match.awayPlaceholder}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
                                  <div className="team-country-row">
                                    {teamCountries[index]?.customFlagImage || teamCountries[index]?.code ? (
                                      <FlagImg src={teamCountries[index].customFlagImage} code={teamCountries[index].code} size="sm" className="team-country-flag-preview" />
                                    ) : (
                                      <span className="team-country-flag-empty">🏳️</span>
                                    )}
                                    <select
                                      className="team-country-select"
                                      value={teamCountries[index]?.code || ""}
                                      onChange={(e) => {
                                        const country = africaCountries.find((c: { code: string }) => c.code === e.target.value);
                                        const newCountries = [...teamCountries];
                                        const previousCustom = newCountries[index]?.customFlagImage;
                                        newCountries[index] = country ? { code: country.code, flag: country.flag, customFlagImage: previousCustom } : { code: "", flag: "", customFlagImage: previousCustom };
                                        setTeamCountries(newCountries);
                                      }}
                                    >
                                      <option value="">Select Country</option>
                                      {africaCountries.map((country: { code: string; flag: string; name: string }) => (
                                        <option key={country.code} value={country.code}>
                                          {country.name}
                                        </option>
                                      ))}
                                    </select>
                                    <label className="team-flag-upload-btn" title="Upload custom flag">
                                      🖼
                                      <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const reader = new FileReader();
                                          reader.onload = (ev) => {
                                            const dataUrl = ev.target?.result as string;
                                            if (!dataUrl) return;
                                            setTeamCountries((prev) => {
                                              const next = [...prev];
                                              const current = next[index] || { code: "", flag: "" };
                                              next[index] = { ...current, customFlagImage: dataUrl };
                                              return next;
                                            });
                                          };
                                          reader.readAsDataURL(file);
                                        }}
                                      />
                                    </label>
                                    {teamCountries[index]?.customFlagImage && (
                                      <button
                                        type="button"
                                        className="team-flag-remove-btn"
                                        title="Remove custom flag"
                                        onClick={() => {
                                          setTeamCountries((prev) => {
                                            const next = [...prev];
                                            if (!next[index]) return prev;
                                            next[index] = { ...next[index], customFlagImage: "" };
                                            return next;
                                          });
                                        }}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
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
                              <div className="pot-card-actions">
                                <motion.button
                                  className="btn-edit-pot"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => openEditPotModal(pot)}
                                  title={`Edit ${pot.name}`}
                                >
                                  ✏️
                                </motion.button>
                                <motion.button
                                  className="btn-delete-pot"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    showConfirm(
                                      "Delete Pot",
                                      `Delete entire "${pot.name}" and all its teams?`,
                                      () => deletePot(pot.id),
                                      true
                                    );
                                  }}
                                  title={`Delete ${pot.name}`}
                                >
                                  🗑
                                </motion.button>
                              </div>
                            </div>
                            <div className="teams-list">
                              {pot.teams.map((team) => (
                                <div
                                  key={team.id}
                                  className={`team-card ${draggedPotTeam?.potId === pot.id && draggedPotTeam?.teamId === team.id ? "dragging" : ""} ${dragOverPotTeam?.potId === pot.id && dragOverPotTeam?.teamId === team.id ? "drag-over" : ""}`}
                                  draggable
                                  onDragStart={() => {
                                    setDraggedPotTeam({ potId: pot.id, teamId: team.id });
                                    setDragOverPotTeam(null);
                                  }}
                                  onDragOver={(e) => {
                                    if (draggedPotTeam?.potId !== pot.id || draggedPotTeam.teamId === team.id) return;
                                    e.preventDefault();
                                    setDragOverPotTeam({ potId: pot.id, teamId: team.id });
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (!draggedPotTeam) return;
                                    if (draggedPotTeam.potId !== pot.id || draggedPotTeam.teamId === team.id) return;
                                    reorderTeamInPot(pot.id, draggedPotTeam.teamId, team.id);
                                    setDraggedPotTeam(null);
                                    setDragOverPotTeam(null);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedPotTeam(null);
                                    setDragOverPotTeam(null);
                                  }}
                                >
                                  <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="team-flag-img" />
                                  <span className="team-name-text">{team.name}</span>
                                  <motion.button
                                    className="team-remove-btn"
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      showConfirm(
                                        "Remove Team",
                                        `Remove "${team.name}" from ${pot.name}?`,
                                        () => removeTeamFromPot(pot.id, team.id),
                                        true
                                      );
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
                <div className="edit-workbench">
                  <div className="edit-workbench-card red">
                    <div className="edit-workbench-title-row">
                      <h3 className="edit-workbench-title">Step 1 · Pots Finalized</h3>
                      <span className="edit-workbench-badge">{pots.length} Pots</span>
                    </div>
                    <p className="edit-workbench-text">
                      Need to adjust pot names or teams? Unlock Step 1 to edit pots.
                    </p>
                    <div className="edit-workbench-chips">
                      <span className="edit-workbench-chip">{totalTeams} Teams</span>
                      <span className="edit-workbench-chip muted">Ready for draw setup</span>
                    </div>
                    <motion.button
                      className="edit-action-btn red"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        showConfirm(
                          "Edit Pots",
                          "Do you want to unlock Step 1 to edit pots and teams?",
                          () => unfinalizePots()
                        );
                      }}
                    >
                      🔓 Edit Pots
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Step 2: Create / Edit Groups */}
              {potsFinalized && (
                <>
                  <div className="edit-workbench">
                    <div className="edit-workbench-card green">
                      <div className="edit-workbench-title-row">
                        <h3 className="edit-workbench-title">
                          {groups.length === 0 ? "Step 2 · Create Groups" : "Step 2 · Edit Groups"}
                        </h3>
                        <span className="edit-workbench-badge">{groups.length || 0} Groups</span>
                      </div>
                      <p className="edit-workbench-text">
                        Configure number of groups and team slots with live capacity preview.
                      </p>
                      <div className="edit-workbench-chips">
                        <span className="edit-workbench-chip">{assignedTeams}/{totalTeams} Assigned</span>
                        <span className="edit-workbench-chip muted">
                          Capacity {groups.length > 0 ? groups.length * (groups[0]?.capacity || 0) : numberOfGroups * teamsPerGroup}
                        </span>
                      </div>

                      <AnimatePresence>
                        {!showGroupForm && (
                          <motion.button
                            className="edit-action-btn green"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={openGroupEditor}
                          >
                            {groups.length === 0 ? "+ Create Groups" : "✏️ Edit Groups"}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showGroupForm && (
                      <motion.button
                        className="btn-create green-border"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowGroupForm(false)}
                      >
                        ← Back to Group Summary
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showGroupForm && (
                      <motion.div
                        className="form-container green-border group-editor-form"
                        variants={slideInVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <h3 className="form-title">{groups.length === 0 ? "Create Groups" : "Edit Groups"}</h3>
                        <p className="form-subtitle">
                          Set the structure for the draw board. You can adjust this later.
                        </p>

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
                            <p className="info-row">
                              <strong>Total capacity</strong>
                              <span>{numberOfGroups} groups × {teamsPerGroup} teams = {numberOfGroups * teamsPerGroup}</span>
                            </p>
                            <p className="info-row">
                              <strong>Available teams</strong>
                              <span>{totalTeams} teams</span>
                            </p>
                            {groups.length > 0 && hasGroupAssignments && (
                              <p className="info-warning">⚠ Saving changes will reset current assignments.</p>
                            )}
                          </div>

                          <div className="form-buttons">
                            <motion.button
                              className="btn-submit"
                              type="submit"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {groups.length === 0 ? "Create Groups" : "Save Group Changes"}
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
                <div className="draw-status-main">
                  <AnimatePresence mode="wait" initial={false}>
                    {selectedTeam ? (
                      <motion.div
                        key="selected"
                        className="draw-selected-team"
                        initial={{ opacity: 0, scale: 0.85, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 10 }}
                        transition={{ type: "spring", stiffness: 200, damping: 18 }}
                      >
                        <span className="draw-selected-label">Selected</span>
                        <div className="draw-selected-body">
                          <FlagImg src={selectedTeam.customFlagImage} code={selectedTeam.countryCode} size="lg" className="draw-selected-flag" />
                          <span className="draw-selected-name">{selectedTeam.name}</span>
                          <motion.button
                            className="draw-deselect-btn"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => selectTeam(null)}
                            title="Deselect"
                          >
                            ✕
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="waiting"
                        className="draw-waiting"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                      >
                        <span className="draw-waiting-icon">🎯</span>
                        <span className="draw-waiting-text">Click a team, then click a slot</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className="draw-progress-text">
                  {allTeamsAssigned
                    ? "✅ Draw Complete — All teams assigned!"
                    : `${assignedTeams} / ${totalTeams} teams assigned`}
                </p>
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
                                <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="team-flag-img" />
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
                          className={`draw-group-card ${isGroupComplete ? "complete" : ""} ${selectedGroupId === group.id ? "selected" : ""}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => setSelectedGroupId(group.id)}
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
                                    <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="slot-flag-img" />
                                    <span className="slot-team-name">{team.name}</span>
                                  </>
                                ) : (
                                  <span className="slot-empty-label">{group.name.charAt(group.name.length - 1)}{slotIndex + 1}</span>
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
                                <FlagImg src={team.customFlagImage} code={team.countryCode} size="sm" className="team-flag-img" />
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

          {/* Matches Phase */}
          {currentPhase === "matches" && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="step-header purple">
                <h2>Step 3: Configure Match Pairings</h2>
              </div>

              {/* Round Selector */}
              <div className="match-setup-rounds">
                <div className="match-round-tabs">
                  {(() => {
                    const maxRound = roundConfigs.length > 0 ? Math.max(...roundConfigs.map(rc => rc.round)) : 0;
                    const roundNumbers = Array.from({ length: Math.max(maxRound, currentRound) }, (_, i) => i + 1);
                    return roundNumbers.map(r => (
                      <motion.button
                        key={r}
                        className={`match-round-tab ${currentRound === r ? "active" : ""} ${roundConfigs.some(rc => rc.round === r) ? "configured" : ""}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setCurrentRound(r);
                          const existing = roundConfigs.find(rc => rc.round === r);
                          setCurrentPairings(existing ? [...existing.pairings] : []);
                          setPairingSlotA(null);
                        }}
                      >
                        Round {r}
                        {roundConfigs.some(rc => rc.round === r) && <span className="round-check">✓</span>}
                      </motion.button>
                    ));
                  })()}
                  <motion.button
                    className="match-round-tab add-round"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const maxRound = roundConfigs.length > 0 ? Math.max(...roundConfigs.map(rc => rc.round)) : 0;
                      const next = Math.max(maxRound, currentRound) + 1;
                      setCurrentRound(next);
                      setCurrentPairings([]);
                      setPairingSlotA(null);
                    }}
                  >
                    + Add Round
                  </motion.button>
                </div>
              </div>

              {/* Pairing Builder */}
              {groups.length > 0 && (
                <div className="pairing-builder">
                  <div className="pairing-builder-header">
                    <h3>Configure Round {currentRound} — Using {groups[0].name} as example</h3>
                    <p className="pairing-builder-hint">
                      Click two slots to pair them. Each team must appear in exactly one match per round.
                    </p>
                    <div className="round-note-editor">
                      <label htmlFor={`round-note-${currentRound}`} className="round-note-label">
                        Round {currentRound} note (shown in Matches view)
                      </label>
                      <textarea
                        id={`round-note-${currentRound}`}
                        className="round-note-input"
                        rows={3}
                        placeholder="Ex: Opening round — derby fixtures and key matchups"
                        value={roundNotes[currentRound] ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRoundNotes((prev) => ({
                            ...prev,
                            [currentRound]: value,
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="pairing-slots">
                    {Array.from({ length: groups[0].teams.length }).map((_, idx) => {
                      const groupLetter = groups[0].name.charAt(groups[0].name.length - 1);
                      const team = groups[0].teams[idx];
                      const isPaired = currentPairings.some(([a, b]) => a === idx || b === idx);
                      const isSelectedForPairing = pairingSlotA === idx;

                      return (
                        <motion.button
                          key={idx}
                          className={`pairing-slot ${isPaired ? "paired" : ""} ${isSelectedForPairing ? "selected" : ""}`}
                          whileHover={{ scale: isPaired ? 1 : 1.05 }}
                          whileTap={{ scale: isPaired ? 1 : 0.95 }}
                          disabled={isPaired}
                          onClick={() => {
                            if (isPaired) return;
                            if (pairingSlotA === null) {
                              setPairingSlotA(idx);
                            } else if (pairingSlotA === idx) {
                              setPairingSlotA(null);
                            } else {
                              setCurrentPairings(prev => [...prev, [pairingSlotA, idx]]);
                              setPairingSlotA(null);
                            }
                          }}
                        >
                          <span className="pairing-slot-label">{groupLetter}{idx + 1}</span>
                          {team ? (
                            <span className="pairing-slot-team">
                              <FlagImg src={team.customFlagImage} code={team.countryCode} size="xs" className="pairing-slot-flag" />
                              {team.name}
                            </span>
                          ) : (
                            <span className="pairing-slot-team empty">Empty Slot</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Current Pairings */}
                  {currentPairings.length > 0 && (
                    <div className="pairing-result">
                      <h4>Configured Pairings for Round {currentRound}:</h4>
                      <div className="pairing-list">
                        {currentPairings.map(([a, b], idx) => {
                          const groupLetter = groups[0].name.charAt(groups[0].name.length - 1);
                          const teamA = groups[0].teams[a];
                          const teamB = groups[0].teams[b];
                          return (
                            <div key={idx} className="pairing-item">
                              <span className="pairing-team">
                                {teamA ? teamA.name : `${groupLetter}${a + 1}`}
                              </span>
                              <span className="pairing-vs">vs</span>
                              <span className="pairing-team">
                                {teamB ? teamB.name : `${groupLetter}${b + 1}`}
                              </span>
                              <motion.button
                                className="pairing-remove"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  setCurrentPairings(prev => prev.filter((_, i) => i !== idx));
                                }}
                              >
                                ✕
                              </motion.button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preview for all groups */}
                  {currentPairings.length > 0 && (
                    <div className="pairing-preview">
                      <h4>Preview — Pattern applied to all groups:</h4>
                      <div className="pairing-preview-grid">
                        {groups.map(group => {
                          const gl = group.name.charAt(group.name.length - 1);
                          return (
                            <div key={group.id} className="pairing-preview-group">
                              <span className="pairing-preview-group-name">{group.name}</span>
                              {currentPairings.map(([a, b], idx) => {
                                if (a >= group.teams.length || b >= group.teams.length) return null;
                                const tA = group.teams[a];
                                const tB = group.teams[b];
                                return (
                                  <div key={idx} className="pairing-preview-match">
                                    <span>{tA ? tA.name : `${gl}${a + 1}`}</span>
                                    <span className="pairing-preview-vs">vs</span>
                                    <span>{tB ? tB.name : `${gl}${b + 1}`}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pairing-actions">
                    <motion.button
                      className="btn-submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={currentPairings.length === 0}
                      onClick={() => {
                        // Validate — check all slots are used exactly once
                        const slotCount = groups[0].teams.length;
                        const usedSlots = new Set<number>();
                        for (const [a, b] of currentPairings) {
                          usedSlots.add(a);
                          usedSlots.add(b);
                        }
                        // For odd-numbered groups, one team can be left without a pair (bye)
                        const isOddGroup = slotCount % 2 !== 0;
                        const expectedPairs = Math.floor(slotCount / 2);
                        if (currentPairings.length !== expectedPairs) {
                          alert(`Please create exactly ${expectedPairs} pairings for ${slotCount} teams${isOddGroup ? " (1 bye)" : ""}.`);
                          return;
                        }
                        // Save config and generate
                        setRoundConfig({ round: currentRound, pairings: currentPairings });
                        setTimeout(() => generateMatchesForRound(currentRound), 50);
                      }}
                    >
                      ✓ Save & Generate Round {currentRound} Matches
                    </motion.button>
                    {currentPairings.length > 0 && (
                      <motion.button
                        className="btn-cancel"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setCurrentPairings([]);
                          setPairingSlotA(null);
                        }}
                      >
                        Clear Pairings
                      </motion.button>
                    )}
                    {roundConfigs.some(rc => rc.round === currentRound) && (
                      <motion.button
                        className="btn-cancel destructive"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          removeRoundConfig(currentRound);
                          setCurrentPairings([]);
                          setPairingSlotA(null);
                          setRoundNotes((prev) => {
                            const next = { ...prev };
                            delete next[currentRound];
                            return next;
                          });
                        }}
                      >
                        🗑 Delete Round {currentRound}
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {/* Summary of all rounds */}
              {matches.length > 0 && (
                <div className="match-summary">
                  <div className="section-title purple">
                    <h2>Generated Matches ({matches.length})</h2>
                  </div>
                  <div className="match-summary-stats">
                    <span className="match-stat">{roundConfigs.length} Round{roundConfigs.length !== 1 ? "s" : ""}</span>
                    <span className="match-stat">{groups.length} Group{groups.length !== 1 ? "s" : ""}</span>
                    <span className="match-stat">{matches.length} Total Matches</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Pot Name Modal */}
        <AnimatePresence>
          {editPotModal.show && (
            <motion.div
              className="confirm-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeEditPotModal}
            >
              <motion.div
                className="confirm-modal"
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="confirm-modal-header">
                  <h2 className="confirm-modal-title">Edit Pot Name</h2>
                </div>
                <div className="confirm-modal-body">
                  <input
                    type="text"
                    className="edit-pot-input"
                    value={editPotModal.potName}
                    onChange={(e) =>
                      setEditPotModal({ ...editPotModal, potName: e.target.value })
                    }
                    placeholder="Enter pot name"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === "Enter") saveEditPotName();
                    }}
                  />
                </div>
                <div className="confirm-modal-footer">
                  <motion.button
                    className="confirm-btn-cancel"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={closeEditPotModal}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    className="confirm-btn-action"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={saveEditPotName}
                  >
                    Save
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {confirmModal.show && (
            <motion.div
              className="confirm-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeConfirm}
            >
              <motion.div
                className={`confirm-modal ${confirmModal.isDestructive ? "destructive" : ""}`}
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="confirm-modal-header">
                  <h2 className="confirm-modal-title">{confirmModal.title}</h2>
                </div>
                <div className="confirm-modal-body">
                  <p className="confirm-modal-message">{confirmModal.message}</p>
                </div>
                <div className="confirm-modal-footer">
                  <motion.button
                    className="confirm-btn-cancel"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={closeConfirm}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    className={`confirm-btn-action ${confirmModal.isDestructive ? "destructive" : ""}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={confirmAction}
                  >
                    {confirmModal.isDestructive ? "Delete" : "Confirm"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}