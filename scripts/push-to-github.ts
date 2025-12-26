// Push all files to GitHub using Octokit API
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
    // Skip unwanted directories/files
    if (['.git', 'node_modules', '.replit', '.cache', '.config', '.upm', 'dist', '.env', '.env.local'].includes(item)) continue;
    if (item.startsWith('.breakpoints') || item.endsWith('.log')) continue;
    
    const fullPath = path.join(dir, item);
    const relativePath = base ? `${base}/${item}` : item;
    
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files, relativePath);
    } else {
      files.push(relativePath);
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
  
  console.log(`Pushing to ${owner}/${repo}...`);
  
  // Get all files
  const files = getAllFiles('.');
  console.log(`Found ${files.length} files to upload`);
  
  // Create blobs for all files
  const blobs: { path: string; sha: string; mode: string; type: string }[] = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file);
      const isText = !file.match(/\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/i);
      
      const { data } = await octokit.git.createBlob({
        owner,
        repo,
        content: isText ? content.toString('base64') : content.toString('base64'),
        encoding: 'base64'
      });
      
      blobs.push({
        path: file,
        sha: data.sha,
        mode: '100644',
        type: 'blob'
      });
      
      process.stdout.write('.');
    } catch (err: any) {
      console.error(`\nError with ${file}: ${err.message}`);
    }
  }
  
  console.log(`\nCreated ${blobs.length} blobs`);
  
  // Create tree
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: blobs as any
  });
  
  console.log('Created tree:', tree.sha);
  
  // Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'MediCare HMS - Complete Hospital Management System\n\n- 20+ admin panel features\n- Role-based dashboards (Admin, Doctor, Nurse, Receptionist, Cashier, Pharmacist, Patient)\n- Patient Portal\n- Pharmacy, Billing, Insurance, Ambulance\n- VPS deployment guide included',
    tree: tree.sha,
    parents: []
  });
  
  console.log('Created commit:', commit.sha);
  
  // Update main branch reference
  try {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: commit.sha,
      force: true
    });
  } catch {
    // Branch might not exist, create it
    await octokit.git.createRef({
      owner,
      repo,
      ref: 'refs/heads/main',
      sha: commit.sha
    });
  }
  
  console.log(`\n✅ Successfully pushed to https://github.com/${owner}/${repo}`);
}

main().catch(console.error);
