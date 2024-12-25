import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { pollCommits } from "@/lib/github";

// user_2qhGBEZVcm7dTrOxEUihMgOmqtq
// user_2qhGBEZVcm7dTrOxEUihMgOmqtq

export const projectRouter = createTRPCRouter({
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        githubUrl: z.string(),
        githubToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // console.log(`ctx.user.userId: ${ctx.user.userId!}`); // Log the userId
      const project = await ctx.db.project.create({
        data: {
          repoUrl: input.githubUrl,
          name: input.name,
          githubToken: input.githubToken,
          userToProjects: {
            create: {
              userId: ctx.user.userId!,
            },
          },
        },
      });
      await pollCommits(project.id);
      return project;
    }),
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.user.userId!,
          },
        },
        deletedAt: null,
      },
    });
  }),
  getCommits: protectedProcedure.input(z.object({ projectId: z.string() })).query(
    async ({ ctx, input }) => {
      return await ctx.db.commit.findMany({
        where: {
          projectId: input.projectId,
        },
      });
    }
  )
});
