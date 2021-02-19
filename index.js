console.clear();
const semver = require('semver');
const fetch = require('node-fetch');
const { spawnSync } = require('child_process');

function spawnAndThrowSync(...args) {
  const result = spawnSync(...args, { stdio: ['inherit', 'inherit', 'pipe'] });
  if (result.stderr) {
    console.error(result.stderr.toString());
    process.exit(1);
  }
}

async function testPeer(peer, range) {
  const resp = await fetch(`https://registry.npmjs.org/${peer}`);
  const json = await resp.json();
  const versions = Object.keys(json.versions);
  const maxVersion = semver.maxSatisfying(versions, range);
  const maxMajor = semver.major(maxVersion);
  const minVersion = semver.minSatisfying(versions, range);

  let version = minVersion;

  while (semver.lte(version, maxVersion)) {
    console.log(`Testing ${peer}@${version}`);

    spawnAndThrowSync('npm', ['install', `${peer}@${version}`]);
    spawnAndThrowSync('npm', ['test']);

    let nextMajor = semver.major(version);

    // They might have skipped a version number (like 'react' did)
    while (true) {
      nextMajor++;
      // No more versions left to test
      if (nextMajor > maxMajor) {
        return;
      }

      const nextVersion = semver.maxSatisfying(versions, `${nextMajor}`);

      if (nextVersion) {
        version = nextVersion;
        break;
      }
    }
  }
}

async function main() {
  const packageJson = require('./package.json');

  for (const peer in packageJson.peerDependencies) {
    const range = packageJson.peerDependencies[peer];
    await testPeer(peer, range);
  }
}

main();
