// Create GitHub repository and push code
import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function main() {
  try {
    const accessToken = await getAccessToken();
    const octokit = new Octokit({ auth: accessToken });
    
    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    const repoName = 'medicare-hms';
    
    // Check if repo exists
    let repoExists = false;
    try {
      await octokit.repos.get({ owner: user.login, repo: repoName });
      repoExists = true;
      console.log(`Repository ${repoName} already exists`);
    } catch (e: any) {
      if (e.status === 404) {
        repoExists = false;
      } else {
        throw e;
      }
    }
    
    // Create repo if it doesn't exist
    if (!repoExists) {
      console.log(`Creating repository: ${repoName}...`);
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'MediCare HMS - Comprehensive Hospital Management System with 20+ features including patient portal, appointments, prescriptions, billing, pharmacy, and more.',
        private: false,
        auto_init: false
      });
      console.log(`Repository created: https://github.com/${user.login}/${repoName}`);
    }
    
    // Configure git with token
    const remoteUrl = `https://${accessToken}@github.com/${user.login}/${repoName}.git`;
    
    console.log('\nConfiguring git...');
    try {
      execSync('git remote remove origin', { stdio: 'pipe' });
    } catch (e) {
      // Remote might not exist
    }
    execSync(`git remote add origin ${remoteUrl}`, { stdio: 'pipe' });
    
    // Set git user config
    execSync(`git config user.email "${user.email || user.login + '@users.noreply.github.com'}"`, { stdio: 'pipe' });
    execSync(`git config user.name "${user.name || user.login}"`, { stdio: 'pipe' });
    
    // Stage all changes
    console.log('Staging changes...');
    execSync('git add -A', { stdio: 'pipe' });
    
    // Commit
    console.log('Creating commit...');
    try {
      execSync('git commit -m "MediCare HMS - Complete Hospital Management System\n\nFeatures:\n- 20+ web admin panel features\n- Role-based dashboards (Admin, Doctor, Nurse, Receptionist, Cashier, Pharmacist, Patient)\n- Patient Portal with appointments, prescriptions, lab reports, bills\n- Pharmacy management\n- Insurance claims\n- Ambulance services\n- Billing and payments\n- Staff attendance management\n- VPS deployment guide included"', { stdio: 'pipe' });
    } catch (e) {
      console.log('No new changes to commit or commit already exists');
    }
    
    // Push
    console.log('Pushing to GitHub...');
    execSync('git push -u origin main --force', { stdio: 'inherit' });
    
    console.log(`\n✅ Successfully pushed to: https://github.com/${user.login}/${repoName}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
