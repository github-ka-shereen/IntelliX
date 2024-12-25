import { db } from "src/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { aiSummariesCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// const githubUrl =
//   "https://github.com/github-ka-shereen/miracle-pest-control-client";

type Response = {
  commitMessage: string;
  commitHash: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export const getCommitHashes = async (
  githubUrl: string,
): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);

  if (!owner || !repo) {
    throw new Error("Invalid Github Url");
  }
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
  });

  const sortedCommits = data.sort(
    (a: any, b: any) =>
      new Date(b.commit.author).getTime() - new Date(a.commit.author).getTime(),
  ) as any[];

  return sortedCommits.slice(0, 10).map((commit: any) => ({
    commitMessage: commit?.commit?.message ?? "",
    commitHash: commit?.sha as string,
    commitAuthorName: commit?.commit?.author?.name ?? "",
    commitAuthorAvatar: commit?.author?.avatar_url ?? "",
    commitDate: commit.commit?.author?.date ?? "",
  }));
};

// console.log(await getCommitHashes(githubUrl));

export const pollCommits = async (projectId: string) => {
  const { project, githubUrl } = await fetchProjectGithubUrl(projectId);

  const commitHashes = await getCommitHashes(githubUrl);
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );
  const summaryResponses = await Promise.allSettled(
    unprocessedCommits.map((commit) =>
      summariesCommit(githubUrl, commit.commitHash),
    ),
  );

  const summaries = summaryResponses.map((response) => {
    if (response.status === "fulfilled") {
      return response.value;
    }
    return "";
  });

  const commits = await db.commit.createMany({
    data: summaries.map((summary, index) => {
      console.log(`Processing commit ${index}:`, {
        commitHash: unprocessedCommits[index]!.commitHash,
        summary,
      });
      return {
        projectId: projectId,
        commitHash: unprocessedCommits[index]!.commitHash,
        commitMessage: unprocessedCommits[index]!.commitMessage,
        commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
        commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
        commitDate: unprocessedCommits[index]!.commitDate,
        summary: summary,
      };
    }) as any,
  });

  console.log("commits", commits);
  return commits;
};

async function summariesCommit(githubUrl: string, commitHash: string) {
  try {
    const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
      headers: {
        Accept: "application/vnd.github.v3.diff",
      },
    });
    console.log("GitHub Diff Data:", data);
    return await aiSummariesCommit(data);
  } catch (error) {
    console.error("Error fetching GitHub diff data:", error);
    throw error;
  }
}

async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      repoUrl: true,
    },
  });
  if (!project?.repoUrl) {
    throw new Error("Project Has Not GithubUrl");
  }
  return { project, githubUrl: project?.repoUrl };
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
  });
  console.log("Processed Commits:", processedCommits);
  console.log("All Commit Hashes:", commitHashes);

  const unprocessedCommits = commitHashes.filter(
    (commit) =>
      !processedCommits.some(
        (processedCommit) => processedCommit.commitHash === commit.commitHash,
      ),
  );
  console.log("Unprocessed Commits:", unprocessedCommits);
  return unprocessedCommits;
}

// await pollCommits("cm53jg4g2000cpraf8shedqbw").then(console.log);
