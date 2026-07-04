// Deploy to GitHub Pages: build, then force-push dist/ as the gh-pages branch.
// (npm run deploy). Uses the classic branch flow because the local gh token
// lacks the `workflow` scope for pushing an Actions workflow; to switch to
// CI deploys later: `gh auth refresh -h github.com -s workflow`, restore
// .github/workflows/deploy.yml from commit 1562af4, and flip the Pages source
// to "GitHub Actions".
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync, existsSync } from 'node:fs';

const REPO = 'https://github.com/tarnos12/legend-of-the-fallen-warrior-web.git';
const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

run('npm run build');
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
