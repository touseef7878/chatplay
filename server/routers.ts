import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { clearMyChatData, createLinkedSupabaseSession, deleteChatPlayUser, deleteChatRoom, leaveChatRoom, loginLocalAccount, registerLocalAccount } from "./supabase";
import { listDeveloperAuditEntries, listUsersForDeveloper } from "./db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? { ...opts.ctx.user, isDeveloper: opts.ctx.user.openId === ENV.ownerOpenId } : null),
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

  developer: router({
    listUsers: adminProcedure.query(({ ctx }) => {
      if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "Developer owner access required." });
      return listUsersForDeveloper();
    }),
    listAudit: adminProcedure.query(({ ctx }) => {
      if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "Developer owner access required." });
      return listDeveloperAuditEntries();
    }),
    deleteUser: adminProcedure.input(z.object({ openId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.openId !== ENV.ownerOpenId || input.openId === ENV.ownerOpenId || input.openId === ctx.user.openId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Developer owner access required; the owner account cannot be deleted." });
      }
      return deleteChatPlayUser(input.openId, ctx.user.openId);
    }),
  }),

  chatplay: router({
    bootstrap: protectedProcedure.mutation(async ({ ctx }) => createLinkedSupabaseSession(ctx.user)),
    clearMyData: protectedProcedure.mutation(({ ctx }) => clearMyChatData(ctx.user.openId)),
    leaveRoom: protectedProcedure.input(z.object({ roomId: z.string().uuid() })).mutation(({ ctx, input }) => leaveChatRoom(ctx.user.openId, input.roomId)),
    deleteRoom: protectedProcedure.input(z.object({ roomId: z.string().uuid() })).mutation(({ ctx, input }) => deleteChatRoom(ctx.user.openId, input.roomId)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
