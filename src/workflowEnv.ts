export function getGithubRepository(): { owner: string; repository: string } {
  const repositoryFullName = process.env.GITHUB_REPOSITORY!;
  const [owner, repository] = repositoryFullName.split('/') as [string, string];
  return { owner, repository };
}

export function getWorkflowInfo(): { workflowName: string; jobId: string } {
  return {
    workflowName: process.env.GITHUB_WORKFLOW!,
    jobId: process.env.GITHUB_JOB!,
  };
}
