# Deployment Guide: Git & Hugging Face

This guide provides the necessary commands to completely reset your Git history and deploy your application to a Hugging Face Space.

## 1. Reset Git Repository
If you need to start fresh, remove the existing `.git` directory and initialize a new repository.

Run these commands in your project root (`c:\Users\astit\Desktop\turtle\thermal`):

```powershell
# Remove the existing git repository
rm -r -force .git

# Initialize a new repository
git init

# Add all files and make the initial commit
git add .
git commit -m "Initial commit for Noesis RAG"
```

## 2. Deploy to Hugging Face Spaces
Hugging Face Spaces uses Git for deployment. 

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and create a new Space.
2. Choose your environment (e.g., **Docker** if deploying both frontend and backend together).
3. Copy your Space's Git URL.

Run the following commands to link and push your code:

```powershell
# Add your Hugging Face Space as the remote repository
# Replace <username> and <space_name> with your actual details
git remote add origin https://huggingface.co/spaces/<username>/<space_name>

# Push your code to Hugging Face (forcing the push since it's a fresh history)
git push --force origin main
```

## Troubleshooting
- **Large Files**: If you have large files (like models or large datasets), make sure you are using `git-lfs` before pushing.
- **Authentication**: When pushing to Hugging Face, you will be prompted for credentials. Use your Hugging Face username and a **Write Access Token** (created in your HF Account Settings -> Access Tokens) as your password.
