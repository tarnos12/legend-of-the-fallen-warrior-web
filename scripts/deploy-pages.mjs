// Deploy to GitHub Pages: build, then force-push dist/ as the gh-pages branch.
// (npm run deploy). Uses the classic branch flow because the local gh token
// lacks the `workflow` scope for pushing an Actions workflow; to switch to
// CI deploys later: `gh auth refresh -h github.com -s workflow`, restore
// .github/workflows/deploy.yml from commit 1562af4, and flip the Pages source
// to "GitHub Actions".
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';

const REPO = 'https://github.com/tarnos12/legend-of-the-fallen-warrior-web.git';
const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

run('npm run build');
// Cache-bust the public/ assets: Vite hashes the JS bundle, but the classic
// css/jquery/bootstrap files keep stable URLs, so browsers kept serving a
// STALE cached theme.css against a fresh bundle after a deploy (mixed-build
// bugs: unstyled filter chips, the old fixed-5 grid). Stamp ?v=<git-sha> onto
// those links so every deploy forces a refetch.
const stamp = execSync('git rev-parse --short HEAD').toString().trim();
let html = readFileSync('dist/index.html', 'utf8');
// the production build uses a RELATIVE base (./css/...), the dev page an
// absolute one (/css/...) — match both
html = html.replace(/((?:href|src)="\.?\/(?:css|jquery|vendor|js)\/[^"?]+)"/g, `$1?v=${stamp}"`);
writeFileSync('dist/index.html', html);
// Pages runs Jekyll by default, which ignores folders it doesn't like;
// .nojekyll serves dist exactly as built.
writeFileSync('dist/.nojekyll', '');
if (existsSync('dist/.git')) rmSync('dist/.git', { recursive: true, force: true });
run('git init -q -b gh-pages', { cwd: 'dist' });
run('git add -A', { cwd: 'dist' });
run('git -c user.name=deploy -c user.email=deploy@local commit -q -m "deploy"', { cwd: 'dist' });
run(`git push -f ${REPO} gh-pages`, { cwd: 'dist' });
rmSync('dist/.git', { recursive: true, force: true });
console.log('\nDeployed: https://tarnos12.github.io/legend-of-the-fallen-warrior-web/');
