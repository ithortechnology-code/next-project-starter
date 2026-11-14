# Design guidelines

These guidelines help contributors build consistent interfaces across the starter's web and mobile apps. Start with the user's task and content, then adapt the interface to each platform. Mobile-first means the web layout works at narrow widths before it expands; it does not mean the web should imitate a native app.

## Responsive web

Design and implement web pages from the narrow layout upward. Treat 360–390 CSS pixels as a useful narrow-screen design and review range, and check that content still works at 320 CSS pixels. Use available space to improve hierarchy and efficiency as the viewport grows, while keeping the same content and core task understandable at every size.

- **Let content set breakpoints.** Add a breakpoint when the current layout stops working, rather than targeting named devices. Keep breakpoints few and explain what changes at each one.
- **Scale layouts up from the base.** Put narrow-screen styles in the base rules and use `min-width` breakpoints for wider layouts by default. A targeted `max-width` exception is acceptable when it solves a specific narrow-screen issue; don't make desktop-first overrides the general pattern.
- **Reflow before shrinking.** Stack columns, wrap controls, and move secondary content when needed. Avoid making desktop layouts fit a phone by shrinking text, controls, or spacing until they are hard to use.
- **Prevent horizontal overflow at its source.** Phone layouts must not cause page-level horizontal scrolling. Prefer fluid widths, `max-width: 100%`, and shrinkable grid tracks such as `minmax(0, 1fr)`. Avoid fixed widths that exceed the available space. The only standard exceptions are intentionally horizontally scrollable tabs and tables whose columns need more width; confine scrolling to their own region, make it discoverable, and keep focusable content reachable. Don't apply root-level `overflow-x: hidden` as a blanket fix; it can conceal clipped content and keyboard focus. Fix the overflowing element and add clipping only where the design intentionally requires it.
- **Preserve priority.** Keep the page title, essential information, and primary action easy to find at every width. Secondary actions may move into a menu if their presence and location remain clear.
- **Use width deliberately.** Constrain long text and forms for readability. Expand grids and multi-column layouts only when the available width supports them.
- **Support touch and pointer input.** Make interactive targets comfortable to tap, provide visible focus for keyboard users, and keep hover as an enhancement rather than the only way to reveal or operate something.
- **Make touch targets forgiving.** Aim for at least 44 × 44 CSS pixels for frequently used web controls, with clear separation between adjacent actions. WCAG 2.2 AA's minimum target-size criterion is 24 × 24 CSS pixels (with exceptions); 44 × 44 is the enhanced AAA criterion. Treat the larger size as a usability goal for touch-heavy controls, not as the AA threshold for every inline link.
- **Keep text readable and zoomable.** Use readable body text, with 16 CSS pixels as a practical narrow-screen starting point. Use at least 16 CSS pixels for text-entry controls when avoiding automatic focus zoom in iOS Safari is important. Never disable user zoom to work around layout or input behavior.
- **Check contrast and action hierarchy.** Meet WCAG AA contrast for text: 4.5:1 for normal text and 3:1 for large text. Use at least 3:1 contrast for visual information needed to identify controls and their states. Give each screen or state a clear primary action, while allowing other actions when the task requires them.
- **Consider reach without overriding conventions.** Place frequent actions where they are comfortable to reach on touch devices when the task supports it. Don't force all navigation or primary actions into the lower half; preserve familiar web navigation and consider one-handed use, handedness, content, and accessibility together.
- **Account for browser behavior.** Keep pages usable with zoom, text resizing, virtual keyboards, browser navigation, and safe-area insets where content reaches device edges.
- **Keep focused fields visible with the mobile keyboard open.** Use the appropriate input type and keyboard hint for each field. When the keyboard opens, ensure the focused field, its label and validation feedback, and the next relevant action can be brought into view by scrolling. Avoid fixed positioning or scroll locking that traps the edited field behind the keyboard. Check focus, keyboard navigation between fields, and submit/continue actions on mobile Safari and Chrome.
- **Choose a keyboard that supports signed numbers.** For fields that accept negative values, don't force a numeric keypad that omits the minus sign. Select an input mode that exposes the required sign (use a text-capable keyboard when needed), and validate the signed value in the application.
- **Handle viewport height carefully.** For layouts that intentionally fill the visible screen, prefer dynamic viewport units such as `100dvh` so changing browser chrome is accounted for. Provide a fallback where needed, and avoid forcing ordinary pages into a fixed viewport height.
- **Inset edge-attached controls.** Add safe-area padding with `env(safe-area-inset-*)` when fixed or sticky UI reaches a device edge. Apply it to the relevant edge and component rather than adding it indiscriminately to every header or action.
- **Keep content clear of sticky UI.** When a persistent bottom bar overlays scrolling content, reserve matching space at the end of the scroll area, including the bottom safe-area inset where needed. For dialogs and drawers, prevent background scrolling while open and allow the panel itself to scroll when its content exceeds the available height.
- **Specify meaningful states.** Describe how loading, empty, error, disabled, and success states reflow, and ensure messages and actions remain available at narrow widths.
- **Keep content robust.** Check long labels, translated text, validation messages, and dynamic content so they wrap without overlap or clipping.

