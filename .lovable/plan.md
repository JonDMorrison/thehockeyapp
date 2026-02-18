

## Redesign the Features Section: Use-Case Cards

Replace the current 4 feature cards (Wi-Fi, Schedule, Privacy, Rewards) with 4 new use-case-oriented cards that show visitors *how* they can use the app. This shifts from technical features to practical scenarios.

### New Cards

1. **Perfect for coaches** -- Give your team a structured off-ice program without adding to your workload. See who is putting in the work at a glance.
2. **Run a spring or summer program** -- Set up a 30-day challenge or off-season program in minutes. Players stay sharp between seasons with a plan that runs itself.
3. **Set up your family** -- Create a home development plan for your child. They follow their checklist, you follow their progress. No nagging required.
4. **Works for any age or level** -- From first-year players building basics to competitive athletes grinding every day. The app scales to fit your player.

### Visual Updates

- Icons will change to match the new themes: Users (coaches/team), Calendar (seasonal program), Home (family), TrendingUp (growth/levels)
- Keep the existing card styling (rounded-2xl, hover shadow, decorative circles)
- Section headline updated to something like: **"One app. A hundred ways to use it."**
- Subtitle updated to reinforce versatility

### Technical Details

- **File**: `src/pages/marketing/Home.tsx`
- Replace the 4 feature card content blocks (lines ~145-190) with new titles, descriptions, and icons
- Update section heading and subtitle text
- Import any new icons from lucide-react (e.g., `Users`, `Home`, `TrendingUp`) replacing `Wifi` and `Shield`
- No structural or layout changes needed -- same 2x2 grid, same card component pattern

