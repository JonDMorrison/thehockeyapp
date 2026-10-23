# Visual Features page

Features now leads with coach and parent value: a short hero, visual examples of plans/standings/workout progress, a parent workout and shot-total preview, and six concise included features. Sample data is labelled. The previous association-heavy tour, repetitive descriptions and non-working mock buttons are removed.

Coach, family and association actions retain their selected signup intent without a role-selection modal. Joining, association contact and the working demo remain reachable. Section anchors coaches, players and visibility are retained, with an included anchor added. Static fallback and Features metadata match the new content.

Validation: full npm check; Chromium/WebKit/Firefox tests at 320/390/1280px; coach and family signup, joining, keyboard navigation, anchor jumps, working shooting demo save and workout demo navigation; signup actions on short 390x568px phones; no-JavaScript public documents. Screenshots reviewed on desktop and narrow mobile. Tests open signup without creating real accounts; mocked signup validation sends no real email. Mobile tests use browser viewports, not physical devices.

Existing lint warnings and optional local Chrome prerender limitation remain unchanged.