### Responsive behavior in a screen spec

For each screen, state:

1. The screen's primary user task and action.
2. The content order and layout at the narrowest supported width.
3. What changes at wider widths: columns, navigation, density, and maximum content width.
4. Which elements may move, collapse, or be hidden, and how users can still reach them.
5. Required interaction and content states, including keyboard, touch, and zoom behavior.
6. Acceptance checks at 320, 360–390, and representative medium and wide viewports, including one check with long or dynamic content and a check for horizontal overflow.

Use project design tokens and components when present. A screen spec describes its intended behavior; it should not invent a parallel set of colors, spacing values, or component styles.

## How web on a phone differs from the native app

Both experiences should support the same core task and content, but the browser and native app have different conventions. Don't copy a native screen into the web app or assume a phone-sized viewport means the user is in the app.

| Concern             | Web in a mobile browser                                                                                                                     | Native mobile app                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout              | Reflows as a responsive page; browser chrome and viewport changes affect available space.                                                   | Fits an app window and accounts for system safe areas and app-level navigation.                                                                                                                                     |
| Navigation          | Uses web links and browser history; pages should work with refresh and direct URLs where applicable.                                        | Uses the app's navigation stack, tabs, or other established native patterns.                                                                                                                                        |
| Inputs and controls | Uses accessible web controls and browser behavior; support keyboard, touch, zoom, and autofill where relevant. Use CSS-pixel target sizing. | May use platform controls and interactions suited to the mobile operating system. Follow platform sizing conventions, such as Apple's points and Android's dp; these units are not interchangeable with CSS pixels. |
| Reachability        | Users may arrive from search, a shared link, or a new browser session.                                                                      | Users launch or resume the installed app and may rely on app permissions or device integrations.                                                                                                                    |

When a native convention differs from the responsive web rule, document the native exception in the screen's native design or implementation notes. Keep the web experience functional without requiring the native app.

### Default quick-check platforms

For routine UI changes, verify web at desktop and mobile-web widths plus the iOS native app. Android remains a supported target and should continue to typecheck/export, but Android runtime review is outside the default quick-check and does not block a task unless the change is Android-specific or Android runtime validation is explicitly requested.

## UI stack and logic boundaries

- **Web styling:** Use Tailwind CSS for web styles. Use shadcn/ui as source-owned component starting points in `apps/web`; add only the components a screen needs and keep their visual behavior specific to web.
- **Native styling:** Use React Native components and platform conventions in `apps/mobile`. Use NativeWind 4 for utility styling with app-local Tailwind CSS 3. NativeWind 4.2.7 passed bundling, type checks, and layout/spacing rendering on iOS and Android with Expo 58.0.25 / React Native 0.88.1. Keep web Tailwind CSS 4 configuration separate. Use StyleSheet where platform APIs or dynamic styles need it. Follow native accessibility, safe-area, keyboard, and navigation conventions; the styling library does not define UX. See [compatibility evidence](testing/nativewind-expo58.md) and recheck after dependency upgrades.
- **Keep behavior independent of presentation:** UI components render data and handle interaction. Business rules and reusable decisions belong in plain TypeScript modules, not in Tailwind classes, NativeWind styles, or component trees. Keep UI state and platform-specific presentation in each app.
- **Share intentionally:** Keep API contracts and validation schemas in `packages/shared`. Share visual components between Next.js and Expo only when they truly support both platforms; otherwise keep separate web and native views over the same contract or business behavior.
- **Avoid premature abstraction:** Do not create a shared UI package or a general-purpose domain package until a real cross-app use case needs it. Keep tokens aligned by meaning when needed, without forcing identical markup or styling configuration across web and native.

## Review checklist

- [ ] The narrow layout is complete and usable before wider layouts are added.
- [ ] Breakpoints respond to content needs and each one has a described layout change.
- [ ] Narrow layouts use fluid sizing and do not cause document-level horizontal scrolling; horizontal tab and table scrolling is localized to those controls.
- [ ] Primary content and actions remain clear across narrow, medium, and wide widths.
- [ ] No essential action depends only on hover, precise pointer input, or a fixed device size.
- [ ] Touch targets are comfortable to activate, text remains readable and zoomable, and the screen has a clear primary action.
- [ ] Text and essential control visuals meet the documented contrast thresholds.
- [ ] Keyboard focus, zoom, text resizing, and browser navigation are considered; with the mobile keyboard open, focused fields, feedback, and relevant actions remain reachable.
- [ ] Numeric keyboard hints match the value being entered, including sign entry for fields that accept negative values.
- [ ] Full-height and edge-attached UI accounts for dynamic viewport height and applicable safe areas.
- [ ] Sticky bottom controls do not obscure scrollable content; dialogs and drawers keep background and panel scrolling well behaved.
- [ ] Long, translated, loading, empty, and error content does not overlap or disappear.
- [ ] Any native-app difference is intentional and recorded separately from web behavior.
