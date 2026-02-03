# Audit Report: DESIGN_PROPOSAL_v2

**Verdict: CONDITIONAL APPROVAL (With Minor Revisions)**

## 1. The "Shortest Title" Heuristic is clever but...
> "Select the item with the Shortest Title Length"

**Attack**: It works for "ONE PIECE" vs "ONE PIECE QUIZ".
But what about "Naruto"?
- "NARUTO" (Tankobon)
- "NARUTO -ナルト- 外伝" (Gaiden)
It works.
**Edge Case**: "Attack on Titan" (Shingeki no Kyojin).
- Query: "Shingeki".
- Result: "Shingeki no Kyojin" (Len 17).
- Result: "Shingeki! Kyojin Chuugakkou" (Len 22).
It works.

**Flaw**: What if the series name is LONG?
- Query: "Fullmetal".
- Target: "Fullmetal Alchemist" (Hagane no Renkinjutsushi).
- If there is a shorter spinoff "Hagane", it wins? Unlikely.

## 2. Volume Extraction is Improved
The developer didn't explicit detail the "Volume detection" in `v2` but alluded to it.
**Demand**: You **MUST** implement the regex-free volume extraction from the current `prediction-engine.ts`.
- `extractVolume("ONE PIECE 100")` -> `100`.
- Use this to strictly identify "Volume 1" candidates.
- **Priority**: `Volume 1` > `Shortest Title`.
- *Reason*: "ONE PIECE 1" is longer than "ONE PIECE" (if such an item exists which isn't a book). A "Guidebook" might be short.
- Actually, keep `Shortest Title` as a strong signal for the *Series Name*, but for the *Display*, we usually want Vol 1.

## 3. The "Levenshtein < 0.6" Risk
0.6 is still arbitrary.
**Proposal**: Use **"Token Set Ratio"** or **"Partial Ratio"**.
- Does the Query appear *contiguously* in the Title?
- If User types "Jujutsu", and Title is "Jujutsu Kaisen", Levenshtein is bad (length diff).
- `Include` check is safer + Levenshtein on the matching part.
- **Verdict**: Use `String.includes()` or `Regex` match as the primary filter. Use Levenshtein only for spelling correction.

**Final Directive**:
Implement the **SearchOrchestrator** with:
1. Rakuten Only.
2. `Cache-Control` headers.
3. Logic: `Includes` check -> `Shortest Title` boost -> `Volume 1` boost.
4. **Port the `prediction-engine`** sanitation logic (this is non-negotiable).

**STATUS: GO FOR IMPLEMENTATION.**
