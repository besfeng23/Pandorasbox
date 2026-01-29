# 🚀 Phase 7: Evolution & Intelligence [COMPLETED]

Now that the core Sovereign AI foundation is solid, we move towards "Active Intelligence" — where the AI proactively helps you, senses new data, and connects to your broader digital life.

## 🧠 1. Advanced Agent Orchestration (Semantic Router) [DONE]
*Instead of simple keyword matching, we use vector similarity to route your query to the perfect specialized agent.*
- [x] **Router Logic**: Implement `lib/ai/router.ts` using cosine similarity on cold-start embeddings.
- [x] **Integration**: Connect Chat API to use `routeQuery`.
- [x] **Agent Expansion**: Create more granular agents (e.g., "Reviewer", "Architect").

## 🔌 2. Native Data Connectors [DONE]
*Turn Pandora's Box into a central intelligence hub by ingesting external data.*
- [x] **GitHub Connector**: Ingest repositories to let the AI understand your codebase history.
- [x] **PDF Watcher**: Watch a local directory and auto-ingest new papers/contracts.
- [x] **YouTube Transcriber**: Paste a video URL to chat with its content.

## 🤝 3. Real-Time Team Collaboration [DONE]
*From "Sovereign Isolation" to "Trusted Federation".*
- [x] **Live Typing**: See when a collaborator is typing.
- [x] **Artifact Sync**: Push updates to code artifacts instantly for all viewers.

## 🗣️ 4. Sovereign Voice (Whisper + Piper) [DONE]
*Talk to your AI without sending audio to the cloud.*
- [x] **Endpoints**: Scaffold `/api/audio/transcribe` and `/api/audio/speak`.
- [x] **Docker Containers**: Add `whisper-server` and `piper-tts` to `docker-compose.yml`.
- [x] **Frontend UI**: Wire the microphone button to the new endpoints (with Auto-Speak).

## 👁️ 5. Local Vision (Llava) [DONE]
*Show, don't just tell.*
- [x] **Model Switch**: Allow switching the inference model to a Vision-Language Model (VLM) like `llava-v1.6`.
- [x] **Image Handling**: Ensure the embedding pipeline can handle image tokens or describe images before embedding.

---

# 🏗️ Phase 8: Ecosystem & Extensibility [PLANNED]

*Transforming Pandora's Box into a platform that others can build upon and integrate with.*

## 🧩 1. Plugin Architecture
- [ ] **Plugin SDK**: Create a standard interface for third-party tools to extend the AI's capabilities.
- [ ] **Marketplace UI**: A dashboard to discover, install, and configure community plugins.
- [ ] **Sandboxing**: Ensure third-party code runs in a secure, isolated environment.

## 🔗 2. Third-Party Integrations
- [ ] **Communication Bridges**: Connect to Slack, Discord, and Telegram for remote command & control.
- [ ] **Calendar & Tasks**: Read-write access to Google Calendar, Notion, and Jira for proactive scheduling.
- [ ] **Browser Extension**: A companion tool for contextual intelligence while browsing the web.

---

# 🤖 Phase 9: Autonomous Agency & Scheduling [PLANNED]

*Moving from "Reactive" to "Proactive". The AI works for you while you sleep.*

## 🕒 1. Tasks & Scheduling
- [ ] **Cron Jobs for AI**: Ability to schedule recurring tasks (e.g., "Summarize my inbox every morning at 8 AM").
- [ ] **Long-Running Processors**: Support for agents that can work for minutes or hours on complex research.

## 🛠️ 2. Self-Healing & Optimization
- [ ] **Memory Pruning**: Automatically clean up or consolidate stale memories to keep search efficient.
- [ ] **Model Auto-Tuning**: Periodically fine-tune local models on your own interaction history (LoRA).

---

# 🔒 Phase 10: Decentralized Governance & Privacy [PLANNED]

*The final frontier: Total control and decentralized synchronization.*

## 🌐 1. P2P Sync (Sovereign Mesh)
- [ ] **Device-to-Device Sync**: Sync your threads and memories across your laptop, server, and phone without a central database (using GunDB or OrbitDB).
- [ ] **Federated Learning**: Optionally share anonymized insights with other Pandora nodes to improve collective intelligence without revealing private data.

## 🛡️ 2. Zero-Knowledge Integration
- [ ] **Private Data Proofs**: Use ZK-proofs to verify information to third parties without sharing the raw data.
- [ ] **Encrypted Knowledge Base**: End-to-end encryption for the entire Qdrant vector store.
