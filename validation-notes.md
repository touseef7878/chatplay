# Final validation notes

- Disposable authenticated account `scrollqa_20260817` registered successfully in the live preview.
- Authenticated room picker showed the expected home-first behavior with `Mobile QA Room` listed and no room auto-selected.
- Authenticated desktop-style viewport showed a fixed left room sidebar, an independent central chat surface, and a composer anchored at the bottom.
- Opening `Mobile QA Room` rendered the live room, game invitation cards, reactions, game panel, and composer without outer page movement.
- A disposable QA message was submitted successfully; the room remained within the fixed application shell and the composer stayed visible.
- Browser scroll commands reported no outer page movement and could not resolve a scrollable container at the sampled coordinates. This is consistent with the shell using bounded internal overflow, but the automation layer did not expose the internal scrolling element for direct wheel validation.
- Unit tests and production build passed after adding `shouldStickToBottom` coverage: 6 test files, 18 tests passing; Vite and server bundle completed successfully.
