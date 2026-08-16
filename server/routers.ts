import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { createLinkedSupabaseSession, loginLocalAccount, registerLocalAccount } from "./supabase";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(z.object({ username: z.string().regex(/^[a-zA-Z0-9_]{3,24}$/, "Use 3-24 letters, numbers, or underscores"), password: z.string().min(8, "Password must be at least 8 characters"), displayName: z.string().trim().min(1).max(48) })).mutation(async ({ ctx, input }) => {
      const user = await registerLocalAccount(input.username, input.password, input.displayName);
      const token = await sdk.signSession({ openId: user.openId, appId: ENV.appId, name: user.name ?? input.username });
      ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
      return { success: true, user } as const;
    }),
    login: publicProcedure.input(z.object({ username: z.string().min(3), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const user = await loginLocalAccount(input.username, input.password);
      const token = await sdk.signSession({ openId: user.openId, appId: ENV.appId, name: user.name ?? input.username });
      ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
      return { success: true, user } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chatplay: router({
    bootstrap: protectedProcedure.mutation(async ({ ctx }) => createLinkedSupabaseSession(ctx.user)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
