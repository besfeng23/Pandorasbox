# 50-Point Sovereign AI Checklist

## Phase 1: Hygiene & Cleanup (Immediate Priority)
*Cleaning up the "messy" root folder visible in your file explorer.*

- [x] 1. **Delete Junk Assets:** Remove `cube.png`, `cube2.png`, and `cube3.png` from the root (these look like 3D assets from another project).
- [x] 2. **Remove Foreign Scripts:** Delete `DEPLOY_KAIROS...`, `DEBUG_BUILD.sh`, and `CLOUD_SHELL_D...` scripts.
- [x] 3. **Purge OpenAI Schemas:** Delete `CHATGPT_OPENAPI_SCHEMA.yaml`. You are building a Sovereign App, not a ChatGPT plugin.
- [x] 4. **Remove Claude Config:** Delete `FIREBASE_MCP_CLAUDE_CONFIG.json`.
- [x] 5. **Sanitize README:** Remove the line "Required: OPENAI_API_KEY" from `README.md`. Replace it with "Required: None (Local vLLM)".
- [x] 6. **Update `.gitignore`:** Ensure `*.pem`, `vllm-cache/`, and `.env.local` are ignored.
- [x] 7. **Fix Types:** Run `npm run typecheck` and resolve the existing TypeScript errors in `src/`.
- [x] 8. **Clean `package.json`:** Remove unused dependencies (check for `openai` SDK usage and ensure it's only used as a protocol wrapper).

## Phase 2: Sovereign Infrastructure (The Backend)
*Setting up the "Brain" (vLLM) and "Memory" (Qdrant).*

- [x] 9. **Env Setup:** Create a production `.env` with `INFERENCE_URL=http://<IP>:8000/v1` and `QDRANT_URL=http://<IP>:6333`.
- [x] 10. **Docker Network:** Ensure vLLM, Qdrant, and Next.js containers are on the same bridge network (e.g., `pandora-net`).
- [x] 11. **GPU Check Script:** Create a startup script to verify vLLM actually sees your T4/L4 GPU.
- [x] 12. **Model Lock:** Hardcode the model to `mistralai/Mistral-7B-Instruct-v0.3` in your deploy script.
- [x] 13. **Qdrant Persistence:** Ensure the Qdrant Docker volume is mounted so memories survive a container restart.
- [x] 14. **Health Check (Inference):** Implement a `/health` endpoint that pings `vLLM` to ensure it's awake.
- [x] 15. **Health Check (Memory):** Implement a check for `http://localhost:6333/collections` to ensure Qdrant is ready.
- [x] 16. **Collection Init:** Write a script that automatically creates the `memories` collection in Qdrant if it's missing.

## Phase 3: Core Logic (The "Sovereign Lane")
*Connecting the Frontend to your Local AI.*

- [x] 17. **Inference Client:** Create `src/lib/sovereign/inference.ts`. Wrap the OpenAI SDK but **force** the `baseURL` to your local instance.
- [x] 18. **Qdrant Client:** Finalize `src/lib/sovereign/qdrant-client.ts` using the official Qdrant JS client.
- [x] 19. **Embedding Logic:** Ensure text is converted to vectors using a local embedding model (or vLLM's embedding endpoint).
- [x] 20. **Streaming Action:** Implement `chatAction` in `src/app/actions.ts` to stream text responses token-by-token.
- [x] 21. **Memory Fetch:** Create a `fetchMemories()` server action to retrieve vectors for the dashboard.
- [x] 22. **Memory Save:** Create a `saveMemory(text)` action to write user data to Qdrant.
- [x] 23. **RAG Pipeline:** Modify chat logic to: *Search Qdrant* -> *Inject Memories into Prompt* -> *Send to vLLM*.
- [x] 24. **System Prompt:** Hardcode the "Sovereign System Prompt" (e.g., "You are a private, air-gapped assistant...").

## Phase 4: Frontend Wiring (The UI)
*Making the UI elements in your screenshot actually work.*

- [x] 25. **Memory Route:** Create `src/app/memory/page.tsx` to display the "Memory" dashboard.
- [x] 26. **Connect Sidebar:** In `layout.tsx`, ensure the "Memory" button links to `/memory`.
- [x] 27. **Connect Agents:** In `layout.tsx`, wire the "Agents" button to fetch data from your new `/api/agents` route.
- [x] 28. **New Thread:** Wire the "New Thread" button to clear the `messages` state and generate a new `threadId`.
- [x] 29. **Fix Loading State:** Replace the infinite "Skeleton" loader with a check: `if (!messages.length) return <WelcomeScreen />`.
- [x] 30. **Chat Input:** Connect the text input box to the `chatAction` server action.
- [x] 31. **Auto-Scroll:** Add a React hook to scroll to the bottom of the chat window when new tokens arrive.
- [x] 32. **Markdown Support:** Install and configure `react-markdown` to render bold text and lists nicely.
- [x] 33. **Mobile Menu:** Fix the sidebar toggle behavior for mobile screens.

## Phase 5: Advanced Features (The "Wow" Factor)

- [x] 34. **Memory Dashboard:** Build a table view to list, edit, and delete stored memories.
- [x] 35. **Search Bar:** Add a search input to the Memory Dashboard to filter by text content.
- [x] 36. **Artifact UI:** Create a split-view component to render code blocks separately (like Claude Artifacts).
- [x] 37. **Tool Indicators:** Add a "Thinking..." UI component that appears when the AI is searching Qdrant.
- [x] 38. **Status Bar:** Add a footer to the sidebar showing "vLLM: Online 🟢" / "Qdrant: Online 🟢".
- [x] 39. **Stop Button:** Add a button to abort the generation stream if the model gets stuck.
- [x] 40. **Agent Toggle:** Wire the "Builder / Universe" toggle to switch between different system prompts.

## Phase 6: Production Polish

- [x] 41. **Error Boundaries:** Wrap the Chat component in an Error Boundary so one crash doesn't kill the app.
- [x] 42. **Offline Handling:** Show a friendly "AI is Asleep" toast notification if vLLM is unreachable.
- [x] 43. **Input Validation:** Use Zod to validate all user inputs (prevent empty messages).
- [x] 44. **Metadata:** Update `src/app/layout.tsx` metadata (Title: "Pandora's Box").
- [x] 45. **Favicon:** Replace the default Next.js icon with a custom "Box" icon.
- [x] 46. **Logs Cleanup:** Remove `console.log` statements used for debugging raw vectors.
- [x] 47. **Security Headers:** Configure `next.config.ts` with proper CORS and security headers.
- [x] 48. **Firebase Rules:** If using Firestore for threads, ensure rules are secure (e.g., `allow read, write: if request.auth.uid == resource.data.userId`).
- [x] 49. **Documentation:** Create an `ARCHITECTURE.md` file explaining the data flow.
- [x] 50. **Final Build:** Run `npm run build` locally and ensure it passes without errors before deploying.
