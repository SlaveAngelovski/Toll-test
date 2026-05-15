const log = console.log;

log("\nToll Fee System workspace commands\n");
log("General setup:");
log("  pnpm install              # install all dependencies");
log("  pnpm help                 # show this helper message\n");

log("Development:");
log("  pnpm dev                  # start backend and frontend together");
log(
  "  pnpm dev:backend          # start backend only (http://localhost:4000)"
);
log(
  "  pnpm dev:frontend         # start frontend only (http://localhost:3000)"
);
log(
  "    → ensure NEXT_PUBLIC_API_BASE_URL points to the backend when running separately\n"
);

log("Build & test:");
log("  pnpm build                # build every workspace package");
log("  pnpm build:backend        # build backend service");
log("  pnpm build:frontend       # build frontend app");
log("  pnpm test                 # run all available tests");
log("  pnpm test:backend         # run backend vitest suite");
log("  pnpm test:frontend        # placeholder (no frontend tests yet)\n");

log("Workspace packages:");
log("  toll-fee-backend   - Express API for toll calculations");
log("  toll-fee-frontend  - Next.js dashboard for passage management\n");

log("See README.md for more details.\n");
