// Push remaining files with rate limiting
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) throw new Error('Token not found');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
}

function getAllFiles(dir: string, files: string[] = [], base = ''): string[] {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (['.git', 'node_modules', '.replit', '.cache', '.config', '.upm', 'dist', '.env', '.env.local', 'replit.nix', '.replit'].includes(item)) continue;
    if (item.startsWith('.breakpoints') || item.endsWith('.log')) continue;
    
    const fullPath = path.join(dir, item);
    const relativePath = base ? `${base}/${item}` : item;
    
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, files, relativePath);
      } else {
        files.push(relativePath);
      }
    } catch (e) {}
  }
  return files;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  const repo = 'medicare-hms';
  
  console.log(`Pushing remaining files to ${owner}/${repo}...`);
  
  // Get latest commit
  const { data: refData } = await octokit.git.getRef({
    owner, repo, ref: 'heads/main'
  });
  const latestCommitSha = refData.object.sha;
  console.log('Latest commit:', latestCommitSha);
  
  // Get existing files from repo
  const { data: tree } = await octokit.git.getTree({
    owner, repo, tree_sha: latestCommitSha, recursive: 'true'
  });
  const existingFiles = new Set(tree.tree.map(t => t.path));
  
  // Get all local files
  const allFiles = getAllFiles('.');
  const missingFiles = allFiles.filter(f => !existingFiles.has(f));
  
  console.log(`Found ${missingFiles.length} files missing from repo`);
  
  if (missingFiles.length === 0) {
    console.log('All files are already in repo!');
    return;
  }
  
  // Create blobs with rate limiting
  const treeItems: { path: string; sha: string; mode: '100644'; type: 'blob' }[] = [];
  
  for (let i = 0; i < missingFiles.length; i++) {
    const file = missingFiles[i];
    try {
      const content = fs.readFileSync(file);
      
      const { data } = await octokit.git.createBlob({
        owner, repo,
        content: content.toString('base64'),
        encoding: 'base64'
      });
      
      treeItems.push({
        path: file,
        sha: data.sha,
        mode: '100644',
        type: 'blob'
      });
      
      console.log(`[${i+1}/${missingFiles.length}] ${file}`);
      
      // Rate limit: 100ms between requests
      await sleep(100);
    } catch (err: any) {
      if (err.status === 403) {
        console.log('Rate limited, waiting 60 seconds...');
        await sleep(60000);
        i--; // Retry this file
      } else {
        console.error(`Error with ${file}: ${err.message}`);
      }
    }
  }
  
  console.log(`Created ${treeItems.length} new blobs`);
  
  if (treeItems.length === 0) {
    console.log('No new files to commit');
    return;
  }
  
  // Get base tree
  const { data: baseCommit } = await octokit.git.getCommit({
    owner, repo, commit_sha: latestCommitSha
  });
  
  // Create new tree
  const { data: newTree } = await octokit.git.createTree({
    owner, repo,
    tree: treeItems,
    base_tree: baseCommit.tree.sha
  });
  
  // Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner, repo,
    message: 'Add remaining files',
    tree: newTree.sha,
    parents: [latestCommitSha]
  });
  
  // Update ref
  await octokit.git.updateRef({
    owner, repo,
    ref: 'heads/main',
    sha: commit.sha
  });
  
  console.log(`\n✅ Pushed ${treeItems.length} more files!`);
  console.log(`https://github.com/${owner}/${repo}`);
}

main().catch(console.error);
