from pathlib import Path

path = Path('/Users/mac/Desktop/KAMAL/CODE/CAF/tournament-management/app/routes/projector.tsx')
text = path.read_text()
start_marker = '  // ============ CINEMATIC LAYOUT ============\n'
end_marker = '  // ============ MATCHES VIEW — PREMIUM BROADCAST LAYOUT ============\n'
start = text.index(start_marker)
end = text.index(end_marker)
new_block = '''  // ============ CINEMATIC LAYOUT ==========
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
          {selectedTeam ? (
            <motion.div
              key={`cine-take-${selectedTeam.id}`}
              className={`cine-takeover ${showSpotlight ? "spotlight-on" : "spotlight-off"}`}
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

'''
path.write_text(text[:start] + new_block + text[end:])
print('replaced cinematic block')
