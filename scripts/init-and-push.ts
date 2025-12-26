// Initialize empty repo and push all files
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
    } catch (e) {
      // Skip inaccessible files
    }
  }
  return files;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  const repo = 'medicare-hms';
  
  console.log(`Initializing ${owner}/${repo}...`);
  
  // Step 1: Create initial commit with README to initialize repo
  const readmeContent = fs.readFileSync('README.md', 'utf8').toString();
  
  try {
    // Create README file directly (this initializes the repo)
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Initial commit - MediCare HMS',
      content: Buffer.from(readmeContent).toString('base64'),
      branch: 'main'
    });
    console.log('Repository initialized with README.md');
  } catch (err: any) {
    if (err.status === 422) {
      console.log('README already exists, continuing...');
    } else {
      throw err;
    }
  }
  
  // Step 2: Get the latest commit SHA
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: 'heads/main'
  });
  const latestCommitSha = refData.object.sha;
  console.log('Latest commit:', latestCommitSha);
  
  // Step 3: Get all files
  const files = getAllFiles('.');
  console.log(`Found ${files.length} files to upload`);
  
  // Step 4: Create blobs for all files
  const treeItems: { path: string; sha: string; mode: '100644'; type: 'blob' }[] = [];
  
  let count = 0;
  for (const file of files) {
    try {
      const content = fs.readFileSync(file);
      
      const { data } = await octokit.git.createBlob({
        owner,
        repo,
        content: content.toString('base64'),
        encoding: 'base64'
      });
      
      treeItems.push({
        path: file,
        sha: data.sha,
        mode: '100644',
        type: 'blob'
      });
      
      count++;
      if (count % 20 === 0) {
        console.log(`Uploaded ${count}/${files.length} files...`);
      }
    } catch (err: any) {
      console.error(`Error with ${file}: ${err.message}`);
    }
  }
  
  console.log(`Created ${treeItems.length} blobs`);
  
  // Step 5: Create tree with base tree
  const { data: baseCommit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha
  });
  
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: treeItems,
    base_tree: baseCommit.tree.sha
  });
  
  console.log('Created tree:', tree.sha);
  
  // Step 6: Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'MediCare HMS - Complete Hospital Management System\n\n- 20+ admin panel features\n- Role-based dashboards\n- Patient Portal\n- VPS deployment guide',
    tree: tree.sha,
    parents: [latestCommitSha]
  });
  
  console.log('Created commit:', commit.sha);
  
  // Step 7: Update main branch
  await octokit.git.updateRef({
    owner,
    repo,
    ref: 'heads/main',
    sha: commit.sha
  });
  
  console.log(`\n✅ Successfully pushed to https://github.com/${owner}/${repo}`);
}

main().catch(console.error);
